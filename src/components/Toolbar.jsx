import React, { useRef } from 'react';

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
  onOpenHelpModal,
  showGuideBanner,
  setShowGuideBanner
}) {
  const searchInputRef = useRef(null);

  return (
    <>
      {/* Control Bar */}
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
              ref={searchInputRef}
              id="search-input"
              type="search"
              placeholder={t("searchPh")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <kbd className="kbd-hint">/</kbd>
          </div>
        </div>

        {/* Add Member Button */}
        <button
          type="button"
          className="btn"
          style={{ height: "38px" }}
          onClick={onOpenAddModal}
        >
          + {t("addMember")}
        </button>
      </div>

      {/* Quick Guide Banner */}
      {showGuideBanner && (
        <div className="quick-guide">
          <div className="guide-text">
            <span className="guide-icon">ⓘ</span>
            <span>
              {lang === "hi"
                ? "माउस खींचकर या दो उंगलियों से वृक्ष को खिसकाएं। किसी भी कार्ड से दिशात्मक शाखा देखने के लिए उस पर क्लिक करें।"
                : "Click and drag or pinch to explore the canvas. Click any card and select 'View Directional Tree' for its dedicated flowchart."}
            </span>
          </div>
          <div className="guide-actions">
            <button
              type="button"
              className="guide-btn"
              onClick={onOpenHelpModal}
            >
              {lang === "hi" ? "कीबोर्ड शॉर्टकट" : "Shortcuts"}
            </button>
            <button
              type="button"
              className="guide-close"
              aria-label={t("close")}
              onClick={() => setShowGuideBanner(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Toolbar;
