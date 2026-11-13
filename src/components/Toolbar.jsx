import React from 'react';
import { calculateKinship } from '../utils/kinship.js';

export function Toolbar({
  viewer = "",
  setViewer,
  searchQuery = "",
  setSearchQuery,
  people = [],
  displayName,
  t,
  lang,
  onOpenAddModal,
  onOpenRelationSolver,
  canEdit = true,
  familyIndex,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  searchMatchCount = 0,
  activeSearchIndex = 0,
  onStepSearchMatch,
  onOpenMilestones,
  onExportPng,
  onPrintPoster,
}) {
  const tr = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const res = t(key);
    return !res || res === key ? fallback : res;
  };
  const showSearchMatches = Boolean(searchQuery) && searchMatchCount > 0;
  const clampedMatchIndex = showSearchMatches
    ? Math.min(Math.max(0, activeSearchIndex), searchMatchCount - 1)
    : 0;
  const hasActions = Boolean(
    onOpenRelationSolver || canEdit || onOpenMilestones || onExportPng || onPrintPoster
  );
  return (
    <div className="bar" role="region" aria-label={t("controlsAria")}>
      {/* Perspective dropdown & Reset Button */}
      <div className="field">
        <label htmlFor="viewer-select">{t("viewerLabel")}</label>
        <div className="viewer-wrap">
          <select
            id="viewer-select"
            value={viewer}
            onChange={e => setViewer(e.target.value)}
          >
            <option value="">{t("none")}</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {displayName(p.id)}
              </option>
            ))}
          </select>
          {viewer && (
            <button
              type="button"
              className="reset-btn"
              title={lang === "hi" ? "मूल वंश वृक्ष पर लौटें" : "Reset to full family tree"}
              onClick={() => setViewer("")}
            >
              ✕ {lang === "hi" ? "मूल वृक्ष" : "Full Tree"}
            </button>
          )}
        </div>
      </div>

      {/* Quick Search */}
      <div className="field grow">
        <label htmlFor="search-input">{t("searchLabel")}</label>
        <div className="search-controls" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
          <div className="search-wrap" style={{ flex: '1 1 auto' }}>
            <input
              id="search-input"
              type="search"
              placeholder={t("searchPh")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && onStepSearchMatch && searchMatchCount > 0) {
                  e.preventDefault();
                  onStepSearchMatch(e.shiftKey ? -1 : 1);
                }
              }}
            />
            <kbd className="kbd-hint">/</kbd>
          </div>
          {showSearchMatches && (
            <div
              className="search-match-nav"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
            >
              <span className="search-match-count" style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {`${clampedMatchIndex + 1}/${searchMatchCount}`}
              </span>
              <button
                type="button"
                className="btn ghost toolbar-search-prev-btn"
                style={{ height: '32px', padding: '0 8px', minWidth: 'auto' }}
                title={lang === 'hi' ? 'पिछला परिणाम' : 'Previous match'}
                aria-label={lang === 'hi' ? 'पिछला परिणाम' : 'Previous match'}
                disabled={!onStepSearchMatch}
                onClick={() => onStepSearchMatch?.(-1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn ghost toolbar-search-next-btn"
                style={{ height: '32px', padding: '0 8px', minWidth: 'auto' }}
                title={lang === 'hi' ? 'अगला परिणाम' : 'Next match'}
                aria-label={lang === 'hi' ? 'अगला परिणाम' : 'Next match'}
                disabled={!onStepSearchMatch}
                onClick={() => onStepSearchMatch?.(1)}
              >
                ↓
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {hasActions && (
        <div className="bar-actions">
          {/* Undo / Redo Buttons (when editing is enabled) */}
          {canEdit && (
            <>
              <button
                type="button"
                className="btn ghost toolbar-undo-btn"
                style={{ padding: '0 10px', minWidth: 'auto' }}
                disabled={!canUndo}
                onClick={() => onUndo?.()}
                title={tr('undoBtn', lang === 'hi' ? 'पूर्ववत करें' : 'Undo')}
                aria-label={tr('undoBtn', lang === 'hi' ? 'पूर्ववत करें' : 'Undo')}
              >
                ↶
              </button>
              <button
                type="button"
                className="btn ghost toolbar-redo-btn"
                style={{ padding: '0 10px', minWidth: 'auto' }}
                disabled={!canRedo}
                onClick={() => onRedo?.()}
                title={tr('redoBtn', lang === 'hi' ? 'फिर से करें' : 'Redo')}
                aria-label={tr('redoBtn', lang === 'hi' ? 'फिर से करें' : 'Redo')}
              >
                ↷
              </button>
            </>
          )}

          {/* Milestones Button */}
          {onOpenMilestones && (
            <button
              type="button"
              className="btn ghost toolbar-milestones-btn"
              onClick={onOpenMilestones}
              title={tr('milestonesBtn', lang === 'hi' ? 'मील के पत्थर' : 'Milestones')}
            >
              🎂 {tr('milestonesBtn', lang === 'hi' ? 'मील के पत्थर' : 'Milestones')}
            </button>
          )}

          {/* Export PNG Button */}
          {onExportPng && (
            <button
              type="button"
              className="btn ghost toolbar-png-btn"
              onClick={onExportPng}
              title={tr('exportPngBtn', lang === 'hi' ? 'PNG निर्यात' : 'Export PNG')}
            >
              PNG
            </button>
          )}

          {/* Print / PDF Poster Button */}
          {onPrintPoster && (
            <button
              type="button"
              className="btn ghost toolbar-print-btn"
              onClick={onPrintPoster}
              title={tr('printPosterBtn', lang === 'hi' ? 'PDF/प्रिंट' : 'PDF/Print')}
            >
              {tr('printPosterBtn', lang === 'hi' ? 'PDF/प्रिंट' : 'PDF/Print')}
            </button>
          )}

          {/* Find Relation Solver Button */}
          {onOpenRelationSolver && (
            <button
              type="button"
              className="btn ghost toolbar-relation-btn"
              onClick={onOpenRelationSolver}
            >
              🔗 {tr('findRelationBtn', lang === 'hi' ? 'रिश्ता खोजें' : 'Find Relation')}
            </button>
          )}

          {/* Add Member Button (only shown when user can edit this tree) */}
          {canEdit && (
            <button
              type="button"
              className="btn toolbar-add-btn"
              onClick={onOpenAddModal}
            >
              + {t("addMember")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Toolbar;
