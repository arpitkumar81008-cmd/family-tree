import React, { useState, useRef } from 'react';
import { solveComplexRelation } from '../utils/kinship.js';
import { validateTreeData, sanitizePhotosMap } from '../data/schema.js';
import { isPhotosPayloadWithinLimit } from '../services/treeSync.js';
import { parseMilestoneDate } from '../utils/milestones.js';
import { useSmartAutoAnimate } from '../utils/useSmartAutoAnimate.js';

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function makeBirthdayOccurrence(year, month, day) {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return new Date(year, 1, 28);
  }
  return new Date(year, month - 1, day);
}

export function RelationshipFinder({
  familyIndex,
  lang = "en",
  t,
  displayName,
  people = [],
  startPerson = ""
}) {
  const [firstId, setFirstId] = useState(startPerson || "");
  const [secondId, setSecondId] = useState("");
  const finderAnimRef = useSmartAutoAnimate();
  const isHi = lang === "hi";

  const translate = typeof t === "function" ? t : (key => key);
  const safePeople = Array.isArray(people) ? people.filter(p => p && p.id) : [];
  const resolveName = (id) => {
    if (!id) return "";
    if (typeof displayName === "function") return displayName(id) || id;
    const p = familyIndex?.byId?.[id];
    if (!p) return String(id);
    return (isHi ? p.hi || p.name : p.name) || String(id);
  };

  const isValid = Boolean(
    firstId &&
    secondId &&
    firstId !== secondId &&
    familyIndex?.byId?.[firstId] &&
    familyIndex?.byId?.[secondId]
  );

  const relAB = isValid ? solveComplexRelation(familyIndex, firstId, secondId, lang) : null;
  const relBA = isValid ? solveComplexRelation(familyIndex, secondId, firstId, lang) : null;
  const relABHi = isValid ? solveComplexRelation(familyIndex, firstId, secondId, "hi") : null;
  const relBAHi = isValid ? solveComplexRelation(familyIndex, secondId, firstId, "hi") : null;

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
      {translate("relIs", fromName, toName, rel.shortLabel)}
      {rel.description && rel.description !== rel.shortLabel && (
        <span className="muted"> ({rel.description})</span>
      )}
    </li>
  );

  return (
    <div className="finder reveal-parent" ref={finderAnimRef}>
      <p className="muted hover-explanation">{translate("relHelpSub")}</p>
      <div className="finder-grid">
        <div className="field">
          <label htmlFor="fa">{translate("first")}</label>
          <select id="fa" value={firstId} onChange={e => setFirstId(e.target.value)}>
            <option value="">{translate("none")}</option>
            {safePeople.map(p => (
              <option key={p.id} value={p.id}>
                {resolveName(p.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fb">{translate("second")}</label>
          <div className="finder-second-wrap">
            <select id="fb" value={secondId} onChange={e => setSecondId(e.target.value)}>
              <option value="">{translate("none")}</option>
              {safePeople.map(p => (
                <option key={p.id} value={p.id}>
                  {resolveName(p.id)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn ghost finder-swap-btn"
              onClick={handleSwap}
              aria-label={isHi ? "दोनों सदस्य बदलें" : "Swap people"}
              title={isHi ? "दोनों सदस्य बदलें" : "Swap people"}
            >
              ⇄
            </button>
          </div>
        </div>
      </div>

      {firstId && secondId && firstId === secondId && (
        <p className="msg" role="status">{translate("samePerson")}</p>
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
                {translate("commonAnc")}: <strong>{resolveName(relAB.commonAncestorId)}</strong>
              </span>
            )}
          </div>

          {/* Highlighted Result Card with Hindi Term */}
          <div className="finder-highlight-card">
            <div className="finder-highlight-main">
              <span className="finder-highlight-term">{relAB.shortLabel}</span>
              {relABHi?.shortLabel && relABHi.shortLabel !== relAB.shortLabel && (
                <span className="finder-highlight-hindi" lang="hi">
                  {relABHi.shortLabel}
                </span>
              )}
            </div>
            {relBA?.shortLabel && (
              <div className="finder-highlight-reciprocal">
                {resolveName(firstId)} → {resolveName(secondId)}: <strong>{relBA.shortLabel}</strong>
                {relBAHi?.shortLabel && relBAHi.shortLabel !== relBA.shortLabel && (
                  <span className="finder-highlight-hindi-sub" lang="hi"> ({relBAHi.shortLabel})</span>
                )}
              </div>
            )}
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            {renderRelationLine(resolveName(secondId), resolveName(firstId), relAB)}
            {renderRelationLine(resolveName(firstId), resolveName(secondId), relBA)}
          </ul>

          {relAB.pathSteps && relAB.pathSteps.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", paddingTop: "6px", borderTop: "1px dashed var(--line)" }}>
              <span className="chip" style={{ fontWeight: 700, borderColor: "var(--ink)" }}>
                {resolveName(firstId)}
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
                    {resolveName(step.toId)}
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

export function BirthdaysList({ data, lang = "en", t, displayName, openPerson }) {
  const bdayAnimRef = useSmartAutoAnimate();
  const translate = typeof t === "function" ? t : (key => key);
  const resolveName = (id) => {
    if (!id) return "";
    if (typeof displayName === "function") return displayName(id) || id;
    return String(id);
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const people = Array.isArray(data?.people) ? data.people : [];

  const upcoming = people
    .filter(p => p && p.id && typeof p.dob === "string" && p.dob.trim() && !p.late)
    .map(p => {
      const parsed = parseMilestoneDate(p.dob);
      if (!parsed) return null;
      const { year, month, day } = parsed;
      let nextBday = makeBirthdayOccurrence(today.getFullYear(), month, day);
      if (nextBday < today) {
        nextBday = makeBirthdayOccurrence(today.getFullYear() + 1, month, day);
      }
      const timeDiff = nextBday.getTime() - today.getTime();
      if (!Number.isFinite(timeDiff)) return null;
      const days = Math.round(timeDiff / 864e5);
      if (!Number.isFinite(days) || days < 0) return null;
      const turns =
        year !== null && Number.isFinite(year) && nextBday.getFullYear() >= year
          ? nextBday.getFullYear() - year
          : 0;
      return { p, next: nextBday, days, turns };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.days !== b.days) return a.days - b.days;
      return resolveName(a.p.id).localeCompare(resolveName(b.p.id));
    });

  if (!upcoming.length) {
    return (
      <div className="bday-panel reveal-parent">
        <p className="muted hover-explanation">{translate("noBday")}</p>
      </div>
    );
  }

  return (
    <div className="bday-panel reveal-parent">
      <p className="muted hover-explanation">{translate("bdayHelpSub")}</p>
      <ul className="blist" ref={bdayAnimRef}>
        {upcoming.map(item => (
          <li key={item.p.id}>
            <button
              type="button"
              className="chip"
              onClick={() => openPerson?.(item.p.id)}
            >
              {resolveName(item.p.id)}
            </button>
            <span>
              {item.next.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                day: "numeric",
                month: "long"
              })}
            </span>
            <span className="muted">
              {item.days === 0
                ? translate("today")
                : item.days === 1
                ? translate("tomorrow")
                : translate("inDays", item.days)}
              {item.turns > 0 ? " · " + translate("turns", item.turns) : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BackupPanel({ treeState, t, lang = "en", onImport, onReset, canEdit = true }) {
  const [includePhotos, setIncludePhotos] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [importText, setImportText] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const exportBoxRef = useRef(null);
  const backupAnimRef = useSmartAutoAnimate();
  const isHi = lang === "hi";
  const translate = typeof t === "function" ? t : (key => key);

  const safeData = treeState?.data || { people: [], couples: [] };
  const safePhotosMap =
    treeState?.photos && typeof treeState.photos === "object" && !Array.isArray(treeState.photos)
      ? treeState.photos
      : {};

  const exportPayload = useMemo(
    () =>
      JSON.stringify({
        v: 2,
        data: safeData,
        ...(includePhotos ? { photos: safePhotosMap } : {})
      }),
    [safeData, safePhotosMap, includePhotos]
  );

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
      setStatusMsg(translate("copyFail"));
    }
  };

  const handleImportJsonString = (rawText) => {
    try {
      if (typeof rawText !== "string" || !rawText.trim()) {
        throw new Error("Empty backup payload");
      }
      const parsed = JSON.parse(rawText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid backup object");
      }
      const d =
        parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
          ? parsed.data
          : parsed;
      const res = validateTreeData(d);
      if (!res.valid) {
        throw new Error(res.error);
      }
      const hasPhotosObj =
        parsed.photos && typeof parsed.photos === "object" && !Array.isArray(parsed.photos);
      const safePhotos = hasPhotosObj ? sanitizePhotosMap(parsed.photos) : undefined;
      if (safePhotos && !isPhotosPayloadWithinLimit(safePhotos)) {
        setStatusMsg(translate("noSpace"));
        return;
      }
      onImport?.(
        { people: d.people, couples: d.couples },
        safePhotos
      );
      setStatusMsg(translate("importOk"));
      setImportText("");
    } catch {
      setStatusMsg(translate("importBad"));
    }
  };

  const handleFileUpload = async (e) => {
    const input = e?.target;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await new Promise((resolve, reject) => {
        if (typeof FileReader !== "undefined") {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => reject(reader.error || new Error("FILE_READ_ERROR"));
          reader.onabort = () => reject(new Error("FILE_READ_ABORTED"));
          reader.readAsText(file);
        } else if (typeof file.text === "function") {
          file.text().then(resolve, reject);
        } else {
          reject(new Error("FILE_READ_UNSUPPORTED"));
        }
      });
      handleImportJsonString(text);
    } catch {
      setStatusMsg(translate("importBad"));
    } finally {
      if (input) {
        input.value = "";
      }
    }
  };

  return (
    <div className="backup reveal-parent" ref={backupAnimRef}>
      <p className="muted hover-explanation">{translate("backupHelpSub")}</p>
      <div className="backup-grid">
        {/* Export Card */}
        <div className="backup-section">
          <div className="field">
            <label htmlFor="bx">{translate("exportLbl")}</label>
            <textarea
              id="bx"
              ref={exportBoxRef}
              readOnly
              rows={8}
              value={exportPayload}
              onFocus={e => e.currentTarget.select()}
            />
          </div>

          <div className="backup-actions-row">
            <button
              type="button"
              className="btn"
              onClick={handleDownloadJson}
            >
              {isHi ? "JSON डाउनलोड करें" : "Download .json"}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportPayload);
                  setStatusMsg(translate("copied"));
                } catch {
                  exportBoxRef.current?.select();
                  setStatusMsg(translate("copyFail"));
                }
              }}
            >
              {translate("copy")}
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={e => setIncludePhotos(e.target.checked)}
              />{" "}
              {translate("incl")}
            </label>
          </div>
        </div>

        {/* Import & Restore Card */}
        {canEdit && (
          <div className="backup-section">
            <div className="field">
              <label htmlFor="bi">{translate("importLbl")}</label>
              <textarea
                id="bi"
                rows={8}
                value={importText}
                placeholder={translate("importPh")}
                onChange={e => setImportText(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="bi-file">
                {isHi ? "या .json फ़ाइल अपलोड करें" : "Upload .json file"}
              </label>
              <input
                id="bi-file"
                type="file"
                accept=".json"
                className="backup-file-input"
                onChange={handleFileUpload}
              />
            </div>

            <div className="backup-actions-row">
              <button
                type="button"
                className="btn"
                disabled={!importText.trim()}
                onClick={() => handleImportJsonString(importText)}
              >
                {translate("importBtn")}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  if (confirmReset) {
                    onReset?.();
                    setConfirmReset(false);
                    setStatusMsg("");
                  } else {
                    setConfirmReset(true);
                  }
                }}
                onBlur={() => setConfirmReset(false)}
              >
                {confirmReset ? translate("resetSure") : translate("reset")}
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
  activeTab = "rel",
  setActiveTab,
  treeState,
  familyIndex,
  lang = "en",
  t,
  displayName,
  openPerson,
  onImport,
  onReset,
  canEdit = true
}) {
  const panelAnimRef = useSmartAutoAnimate();
  const translate = typeof t === "function" ? t : (key => key);
  const tabKeys = [
    { id: "rel", labelKey: "tabRel" },
    { id: "bday", labelKey: "tabBday" },
    { id: "backup", labelKey: "tabBackup" }
  ];

  const handleTabKeyDown = (e, idx) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabKeys[(idx + 1) % tabKeys.length].id;
      setActiveTab?.(next);
      if (typeof document !== "undefined") {
        document.getElementById(`tab-${next}`)?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tabKeys[(idx - 1 + tabKeys.length) % tabKeys.length].id;
      setActiveTab?.(prev);
      if (typeof document !== "undefined") {
        document.getElementById(`tab-${prev}`)?.focus();
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab?.(tabKeys[0].id);
      if (typeof document !== "undefined") {
        document.getElementById(`tab-${tabKeys[0].id}`)?.focus();
      }
    } else if (e.key === "End") {
      e.preventDefault();
      const last = tabKeys[tabKeys.length - 1].id;
      setActiveTab?.(last);
      if (typeof document !== "undefined") {
        document.getElementById(`tab-${last}`)?.focus();
      }
    }
  };

  return (
    <section className="tools" aria-label={translate("toolsAria")}>
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
            onClick={() => setActiveTab?.(id)}
            onKeyDown={e => handleTabKeyDown(e, idx)}
          >
            {translate(labelKey)}
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
            t={translate}
            displayName={displayName}
            people={treeState?.data?.people || []}
            startPerson={treeState?.viewer || ""}
          />
        )}
        {activeTab === "bday" && (
          <BirthdaysList
            data={treeState?.data}
            lang={lang}
            t={translate}
            displayName={displayName}
            openPerson={openPerson}
          />
        )}
        {activeTab === "backup" && (
          <BackupPanel
            treeState={treeState}
            t={translate}
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
