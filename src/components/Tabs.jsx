import React, { useState, useRef } from 'react';
import { solveComplexRelation } from '../utils/kinship.js';
import { validateTreeData } from '../data/schema.js';
import { useSmartAutoAnimate } from '../utils/useSmartAutoAnimate.js';

export function RelationshipFinder({ familyIndex, lang, t, displayName, people, startPerson }) {
  const [firstId, setFirstId] = useState(startPerson || "");
  const [secondId, setSecondId] = useState("");
  const finderAnimRef = useSmartAutoAnimate();
  const isHi = lang === "hi";

  const isValid =
    firstId &&
    secondId &&
    firstId !== secondId &&
    familyIndex.byId[firstId] &&
    familyIndex.byId[secondId];

  const relAB = isValid ? solveComplexRelation(familyIndex, firstId, secondId, lang) : null;
  const relBA = isValid ? solveComplexRelation(familyIndex, secondId, firstId, lang) : null;

  const handleSwap = () => {
    setFirstId(secondId);
    setSecondId(firstId);
  };

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.03em",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    color: "var(--muted)"
  };

  const renderRelationLine = (fromName, toName, rel) => (
    <li>
      {t("relIs", fromName, toName, rel.shortLabel)}
      {rel.description && rel.description !== rel.shortLabel && (
        <span className="muted"> ({rel.description})</span>
      )}
    </li>
  );

  return (
    <div className="finder reveal-parent" ref={finderAnimRef}>
      <p className="muted hover-explanation">{t("relHelpSub")}</p>
      <div className="finder-grid">
        <div className="field">
          <label htmlFor="fa">{t("first")}</label>
          <select id="fa" value={firstId} onChange={e => setFirstId(e.target.value)}>
            <option value="">{t("none")}</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {displayName(p.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fb">{t("second")}</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select id="fb" value={secondId} onChange={e => setSecondId(e.target.value)}>
              <option value="">{t("none")}</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>
                  {displayName(p.id)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn ghost"
              onClick={handleSwap}
              aria-label={isHi ? "दोनों सदस्य बदलें" : "Swap people"}
              title={isHi ? "दोनों सदस्य बदलें" : "Swap people"}
              style={{ height: "40px", padding: "0 12px", fontSize: "16px", flexShrink: 0 }}
            >
              ⇄
            </button>
          </div>
        </div>
      </div>

      {firstId && secondId && firstId === secondId && (
        <p className="msg" role="status">{t("samePerson")}</p>
      )}

      {isValid && relAB && relBA && (
        <div className="res" style={{ gap: "10px" }}>
          {/* Badges row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
            {relAB.lineageSide === null ? (
              <span style={badgeStyle}>{isHi ? "कोई जुड़ाव नहीं" : "Not Connected"}</span>
            ) : relAB.isBlood ? (
              <span
                style={{
                  ...badgeStyle,
                  background: "color-mix(in srgb, var(--accent) 12%, var(--surface))",
                  borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
                  color: "var(--rel)"
                }}
              >
                ● {isHi ? "रक्त संबंध" : "Blood Relation"}
              </span>
            ) : (
              <span style={{ ...badgeStyle, borderColor: "var(--ink)", color: "var(--ink)" }}>
                ◆ {isHi ? "विवाह द्वारा" : "By Marriage"}
              </span>
            )}

            {relAB.lineageSide === "paternal" && (
              <span style={badgeStyle}>{isHi ? "पैतृक पक्ष" : "Paternal Side"}</span>
            )}
            {relAB.lineageSide === "maternal" && (
              <span style={badgeStyle}>{isHi ? "मातृ पक्ष" : "Maternal Side"}</span>
            )}
            {relAB.lineageSide === "direct" && (
              <span style={badgeStyle}>{isHi ? "सीधी वंशावली" : "Direct Lineage"}</span>
            )}
            {relAB.commonAncestorId && (
              <span style={{ ...badgeStyle, color: "var(--ink)" }}>
                {t("commonAnc")}: <strong>{displayName(relAB.commonAncestorId)}</strong>
              </span>
            )}
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            {renderRelationLine(displayName(secondId), displayName(firstId), relAB)}
            {renderRelationLine(displayName(firstId), displayName(secondId), relBA)}
          </ul>

          {relAB.pathSteps && relAB.pathSteps.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", paddingTop: "6px", borderTop: "1px dashed var(--line)" }}>
              <span className="chip" style={{ fontWeight: 700, borderColor: "var(--ink)" }}>
                {displayName(firstId)}
              </span>
              {relAB.pathSteps.map((step, idx) => (
                <React.Fragment key={`${step.fromId}-${step.toId}-${idx}`}>
                  <span className="muted" style={{ fontSize: "11.5px" }}>
                    → {step.relation} →
                  </span>
                  <span
                    className="chip"
                    style={idx === relAB.pathSteps.length - 1 ? { fontWeight: 700, borderColor: "var(--accent)", color: "var(--rel)" } : undefined}
                  >
                    {displayName(step.toId)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BirthdaysList({ data, lang, t, displayName, openPerson }) {
  const bdayAnimRef = useSmartAutoAnimate();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcoming = data.people
    .filter(p => p.dob && !p.late)
    .map(p => {
      const [year, month, day] = p.dob.split("-").map(Number);
      let nextBday = new Date(today.getFullYear(), month - 1, day);
      if (nextBday < today) {
        nextBday = new Date(today.getFullYear() + 1, month - 1, day);
      }
      const days = Math.round((nextBday - today) / 864e5);
      return { p, next: nextBday, days, turns: nextBday.getFullYear() - year };
    })
    .filter(item => !isNaN(item.days))
    .sort((a, b) => a.days - b.days);

  if (!upcoming.length) {
    return <p className="muted">{t("noBday")}</p>;
  }

  return (
    <div className="reveal-parent">
      <p className="muted hover-explanation" style={{ marginBottom: 10 }}>{t("bdayHelpSub")}</p>
      <ul className="blist" ref={bdayAnimRef}>
        {upcoming.map(item => (
          <li key={item.p.id}>
            <button
              type="button"
              className="chip"
              onClick={() => openPerson(item.p.id)}
            >
              {displayName(item.p.id)}
            </button>
            <span>
              {item.next.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                day: "numeric",
                month: "long"
              })}
            </span>
            <span className="muted">
              {item.days === 0
                ? t("today")
                : item.days === 1
                ? t("tomorrow")
                : t("inDays", item.days)}
              {item.turns > 0 ? " · " + t("turns", item.turns) : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BackupPanel({ treeState, t, lang, onImport, onReset, canEdit = true }) {
  const [includePhotos, setIncludePhotos] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [importText, setImportText] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const exportBoxRef = useRef(null);
  const backupAnimRef = useSmartAutoAnimate();
  const isHi = lang === "hi";

  const exportPayload = JSON.stringify({
    v: 2,
    data: treeState.data,
    ...(includePhotos ? { photos: treeState.photos } : {})
  });

  const handleDownloadJson = () => {
    try {
      const blob = new Blob([exportPayload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `family-tree-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatusMsg(isHi ? "JSON बैकअप डाउनलोड हो गया।" : "Backup JSON file downloaded.");
    } catch {
      setStatusMsg(t("copyFail"));
    }
  };

  return (
    <div className="backup reveal-parent" ref={backupAnimRef}>
      <p className="muted hover-explanation">{t("backupHelpSub")}</p>
      <div className="backup-grid">
        {/* Export Card */}
        <div className="backup-section">
          <div className="field">
            <label htmlFor="bx">{t("exportLbl")}</label>
            <textarea
              id="bx"
              ref={exportBoxRef}
              readOnly
              rows={4}
              value={exportPayload}
              onFocus={e => e.currentTarget.select()}
            />
          </div>

          <div className="backup-actions-row">
            <button
              type="button"
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportPayload);
                  setStatusMsg(t("copied"));
                } catch {
                  exportBoxRef.current?.select();
                  setStatusMsg(t("copyFail"));
                }
              }}
            >
              {t("copy")}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={handleDownloadJson}
            >
              {isHi ? "JSON डाउनलोड करें" : "Download .json"}
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={e => setIncludePhotos(e.target.checked)}
              />{" "}
              {t("incl")}
            </label>
          </div>
        </div>

        {/* Import & Restore Card */}
        {canEdit && (
          <div className="backup-section">
            <div className="field">
              <label htmlFor="bi">{t("importLbl")}</label>
              <textarea
                id="bi"
                rows={4}
                value={importText}
                placeholder={t("importPh")}
                onChange={e => setImportText(e.target.value)}
              />
            </div>

            <div className="backup-actions-row">
              <button
                type="button"
                className="btn"
                disabled={!importText.trim()}
                onClick={() => {
                  try {
                    const parsed = JSON.parse(importText);
                    const d = parsed.data;
                    const res = validateTreeData(d);
                    if (!res.valid) {
                      throw new Error(res.error);
                    }
                    onImport(
                      { people: d.people, couples: d.couples },
                      parsed.photos && typeof parsed.photos === "object" ? parsed.photos : undefined
                    );
                    setStatusMsg(t("importOk"));
                    setImportText("");
                  } catch {
                    setStatusMsg(t("importBad"));
                  }
                }}
              >
                {t("importBtn")}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  if (confirmReset) {
                    onReset();
                    setConfirmReset(false);
                    setStatusMsg("");
                  } else {
                    setConfirmReset(true);
                  }
                }}
                onBlur={() => setConfirmReset(false)}
              >
                {confirmReset ? t("resetSure") : t("reset")}
              </button>
            </div>
          </div>
        )}
      </div>

      {statusMsg && (
        <p className="msg" role="status" aria-live="polite">
          {statusMsg}
        </p>
      )}
    </div>
  );
}

