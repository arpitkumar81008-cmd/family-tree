import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './Card.jsx';
import { getInitials } from '../data/familyData.js';
import { calculateKinship } from '../utils/kinship.js';
import { transliterateToHindi } from '../i18n/translit.js';

export function Sheet({
  id,
  familyIndex,
  t,
  lang,
  displayName,
  viewer,
  photo,
  setViewer,
  close,
  open,
  patch,
  add,
  remove,
  setPhoto
}) {
  const person = familyIndex.byId[id];
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(person?.note || "");
  const [addMode, setAddMode] = useState(null); // 'spouse' | 'child' | 'parent' | 'sibling'
  const [subName, setSubName] = useState("");
  const [subHi, setSubHi] = useState("");
  const [subGender, setSubGender] = useState("M");
  const [photoMsg, setPhotoMsg] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const sheetRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  if (!person) return null;

  const name = displayName(person.id);
  const initials = getInitials(name);
  const relationWithViewer = viewer
    ? calculateKinship(familyIndex, viewer, person.id, lang)
    : null;

  const parents = familyIndex.parOf(person.id);
  const spouseId = familyIndex.spouse[person.id];
  const children = familyIndex.kidsOf(person.id);
  const siblings = familyIndex.sibsOf(person.id);

  const canRemove = !children.length && !spouseId;

  const handlePhotoUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
        const ok = setPhoto(person.id, dataUrl);
        setPhotoMsg(ok ? t("added") : t("noSpace"));
      };
      img.src = String(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubAdd = e => {
    e.preventDefault();
    if (!subName.trim()) {
      setErrMsg(t("needName"));
      return;
    }
    add(person.id, addMode, subName.trim(), subHi.trim(), subGender);
    setAddMode(null);
    setSubName("");
    setSubHi("");
    setErrMsg("");
  };

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
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sh-name"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="x"
          type="button"
          aria-label={t("close")}
          onClick={close}
        >
          ×
        </button>

        <div className="sh-head">
          <Avatar photo={photo} label={t("photoOf", name)} text={initials} big />
          <div>
            <h2 id="sh-name">{name}</h2>
            {person.late && <span className="tag">{t("lateWord")}</span>}
            {relationWithViewer && (
              <div className="rel">
                {relationWithViewer[0]}
                {relationWithViewer[1] && (
                  <span className="muted"> · {relationWithViewer[1]}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Directional Tree perspective button */}
        <div style={{ marginBlock: "12px" }}>
          <button
            type="button"
            className="focus-tree-btn"
            style={{ width: "100%" }}
            onClick={() => {
              setViewer(person.id);
              close();
            }}
          >
            ★ {lang === "hi" ? "इस कार्ड से दिशात्मक वृक्ष देखें" : "View Directional Tree From Here"}
          </button>
        </div>

        {/* Photo Upload / Change / Remove */}
        <div className="row" style={{ marginBottom: "14px", gap: "8px" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
          <button
            type="button"
            className="btn ghost"
            style={{ fontSize: "12px", height: "32px", padding: "0 10px" }}
            onClick={() => fileInputRef.current?.click()}
          >
            {photo ? t("change") : t("add")}
          </button>
          {photo && (
            <button
              type="button"
              className="btn ghost"
              style={{ fontSize: "12px", height: "32px", padding: "0 10px" }}
              onClick={() => {
                setPhoto(person.id, null);
                setPhotoMsg("");
              }}
            >
              {t("removePhoto")}
            </button>
          )}
          {photoMsg && <span className="muted" style={{ fontSize: "12px" }}>{photoMsg}</span>}
        </div>

        {/* Note / Bio */}
        <div className="field" style={{ marginBottom: "16px" }}>
          <label htmlFor="sh-note">{t("note")}</label>
          {editingNote ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <textarea
                id="sh-note"
                rows={3}
                value={noteVal}
                placeholder={t("notePh")}
                onChange={e => setNoteVal(e.target.value)}
              />
              <div className="actions" style={{ marginTop: "4px" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    patch(person.id, { note: noteVal.trim() || undefined });
                    setEditingNote(false);
                  }}
                >
                  {t("save")}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setNoteVal(person.note || "");
                    setEditingNote(false);
                  }}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <p
              style={{ margin: "4px 0", cursor: "pointer", color: person.note ? "inherit" : "var(--muted)" }}
              onClick={() => setEditingNote(true)}
            >
              {person.note || t("notePh")}
            </p>
          )}
        </div>

        {/* Family Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
          {parents.length > 0 && (
            <div>
              <span className="muted">{t("parents")}: </span>
              {parents.map((pId, idx) => (
                <button
                  key={pId}
                  type="button"
                  className="chip"
                  style={{ marginRight: "6px" }}
                  onClick={() => open(pId)}
                >
                  {displayName(pId)}
                </button>
              ))}
            </div>
          )}

          {spouseId && (
            <div>
              <span className="muted">{t("spouse")}: </span>
              <button
                type="button"
                className="chip"
                onClick={() => open(spouseId)}
              >
                {displayName(spouseId)}
              </button>
            </div>
          )}

          {children.length > 0 && (
            <div>
              <span className="muted">{t("children")}: </span>
              {children.map(kId => (
                <button
                  key={kId}
                  type="button"
                  className="chip"
                  style={{ marginRight: "6px", marginBottom: "4px" }}
                  onClick={() => open(kId)}
                >
                  {displayName(kId)}
                </button>
              ))}
            </div>
          )}

          {siblings.length > 0 && (
            <div>
              <span className="muted">{t("siblings")}: </span>
              {siblings.map(sId => (
                <button
                  key={sId}
                  type="button"
                  className="chip"
                  style={{ marginRight: "6px", marginBottom: "4px" }}
                  onClick={() => open(sId)}
                >
                  {displayName(sId)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Add Relations */}
        <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {!spouseId && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setAddMode("spouse");
                setSubGender(person.g === "M" ? "F" : "M");
              }}
            >
              + {t("addSpouse")}
            </button>
          )}
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setAddMode("child");
              setSubGender("M");
            }}
          >
            + {t("addChild")}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setAddMode("sibling");
              setSubGender("M");
            }}
          >
            + {t("addSibling")}
          </button>
          {parents.length < 2 && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setAddMode("parent");
                setSubGender(parents.length === 0 ? "M" : (familyIndex.byId[parents[0]]?.g === "M" ? "F" : "M"));
              }}
            >
              + {t("addParent")}
            </button>
          )}
        </div>

        {/* Inline Sub-Form for Adding Relative */}
        {addMode && (
          <form className="newform" onSubmit={handleSubAdd} style={{ marginTop: "14px" }}>
            <h3>
              {t(
                addMode === "spouse"
                  ? "formSpouse"
                  : addMode === "child"
                  ? "formChild"
                  : addMode === "parent"
                  ? "formParent"
                  : "formSibling",
                name
              )}
            </h3>
            <div className="field">
              <label htmlFor="sub-name">{t("name")}</label>
              <input
                id="sub-name"
                value={subName}
                autoFocus
                onChange={e => {
                  const val = e.target.value;
                  setSubName(val);
                  transliterateToHindi(val).then(hi => setSubHi(hi));
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="sub-hi">{t("hiName")}</label>
              <div className="hi-field-wrap">
                <input
                  id="sub-hi"
                  value={subHi}
                  onChange={e => setSubHi(e.target.value)}
                />
                <button
                  type="button"
                  className="hi-btn"
                  title={t("autoHindi")}
                  aria-label={t("autoHindi")}
                  onClick={async () => {
                    if (subName) setSubHi(await transliterateToHindi(subName));
                  }}
                >
                  ✨
                </button>
              </div>
            </div>
            <div className="seg" role="group">
              <button
                type="button"
                className="zbtn"
                aria-pressed={subGender === "M"}
                onClick={() => setSubGender("M")}
              >
                {t("male")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={subGender === "F"}
                onClick={() => setSubGender("F")}
              >
                {t("female")}
              </button>
            </div>
            {errMsg && <p className="msg">{errMsg}</p>}
            <div className="actions">
              <button type="submit" className="btn">
                {t("save")}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setAddMode(null)}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        )}

        {/* Danger zone / Remove person */}
        <div className="danger">
          {canRemove ? (
            <button
              type="button"
              className="btn ghost"
              style={{ color: "#ef4444" }}
              onClick={() => {
                if (confirmRemove) {
                  remove(person.id);
                } else {
                  setConfirmRemove(true);
                }
              }}
              onBlur={() => setConfirmRemove(false)}
            >
              {confirmRemove ? t("removeSure") : t("removePerson")}
            </button>
          ) : (
            <p className="muted" style={{ fontSize: "12px" }}>
              {t("cantRemove")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sheet;
