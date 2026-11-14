import React, { useState, useEffect, useRef } from 'react';

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
  onOpenShareModal,
  onOpenTreesModal,
}) {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef(null);

  useEffect(() => {
    if (!isToolsOpen) return;
    const handleOutside = e => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setIsToolsOpen(false);
      }
    };
    const handleKey = e => {
      if (e.key === 'Escape') setIsToolsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isToolsOpen]);

  const tr = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const res = t(key);
    return !res || res === key ? fallback : res;
  };

  const showSearchMatches = Boolean(searchQuery) && searchMatchCount > 0;
  const clampedMatchIndex = showSearchMatches
    ? Math.min(Math.max(0, activeSearchIndex), searchMatchCount - 1)
    : 0;
  const hasSecondaryActions = Boolean(
    onOpenRelationSolver || canEdit || onOpenMilestones || onExportPng || onPrintPoster
  );

  const moreLabel = lang === 'hi' ? 'टूल और फ़िल्टर' : 'Tools & filters';

  return (
    <div className="bar bar-compact" role="region" aria-label={t("controlsAria")} ref={toolsRef}>
      {/* Primary Single-Row Controls: Search + Add Member + Tools Drawer Toggle */}
      <div className="bar-primary-row">
        {/* Perspective dropdown (inline on desktop, inside drawer on mobile) */}
        <div className="field bar-perspective-desktop">
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
                aria-label={lang === "hi" ? "मूल वंश वृक्ष पर लौटें" : "Reset to full family tree"}
                onClick={() => setViewer("")}
              >
                ✕ {lang === "hi" ? "मूल वृक्ष" : "Full Tree"}
              </button>
            )}
          </div>
        </div>

        {/* Quick Search */}
        <div className="field grow bar-search-field">
          <label htmlFor="search-input" className="bar-search-label">{t("searchLabel")}</label>
          <div className="search-controls">
            <div className="search-wrap">
              <input
                id="search-input"
                type="search"
                aria-label={t("searchLabel")}
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
              <kbd className="kbd-hint" aria-hidden="true">/</kbd>
            </div>
            {showSearchMatches && (
              <div className="search-match-nav">
                <span className="search-match-count" aria-live="polite">
                  {`${clampedMatchIndex + 1}/${searchMatchCount}`}
                </span>
                <button
                  type="button"
                  className="btn ghost toolbar-search-prev-btn"
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

        {/* Primary Quick Actions: + Add Member + Tools Toggle */}
        <div className="bar-quick-actions">
          {canEdit && (
            <button
              type="button"
              className="btn toolbar-add-btn"
              onClick={onOpenAddModal}
              aria-label={t("addMember")}
            >
              + <span className="btn-label-full">{t("addMember")}</span>
              <span className="btn-label-short">{lang === 'hi' ? 'जोड़ें' : 'Add'}</span>
            </button>
          )}

          {onOpenShareModal && (
            <button
              id="toolbar-share-btn"
              type="button"
              className="zbtn toolbar-action-btn toolbar-share-btn"
              onClick={onOpenShareModal}
              title={tr('shareModalTitle', lang === 'hi' ? 'परिवार साझाकरण और पहुँच' : 'Share & Family Access')}
            >
              <span className="btn-label-full">
                {tr('shareTreeBtn', lang === 'hi' ? 'साझा करें व कोड' : 'Share & Code')}
              </span>
              <span className="btn-label-short">{lang === 'hi' ? 'साझा' : 'Share'}</span>
            </button>
          )}

          {onOpenTreesModal && (
            <button
              id="toolbar-trees-btn"
              type="button"
              className="zbtn toolbar-action-btn toolbar-trees-btn"
              onClick={onOpenTreesModal}
              title={tr('createTitle', lang === 'hi' ? 'मेरा वंश वृक्ष बनाएँ या चुनें' : 'Create or Select a Family Tree')}
            >
              <span className="btn-label-full">
                {tr('manageTreesBtn', lang === 'hi' ? 'वृक्ष प्रबंधन' : 'Manage Trees')}
              </span>
              <span className="btn-label-short">{lang === 'hi' ? 'वृक्ष' : 'Trees'}</span>
            </button>
          )}

          {hasSecondaryActions && (
            <button
              type="button"
              className={`btn ghost toolbar-more-btn${isToolsOpen ? ' is-open' : ''}${viewer ? ' has-active-filter' : ''}`}
              aria-expanded={isToolsOpen}
              aria-controls="toolbar-more-drawer"
              aria-label={moreLabel}
              title={moreLabel}
              onClick={() => setIsToolsOpen(prev => !prev)}
            >
              <span aria-hidden="true">⚙</span>
              <span className="toolbar-more-text">{lang === 'hi' ? 'टूल' : 'Tools'}</span>
              {viewer && <span className="toolbar-filter-dot" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Secondary Tools Drawer (keeps tree visible by default!) */}
      {hasSecondaryActions && (
        <div
          id="toolbar-more-drawer"
          className={`toolbar-more-drawer${isToolsOpen ? ' is-open' : ''}`}
          role="region"
          aria-label={moreLabel}
        >
          {/* Mobile Perspective Selector */}
          <div className="field bar-perspective-mobile">
            <label htmlFor="viewer-select-mobile">{t("viewerLabel")}</label>
            <div className="viewer-wrap">
              <select
                id="viewer-select-mobile"
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

          <div className="bar-actions">
            {canEdit && (
              <div className="toolbar-undo-group" role="group" aria-label={lang === 'hi' ? 'इतिहास' : 'History'}>
                <button
                  type="button"
                  className="btn ghost toolbar-undo-btn"
                  disabled={!canUndo}
                  onClick={() => onUndo?.()}
                  title={tr('undoBtn', lang === 'hi' ? 'पूर्ववत करें' : 'Undo')}
                  aria-label={tr('undoBtn', lang === 'hi' ? 'पूर्ववत करें' : 'Undo')}
                >
                  ↶ {lang === 'hi' ? 'पूर्ववत' : 'Undo'}
                </button>
                <button
                  type="button"
                  className="btn ghost toolbar-redo-btn"
                  disabled={!canRedo}
                  onClick={() => onRedo?.()}
                  title={tr('redoBtn', lang === 'hi' ? 'फिर से करें' : 'Redo')}
                  aria-label={tr('redoBtn', lang === 'hi' ? 'फिर से करें' : 'Redo')}
                >
                  ↷ {lang === 'hi' ? 'पुनः' : 'Redo'}
                </button>
              </div>
            )}

            {onOpenRelationSolver && (
              <button
                type="button"
                className="btn ghost toolbar-relation-btn"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenRelationSolver();
                }}
              >
                {tr('findRelationBtn', lang === 'hi' ? 'रिश्ता खोजें' : 'Find Relation')}
              </button>
            )}

            {onOpenMilestones && (
              <button
                type="button"
                className="btn ghost toolbar-milestones-btn"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenMilestones();
                }}
                title={tr('milestonesBtn', lang === 'hi' ? 'मील के पत्थर' : 'Milestones')}
              >
                {tr('milestonesBtn', lang === 'hi' ? 'मील के पत्थर' : 'Milestones')}
              </button>
            )}

            {onExportPng && (
              <button
                type="button"
                className="btn ghost toolbar-png-btn"
                onClick={() => {
                  setIsToolsOpen(false);
                  onExportPng();
                }}
                title={tr('exportPngBtn', lang === 'hi' ? 'PNG निर्यात' : 'Export PNG')}
                aria-label={tr('exportPngBtn', lang === 'hi' ? 'PNG निर्यात' : 'Export PNG')}
              >
                PNG
              </button>
            )}

            {onPrintPoster && (
              <button
                type="button"
                className="btn ghost toolbar-print-btn"
                onClick={() => {
                  setIsToolsOpen(false);
                  onPrintPoster();
                }}
                title={tr('printPosterBtn', lang === 'hi' ? 'PDF/प्रिंट' : 'PDF/Print')}
                aria-label={tr('printPosterBtn', lang === 'hi' ? 'PDF/प्रिंट' : 'PDF/Print')}
              >
                {tr('printPosterBtn', lang === 'hi' ? 'PDF/प्रिंट' : 'PDF/Print')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Toolbar;
