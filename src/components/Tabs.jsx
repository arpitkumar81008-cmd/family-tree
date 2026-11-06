import React, { useState, useRef } from 'react';
import { calculateKinship } from '../utils/kinship.js';
import { validateTreeData } from '../data/schema.js';

export function RelationshipFinder({ familyIndex, lang, t, displayName, people, startPerson }) {
  const [firstId, setFirstId] = useState(startPerson || "");
  const [secondId, setSecondId] = useState("");

  const isValid =
    firstId &&
    secondId &&
    firstId !== secondId &&
    familyIndex.byId[firstId] &&
    familyIndex.byId[secondId];

  const findCommonAncestors = (p1, p2) => {
    const getLevels = start => {
      const levels = { [start]: 0 };
      let queue = [start];
      let depth = 0;
      while (queue.length) {
        depth++;
        const next = [];
        queue.forEach(id => {
          familyIndex.parOf(id).forEach(pid => {
            if (!(pid in levels)) {
              levels[pid] = depth;
              next.push(pid);
            }
          });
        });
        queue = next;
      }
      return levels;
    };

    const l1 = getLevels(p1);
    const l2 = getLevels(p2);
    let best = null;
    let minD = 1e9;

    Object.keys(l1).forEach(id => {
      if (id in l2 && id !== p1 && id !== p2) {
        const total = l1[id] + l2[id];
        if (total < minD) {
          minD = total;
          best = id;
        }
      }
    });
    return best;
  };

  const renderRelationLine = (fromName, toName, fromId, toId) => {
    const rel = calculateKinship(familyIndex, toId, fromId, lang);
    return (
      <li>
        {t("relIs", fromName, toName, rel[0])}
        {rel[1] !== rel[0] && <span className="muted"> ({rel[1]})</span>}
      </li>
    );
  };

  const commonAncestor = isValid ? findCommonAncestors(firstId, secondId) : null;

  return (
    <div className="finder">
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
          <select id="fb" value={secondId} onChange={e => setSecondId(e.target.value)}>
            <option value="">{t("none")}</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {displayName(p.id)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {firstId && secondId && firstId === secondId && (
        <p className="msg" role="status">{t("samePerson")}</p>
      )}

      {isValid && (
        <ul className="res">
          {renderRelationLine(displayName(secondId), displayName(firstId), secondId, firstId)}
          {renderRelationLine(displayName(firstId), displayName(secondId), firstId, secondId)}
          {commonAncestor && (
            <li className="muted" style={{ marginTop: "6px" }}>
              {t("commonAnc")}: <strong>{displayName(commonAncestor)}</strong>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function BirthdaysList({ data, lang, t, displayName, openPerson }) {
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
    <ul className="blist">
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
  );
}

export function BackupPanel({ treeState, t, lang, onImport, onReset, canEdit = true }) {
  const [includePhotos, setIncludePhotos] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [importText, setImportText] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const exportBoxRef = useRef(null);
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
    <div className="backup">
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
