import React, { useState, useEffect, useMemo } from 'react';
import { solveComplexRelation } from '../utils/kinship.js';

export function RelationSolverModal({
  isOpen = true,
  onClose,
  close,
  familyIndex,
  people: peopleProp,
  lang = "en",
  t,
  displayName: displayNameProp,
  initialOriginId = "",
  startPerson = "",
  initialTargetId = "",
  onSelectPerson,
  openPerson
}) {
  const handleClose = onClose || close || (() => {});
  const handleOpenPerson = onSelectPerson || openPerson;
  const isHi = lang === "hi";

  const [originId, setOriginId] = useState(initialOriginId || startPerson || "");
  const [targetId, setTargetId] = useState(initialTargetId || "");

  useEffect(() => {
    if (initialOriginId || startPerson) {
      setOriginId(initialOriginId || startPerson);
    }
  }, [initialOriginId, startPerson]);

  useEffect(() => {
    if (initialTargetId) {
      setTargetId(initialTargetId);
    }
  }, [initialTargetId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = e => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const people = useMemo(() => {
    if (Array.isArray(peopleProp) && peopleProp.length > 0) return peopleProp;
    return Object.values(familyIndex?.byId || {});
  }, [peopleProp, familyIndex]);

  const displayName = id => {
    if (typeof displayNameProp === "function") return displayNameProp(id);
    const p = familyIndex?.byId?.[id];
    if (!p) return id;
    return isHi ? (p.hi || p.n || id) : (p.n || id);
  };

  const isValid =
    Boolean(originId) &&
    Boolean(targetId) &&
    originId !== targetId &&
    Boolean(familyIndex?.byId?.[originId]) &&
    Boolean(familyIndex?.byId?.[targetId]);

  const result = useMemo(() => {
    if (!isValid) return null;
    return solveComplexRelation(familyIndex, originId, targetId, lang);
  }, [isValid, familyIndex, originId, targetId, lang]);

  const reverseResult = useMemo(() => {
    if (!isValid) return null;
    return solveComplexRelation(familyIndex, targetId, originId, lang);
  }, [isValid, familyIndex, originId, targetId, lang]);

  if (!isOpen) return null;

  const handleSwap = () => {
    setOriginId(targetId);
    setTargetId(originId);
  };

  const labels = {
    title: isHi ? "रिश्ता खोजें" : "Find Relation",
    subtitle: isHi
      ? "किन्हीं भी दो परिवारजनों के बीच का सटीक रिश्ता और कड़ी देखें।"
      : "Pick any two family members to trace their exact relation and path.",
    memberA: isHi ? "सदस्य A (से)" : "Member A (From)",
    memberB: isHi ? "सदस्य B (तक)" : "Member B (To)",
    swap: isHi ? "दोनों सदस्य बदलें" : "Swap members",
    none: typeof t === "function" ? t("none") : (isHi ? "कोई नहीं" : "Select a person"),
    samePerson: typeof t === "function" ? t("samePerson") : (isHi ? "कृपया दो अलग-अलग व्यक्ति चुनें।" : "Pick two different people."),
    blood: isHi ? "रक्त संबंध" : "Blood Relation",
    marital: isHi ? "विवाह द्वारा" : "By Marriage",
    disconnected: isHi ? "कोई जुड़ाव नहीं" : "Not Connected",
    paternal: isHi ? "पैतृक पक्ष" : "Paternal Side",
    maternal: isHi ? "मातृ पक्ष" : "Maternal Side",
    direct: isHi ? "सीधी वंशावली" : "Direct Lineage",
    commonAnc: isHi ? "साझा पूर्वज" : "Common Ancestor",
    pathTitle: isHi ? "रिश्ते की कड़ी" : "Step-by-Step Path",
    close: typeof t === "function" ? t("close") : (isHi ? "बंद करें" : "Close")
  };

  const badgeBase = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11.5px",
    fontWeight: 700,
    letterSpacing: "0.03em",
    lineHeight: 1.3
  };

  const sideTagText =
    result?.lineageSide === "paternal"
      ? labels.paternal
      : result?.lineageSide === "maternal"
      ? labels.maternal
      : result?.lineageSide === "direct"
      ? labels.direct
      : null;

  return (
    <div
      className="overlay"
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="relation-solver-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "560px" }}
      >
        <button
          className="x"
          type="button"
          aria-label={labels.close}
          onClick={handleClose}
        >
          ×
        </button>

        <div style={{ marginBottom: "18px", paddingRight: "28px" }}>
          <h2
            id="relation-solver-title"
            style={{
              margin: "0 0 4px",
              fontFamily: "var(--display)",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--ink)"
            }}
          >
            {labels.title}
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: "13.5px" }}>
            {labels.subtitle}
          </p>
        </div>

        {/* Member A & B selectors with quick swap */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "10px",
            alignItems: "end",
            marginBottom: "16px"
          }}
        >
          <div className="field" style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
            <label
              htmlFor="solver-member-a"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              {labels.memberA}
            </label>
            <select
              id="solver-member-a"
              value={originId}
              onChange={e => setOriginId(e.target.value)}
              style={{ width: "100%", height: "40px", padding: "0 10px" }}
            >
              <option value="">{labels.none}</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>
                  {displayName(p.id)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn ghost"
            onClick={handleSwap}
            aria-label={labels.swap}
            title={labels.swap}
            style={{
              height: "40px",
              width: "40px",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "17px",
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            ⇄
          </button>

          <div className="field" style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
            <label
              htmlFor="solver-member-b"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              {labels.memberB}
            </label>
            <select
              id="solver-member-b"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              style={{ width: "100%", height: "40px", padding: "0 10px" }}
            >
              <option value="">{labels.none}</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>
                  {displayName(p.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {originId && targetId && originId === targetId && (
          <p className="msg" role="status" style={{ margin: "8px 0 0" }}>
            {labels.samePerson}
          </p>
        )}

        {isValid && result && (
          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {/* Badges Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              {result.lineageSide === null ? (
                <span
                  style={{
                    ...badgeBase,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--muted)"
                  }}
                >
                  {labels.disconnected}
                </span>
              ) : result.isBlood ? (
                <span
                  style={{
                    ...badgeBase,
                    background: "color-mix(in srgb, var(--accent) 13%, var(--surface))",
                    border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
                    color: "var(--rel)"
                  }}
                >
                  ● {labels.blood}
                </span>
              ) : (
                <span
                  style={{
                    ...badgeBase,
                    background: "var(--surface)",
                    border: "1px solid var(--ink)",
                    color: "var(--ink)"
                  }}
                >
                  ◆ {labels.marital}
                </span>
              )}

              {sideTagText && (
                <span
                  style={{
                    ...badgeBase,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--muted)"
                  }}
                >
                  {sideTagText}
                </span>
              )}

              {result.commonAncestorId && (
                <button
                  type="button"
                  onClick={() => handleOpenPerson?.(result.commonAncestorId)}
                  disabled={!handleOpenPerson}
                  style={{
                    ...badgeBase,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    cursor: handleOpenPerson ? "pointer" : "default"
                  }}
                >
                  {labels.commonAnc}: <strong>{displayName(result.commonAncestorId)}</strong>
                </button>
              )}
            </div>

            {/* Primary Relation Hero */}
            <div>
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>
                {isHi
                  ? `${displayName(targetId)}, ${displayName(originId)} के:`
                  : `${displayName(targetId)} is ${displayName(originId)}'s`}
              </div>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  lineHeight: 1.2
                }}
              >
                {result.shortLabel}
              </div>
              {result.description && result.description !== result.shortLabel && (
                <div style={{ fontSize: "13.5px", color: "var(--muted)", marginTop: "3px" }}>
                  {result.description}
                </div>
              )}
              {reverseResult && result.lineageSide !== null && (
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--muted)",
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px dashed var(--line)"
                  }}
                >
                  {isHi
                    ? `${displayName(originId)}, ${displayName(targetId)} के: `
                    : `${displayName(originId)} is ${displayName(targetId)}'s `}
                  <strong style={{ color: "var(--ink)" }}>{reverseResult.shortLabel}</strong>
                  {reverseResult.description && reverseResult.description !== reverseResult.shortLabel
                    ? ` (${reverseResult.description})`
                    : ""}
                </div>
              )}
            </div>

            {/* Visual Step-by-Step Path Chain */}
            {result.pathSteps && result.pathSteps.length > 0 && (
              <div style={{ paddingTop: "8px", borderTop: "1px solid var(--line)" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "8px"
                  }}
                >
                  {labels.pathTitle} ({result.pathSteps.length})
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span
                    className="chip"
                    style={{
                      fontWeight: 700,
                      borderColor: "var(--ink)",
                      cursor: handleOpenPerson ? "pointer" : "default"
                    }}
                    onClick={() => handleOpenPerson?.(originId)}
                  >
                    {displayName(originId)}
                  </span>

                  {result.pathSteps.map((step, idx) => {
                    const isLast = idx === result.pathSteps.length - 1;
                    return (
                      <React.Fragment key={`${step.fromId}-${step.toId}-${idx}`}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "11.5px",
                            color: "var(--muted)",
                            padding: "2px 6px",
                            background: "var(--surface)",
                            borderRadius: "999px",
                            border: "1px solid var(--line)"
                          }}
                        >
                          <span>→</span>
                          <span>{step.relation}</span>
                          <span>→</span>
                        </span>
                        <span
                          className="chip"
                          style={{
                            fontWeight: isLast ? 700 : 500,
                            borderColor: isLast ? "var(--accent)" : "var(--line)",
                            color: isLast ? "var(--rel)" : "var(--ink)",
                            cursor: handleOpenPerson ? "pointer" : "default"
                          }}
                          onClick={() => handleOpenPerson?.(step.toId)}
                        >
                          {displayName(step.toId)}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RelationSolverModal;
