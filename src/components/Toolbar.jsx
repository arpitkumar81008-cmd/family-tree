import React from 'react';
import { calculateKinship } from '../utils/kinship.js';

export function Toolbar({
  viewer,
  setViewer,
  searchQuery,
  setSearchQuery,
  people,
  displayName,
  t,
  lang,
  onOpenAddModal,
  onOpenRelationSolver,
  canEdit = true,
  familyIndex
}) {
  const tr = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const res = t(key);
    return !res || res === key ? fallback : res;
  };
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
        <div className="search-wrap">
          <input
            id="search-input"
            type="search"
            placeholder={t("searchPh")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <kbd className="kbd-hint">/</kbd>
        </div>
      </div>

      {/* Action Buttons */}
      {(onOpenRelationSolver || canEdit) && (
        <div className="bar-actions">
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
