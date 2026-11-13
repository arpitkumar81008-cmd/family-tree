import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './Card.jsx';
import { getInitials } from '../data/familyData.js';
import { calculateKinship } from '../utils/kinship.js';
import { transliterateToHindi } from '../i18n/translit.js';
import { compressPhotoFile } from '../utils/photoCompress.js';

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
  setPhoto,
  onUnlinkSpouse,
  onUnlinkParents,
  canEdit = true
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

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState(person?.name || "");
  const [editHi, setEditHi] = useState(person?.hi || "");
  const [editGender, setEditGender] = useState(person?.g || "M");
  const [editDob, setEditDob] = useState(person?.dob || "");
  const [editCity, setEditCity] = useState(person?.city || "");
  const [editAnniversary, setEditAnniversary] = useState(person?.anniversary || "");
  const [editLate, setEditLate] = useState(Boolean(person?.late));

  const sheetRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setNoteVal(person?.note || "");
    setEditingNote(false);
    setAddMode(null);
    setPhotoMsg("");
    setConfirmRemove(false);
    setErrMsg("");
    setIsEditingDetails(false);
    setEditName(person?.name || "");
    setEditHi(person?.hi || "");
    setEditGender(person?.g || "M");
    setEditDob(person?.dob || "");
    setEditCity(person?.city || "");
    setEditAnniversary(person?.anniversary || "");
    setEditLate(Boolean(person?.late));
  }, [id, person?.name, person?.hi, person?.g, person?.dob, person?.city, person?.anniversary, person?.late, person?.note]);

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

  const handlePhotoUpload = async e => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setPhotoMsg(t("photoProcessing"));
    try {
      const dataUrl = await compressPhotoFile(file, { targetBytes: 8192 });
      const ok = await setPhoto(person.id, dataUrl);
      setPhotoMsg(ok ? t("added") : t("noSpace"));
    } catch {
      setPhotoMsg(t("badImg"));
    } finally {
      input.value = "";
    }
  };

  const handleSubAdd = e => {
    e.preventDefault();
    if (!subName.trim()) {
      setErrMsg(t("needName"));
      return;
    }
    add(person.id, addMode, subName.trim(), subHi.trim() || undefined, subGender);
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

        <div className="sh-head" style={{ alignItems: isEditingDetails ? "flex-start" : "center" }}>
          <Avatar photo={photo} label={t("photoOf", name)} text={initials} big />
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditingDetails ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                <div>
                  <label htmlFor="edit-name" style={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted)" }}>
                    {lang === "hi" ? "पूरा नाम (अंग्रेज़ी)" : "Full Name (English)"}
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editName}
                    onChange={e => {
                      const val = e.target.value;
                      setEditName(val);
                      if (!editHi || editHi === transliterateToHindi(editName)) {
                        setEditHi(transliterateToHindi(val));
                      }
                    }}
                    style={{ width: "100%", padding: "6px 8px", fontSize: "14px", marginTop: "4px" }}
                  />
                </div>

                <div>
                  <label htmlFor="edit-hi" style={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted)" }}>
                    {lang === "hi" ? "हिंदी नाम" : "Hindi Name"}
                  </label>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                    <input
                      id="edit-hi"
                      type="text"
                      value={editHi}
                      onChange={e => setEditHi(e.target.value)}
                      style={{ flex: 1, padding: "6px 8px", fontSize: "14px" }}
                    />
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ fontSize: "11px", padding: "0 8px" }}
                      onClick={() => setEditHi(transliterateToHindi(editName))}
                      title={lang === "hi" ? "अंग्रेज़ी से हिंदी में बदलें" : "Auto-transliterate to Hindi"}
                    >
                      अ→A
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <label htmlFor="edit-gender" style={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted)" }}>
                      {t("gender")}
                    </label>
                    <select
                      id="edit-gender"
                      value={editGender}
                      onChange={e => setEditGender(e.target.value)}
                      style={{ display: "block", marginTop: "4px", padding: "4px 8px" }}
                    >
                      <option value="M">{t("male")}</option>
                      <option value="F">{t("female")}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-dob" style={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted)" }}>
                      {t("dob")}
                    </label>
                    <input
                      id="edit-dob"
                      type="date"
                      value={editDob}
                      onChange={e => setEditDob(e.target.value)}
                      style={{ display: "block", marginTop: "4px", padding: "4px 8px" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-anniversary" style={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted)" }}>
                      {lang === "hi" ? "विवाह / विशेष तिथि" : "Anniversary"}
                    </label>
                    <input
                      id="edit-anniversary"
                      type="date"
                      value={editAnniversary}
                      onChange={e => setEditAnniversary(e.target.value)}
                      style={{ display: "block", marginTop: "4px", padding: "4px 8px" }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-city" style={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted)" }}>
                    {lang === "hi" ? "गृहनगर / शहर" : "Hometown / City"}
                  </label>
                  <input
                    id="edit-city"
                    type="text"
                    value={editCity}
                    placeholder={lang === "hi" ? "जैसे: जयपुर, दिल्ली" : "e.g. Jaipur, Delhi"}
                    onChange={e => setEditCity(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", fontSize: "14px", marginTop: "4px" }}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    checked={editLate}
                    onChange={e => setEditLate(e.target.checked)}
                  />
                  <span>{lang === "hi" ? "स्वर्गवासी (Late)" : "Late (Deceased)"}</span>
                </label>

                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const trimmed = editName.trim();
                      if (!trimmed) return;
                      patch(person.id, {
                        name: trimmed,
                        hi: editHi.trim() || undefined,
                        g: editGender,
                        dob: editDob || undefined,
                        city: editCity.trim() || undefined,
                        anniversary: editAnniversary || undefined,
                        late: editLate || undefined
                      });
                      setIsEditingDetails(false);
                    }}
                  >
                    {t("save")}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setEditName(person.name || "");
                      setEditHi(person.hi || "");
                      setEditGender(person.g || "M");
                      setEditDob(person.dob || "");
                      setEditCity(person.city || "");
                      setEditAnniversary(person.anniversary || "");
                      setEditLate(Boolean(person.late));
                      setIsEditingDetails(false);
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h2 id="sh-name" style={{ margin: 0 }}>{name}</h2>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ fontSize: "11px", height: "24px", padding: "0 8px", borderRadius: "12px" }}
                      onClick={() => setIsEditingDetails(true)}
                    >
                      ✎ {lang === "hi" ? "विवरण बदलें" : "Edit Profile"}
                    </button>
                  )}
                </div>
                {person.late && <span className="tag" style={{ marginTop: "4px" }}>{t("lateWord")}</span>}
                {relationWithViewer && (
                  <div className="rel">
                    {relationWithViewer[0]}
                    {relationWithViewer[1] && (
                      <span className="muted"> · {relationWithViewer[1]}</span>
                    )}
                  </div>
                )}
                {(person.dob || person.anniversary || person.city) && (
                  <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", fontSize: "12px", marginTop: "6px" }}>
                    {person.dob && <span>🎂 {person.dob}</span>}
                    {person.anniversary && <span>💍 {person.anniversary}</span>}
                    {person.city && <span>📍 {person.city}</span>}
                  </div>
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
        {canEdit && (
          <div className="row" style={{ marginBottom: "14px", gap: "8px" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
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
        )}

        {/* Note / Bio */}
        <div className="field" style={{ marginBottom: "16px" }}>
          <label htmlFor="sh-note">{t("note")}</label>
          {canEdit && editingNote ? (
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
              style={{
                margin: "4px 0",
                cursor: canEdit ? "pointer" : "default",
                color: person.note ? "inherit" : "var(--muted)"
              }}
              onClick={() => canEdit && setEditingNote(true)}
            >
              {person.note || (canEdit ? t("notePh") : "—")}
            </p>
          )}
        </div>

        {/* Family Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
          {parents.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span className="muted">{t("parents")}: </span>
              {parents.map((pId, idx) => (
                <button
                  key={pId}
                  type="button"
                  className="chip"
                  style={{ marginRight: "4px" }}
                  onClick={() => open(pId)}
                >
                  {displayName(pId)}
                </button>
              ))}
              {canEdit && onUnlinkParents && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: "11px", height: "24px", padding: "0 6px", color: "var(--red, #ef4444)" }}
                  title={lang === "hi" ? "माता-पिता से हटाएं" : "Unlink from parents"}
                  onClick={() => onUnlinkParents(person.id)}
                >
                  ✕ {lang === "hi" ? "माता-पिता से हटाएं" : "Unlink Parents"}
                </button>
              )}
            </div>
          )}

          {spouseId && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span className="muted">{t("spouse")}: </span>
              <button
                type="button"
                className="chip"
                onClick={() => open(spouseId)}
              >
                {displayName(spouseId)}
              </button>
              {canEdit && onUnlinkSpouse && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: "11px", height: "24px", padding: "0 6px", color: "var(--red, #ef4444)" }}
                  title={lang === "hi" ? "जीवनसाथी हटाएं (अनलिंक करें)" : "Unlink spouse"}
                  onClick={() => onUnlinkSpouse(person.id, spouseId)}
                >
                  ✕ {lang === "hi" ? "अनलिंक करें" : "Unlink"}
                </button>
              )}
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

        {/* Quick Add Relations & Danger Zone (only shown when user can edit this tree) */}
        {canEdit ? (
          <>
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
          </>
        ) : (
          <p className="muted" style={{ marginTop: "18px", fontSize: "12px" }}>
            {t("readOnlyBadge")}
          </p>
        )}
      </div>
    </div>
  );
}

export default Sheet;
