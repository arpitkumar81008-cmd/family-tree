import React, { useState, useRef } from 'react';
import { calculateKinship } from '../utils/kinship.js';

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
      <div className="row" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div className="field" style={{ flex: "1 1 200px" }}>
          <label htmlFor="fa">{t("first")}</label>
          <select id="fa" value={firstId} onChange={e => setFirstId(e.target.value)}>
            <option value="" />
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {displayName(p.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: "1 1 200px" }}>
          <label htmlFor="fb">{t("second")}</label>
          <select id="fb" value={secondId} onChange={e => setSecondId(e.target.value)}>
            <option value="" />
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {displayName(p.id)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {firstId && secondId && firstId === secondId && (
        <p className="msg">{t("samePerson")}</p>
      )}

      {isValid && (
        <ul className="res" style={{ listStyle: "none", padding: 0, marginTop: "8px" }}>
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

export function BackupPanel({ treeState, t, onImport, onReset }) {
  const [includePhotos, setIncludePhotos] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [importText, setImportText] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const exportBoxRef = useRef(null);

  const exportPayload = JSON.stringify({
    v: 2,
    data: treeState.data,
    ...(includePhotos ? { photos: treeState.photos } : {})
  });

  return (
    <div className="backup">
      <div className="field">
        <label htmlFor="bx">{t("exportLbl")}</label>
        <textarea
          id="bx"
          ref={exportBoxRef}
          readOnly
          rows={3}
          value={exportPayload}
          onFocus={e => e.currentTarget.select()}
        />
      </div>

      <div className="row center" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
        <label className="check">
          <input
            type="checkbox"
            checked={includePhotos}
            onChange={e => setIncludePhotos(e.target.checked)}
          />{" "}
          {t("incl")}
        </label>
      </div>

      <div className="field" style={{ marginTop: "12px" }}>
        <label htmlFor="bi">{t("importLbl")}</label>
        <textarea
          id="bi"
          rows={3}
          value={importText}
          placeholder={t("importPh")}
          onChange={e => setImportText(e.target.value)}
        />
      </div>

      <div className="row center" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button
          type="button"
          className="btn ghost"
          disabled={!importText.trim()}
          onClick={() => {
            try {
              const parsed = JSON.parse(importText);
              const d = parsed.data;
              if (!d || !Array.isArray(d.people) || !Array.isArray(d.couples)) {
                throw new Error("Invalid shape");
              }
              const ids = new Set();
              d.people.forEach(p => {
                if (typeof p.id !== "string" || typeof p.name !== "string") {
                  throw new Error("Invalid person");
                }
                ids.add(p.id);
              });
              d.couples.forEach(c => {
                if (!ids.has(c.h) || !ids.has(c.w) || !Array.isArray(c.kids)) {
                  throw new Error("Invalid couple");
                }
              });
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

      {statusMsg && (
        <p className="msg" role="status">
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
  onReset
}) {
  const tabKeys = [
    { id: "rel", labelKey: "tabRel" },
    { id: "bday", labelKey: "tabBday" },
    { id: "backup", labelKey: "tabBackup" }
  ];

  return (
    <section className="tools" aria-label={t("toolsAria")}>
      <div className="tabs" role="tablist">
        {tabKeys.map(({ id, labelKey }) => (
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
            onImport={onImport}
            onReset={onReset}
          />
        )}
      </div>
    </section>
  );
}

export default Tabs;