export function Tabs({
  activeTab,
  setActiveTab,
  treeState,
  familyIndex,
  lang,
  t,
  displayName,
  openPerson,
  onImport,
  onReset,
  canEdit = true
}) {
  const panelAnimRef = useSmartAutoAnimate();
  const tabKeys = [
    { id: "rel", labelKey: "tabRel" },
    { id: "bday", labelKey: "tabBday" },
    { id: "backup", labelKey: "tabBackup" }
  ];

  const handleTabKeyDown = (e, idx) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabKeys[(idx + 1) % tabKeys.length].id;
      setActiveTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tabKeys[(idx - 1 + tabKeys.length) % tabKeys.length].id;
      setActiveTab(prev);
      document.getElementById(`tab-${prev}`)?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(tabKeys[0].id);
      document.getElementById(`tab-${tabKeys[0].id}`)?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = tabKeys[tabKeys.length - 1].id;
      setActiveTab(last);
      document.getElementById(`tab-${last}`)?.focus();
    }
  };

  return (
    <section className="tools" aria-label={t("toolsAria")}>
      <div className="tabs" role="tablist">
        {tabKeys.map(({ id, labelKey }, idx) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`tab-${id}`}
            aria-controls={`panel-${id}`}
            className="tab"
            aria-selected={activeTab === id}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onKeyDown={e => handleTabKeyDown(e, idx)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div
        ref={panelAnimRef}
        className="panel"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "rel" && (
          <RelationshipFinder
            familyIndex={familyIndex}
            lang={lang}
            t={t}
            displayName={displayName}
            people={treeState.data.people}
            startPerson={treeState.viewer}
          />
        )}
        {activeTab === "bday" && (
          <BirthdaysList
            data={treeState.data}
            lang={lang}
            t={t}
            displayName={displayName}
            openPerson={openPerson}
          />
        )}
        {activeTab === "backup" && (
          <BackupPanel
            treeState={treeState}
            t={t}
            lang={lang}
            onImport={onImport}
            onReset={onReset}
            canEdit={canEdit}
          />
        )}
      </div>
    </section>
  );
}

export default Tabs;
