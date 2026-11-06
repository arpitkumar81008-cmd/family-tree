import React, { useState, useEffect, useRef } from 'react';
import { transliterateToHindi } from '../i18n/translit.js';

export function AddModal({
  familyIndex,
  t,
  lang,
  displayName,
  people,
  couples,
  close,
  onAdd
}) {
  const [rel, setRel] = useState("child");
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [hiName, setHiName] = useState("");
  const [gender, setGender] = useState("M");
  const [dob, setDob] = useState("");
  const [late, setLate] = useState(false);
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    const handleKeyDown = e => {
      if (e.key === "Tab") {
        const focusable = modalRef.current
          ? Array.from(
              modalRef.current.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              )
            ).filter(el => el.offsetParent !== null || el.offsetWidth > 0)
          : [];
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      } else if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  useEffect(() => {
    setIsDuplicate(false);
    setErrorMsg("");
  }, [name, hiName]);

  useEffect(() => {
    if (rel === "child") {
      const c = couples[0];
      setTarget(c ? c.h || c.w : people[0]?.id || "");
    } else if (rel === "spouse") {
      const p = people.find(p => !familyIndex.spouse[p.id]);
      setTarget(p ? p.id : people[0]?.id || "");
    } else if (rel !== "root") {
      setTarget(people[0]?.id || "");
    } else {
      setTarget("");
    }
  }, [rel, couples, people, familyIndex]);

  const handleSubmit = e => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg(t("needName"));
      return;
    }

    const match = people.find(
      p =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (hiName.trim() && p.hi && p.hi.trim() === hiName.trim())
    );

    if (match && !isDuplicate) {
      setIsDuplicate(true);
      setErrorMsg(t("dupWarn", match.name));
      return;
    }

    setSubmitting(true);
    onAdd({
      rel,
      target,
      person: {
        name: trimmedName,
        hi: hiName.trim() || undefined,
        g: gender,
        dob: dob || undefined,
        late: late || undefined,
        note: note.trim() || undefined
      }
    });
    close();
  };

  const coupleOptions = [];
  couples.forEach(c => {
    const h = c.h ? displayName(c.h) : "";
    const w = c.w ? displayName(c.w) : "";
    const label = h && w ? `${h} & ${w}` : h || w;
    if (label) coupleOptions.push({ id: c.h || c.w, label });
  });
  people.forEach(p => {
    if (!couples.some(c => c.h === p.id || c.w === p.id)) {
      coupleOptions.push({ id: p.id, label: displayName(p.id) });
    }
  });

  return (
    <div
      className="overlay"
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={modalRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="am-title"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          className="x"
          type="button"
          aria-label={t("close")}
          onClick={close}
        >
          ×
        </button>
        <h2 id="am-title">{t("addMemberTitle")}</h2>
        <form className="newform" onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
          {/* Relationship Type */}
          <div className="field">
            <label htmlFor="am-rel">{t("relType")}</label>
            <select
              id="am-rel"
              value={rel}
              onChange={e => setRel(e.target.value)}
            >
              <option value="child">{t("relTypeChild")}</option>
              <option value="spouse">{t("relTypeSpouse")}</option>
              <option value="sibling">{t("relTypeSibling")}</option>
              <option value="parent">{t("relTypeParent")}</option>
              <option value="root">{t("relTypeRoot")}</option>
            </select>
          </div>

          {/* Target Person or Couple */}
          {rel !== "root" && (
            <div className="field">
              <label htmlFor="am-target">
                {rel === "child" ? t("targetCouple") : t("targetPerson")}
              </label>
              <select
                id="am-target"
                value={target}
                onChange={e => setTarget(e.target.value)}
              >
                {rel === "child"
                  ? coupleOptions.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))
                  : rel === "spouse"
                  ? people
                      .filter(p => !familyIndex.spouse[p.id] || p.id === target)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {displayName(p.id)}
                        </option>
                      ))
                  : people.map(p => (
                      <option key={p.id} value={p.id}>
                        {displayName(p.id)}
                      </option>
                    ))}
              </select>
            </div>
          )}

          {/* Name in English */}
          <div className="field">
            <label htmlFor="am-name">{t("name")}</label>
            <input
              ref={nameInputRef}
              id="am-name"
              value={name}
              placeholder="e.g. Ramesh Gupta"
              onChange={e => {
                const val = e.target.value;
                setName(val);
                transliterateToHindi(val).then(hi => setHiName(hi));
              }}
            />
          </div>

          {/* Name in Hindi */}
          <div className="field">
            <label htmlFor="am-hi">{t("hiName")}</label>
            <div className="hi-field-wrap">
              <input
                id="am-hi"
                value={hiName}
                placeholder={isTranslating ? t("translating") : "उदा. रमेश गुप्ता"}
                onChange={e => setHiName(e.target.value)}
              />
              <button
                type="button"
                className="hi-btn"
                title={t("autoHindi")}
                aria-label={t("autoHindi")}
                onClick={async () => {
                  if (name) {
                    setIsTranslating(true);
                    const hi = await transliterateToHindi(name);
                    setHiName(hi);
                    setIsTranslating(false);
                  }
                }}
              >
                ✨
              </button>
            </div>
          </div>

          {/* Gender */}
          <div className="field">
            <span className="lbl">{t("gender")}</span>
            <div className="seg" role="group">
              <button
                type="button"
                className="zbtn"
                aria-pressed={gender === "M"}
                onClick={() => setGender("M")}
              >
                {t("male")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={gender === "F"}
                onClick={() => setGender("F")}
              >
                {t("female")}
              </button>
            </div>
          </div>

          {/* Date of Birth */}
          <div className="field">
            <label htmlFor="am-dob">{t("dob")}</label>
            <input
              id="am-dob"
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
            />
          </div>

          {/* Passed Away */}
          <label className="check">
            <input
              type="checkbox"
              checked={late}
              onChange={e => setLate(e.target.checked)}
            />{" "}
            {t("passed")}
          </label>

          {/* Note */}
          <div className="field">
            <label htmlFor="am-note">{t("note")}</label>
            <textarea
              id="am-note"
              rows={2}
              value={note}
              placeholder={t("notePh")}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {errorMsg && (
            <p
              className="msg"
              role="status"
              style={
                isDuplicate
                  ? {
                      color: "var(--accent)",
                      fontWeight: 600,
                      background: "var(--surface)",
                      padding: "8px 12px",
                      border: "1px solid var(--accent)"
                    }
                  : undefined
              }
            >
              {errorMsg}
            </p>
          )}

          <div className="actions">
            <button type="submit" className="btn" disabled={submitting}>
              {isDuplicate ? t("confirmAdd") : t("save")}
            </button>
            <button type="button" className="btn ghost" onClick={close}>
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddModal;
