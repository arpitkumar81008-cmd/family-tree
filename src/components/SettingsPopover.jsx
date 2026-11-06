import React, { useEffect, useRef } from 'react';

export function SettingsPopover({
  isOpen,
  onClose,
  theme,
  setTheme,
  textSize,
  setTextSize,
  contrast,
  setContrast,
  motion,
  setMotion,
  lang,
  setLang,
  t
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = e => {
      if (e.key === "Escape") onClose();
    };
    const handleClickOutside = e => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="settings-popover"
      role="dialog"
      aria-modal="true"
      aria-label={t("settingsTitle")}
    >
      <div className="settings-head">
        <h3>{t("settingsTitle")}</h3>
        <button
          className="settings-close"
          type="button"
          aria-label={t("close")}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* Language */}
      <div className="settings-group">
        <span className="lbl">{t("langLabel")}</span>
        <div className="settings-seg">
          <button
            type="button"
            className="zbtn"
            aria-pressed={lang === "en"}
            onClick={() => setLang("en")}
          >
            English
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={lang === "hi"}
            onClick={() => setLang("hi")}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="settings-group">
        <span className="lbl">{t("themeLabel")}</span>
        <div className="settings-seg">
          <button
            type="button"
            className="zbtn"
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
          >
            {t("themeLight")}
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
          >
            {t("themeDark")}
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={theme === "system"}
            onClick={() => setTheme("system")}
          >
            {t("themeSystem")}
          </button>
        </div>
      </div>

      {/* Text Size */}
      <div className="settings-group">
        <span className="lbl">{t("textSizeLabel")}</span>
        <div className="settings-seg">
          <button
            type="button"
            className="zbtn"
            aria-pressed={textSize === "normal"}
            onClick={() => setTextSize("normal")}
          >
            {t("textDefault")}
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={textSize === "large"}
            onClick={() => setTextSize("large")}
          >
            {t("textLarge")}
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={textSize === "xlarge"}
            onClick={() => setTextSize("xlarge")}
          >
            {t("textXLarge")}
          </button>
        </div>
      </div>

      {/* High Contrast */}
      <div className="settings-group">
        <span className="lbl">{t("contrastLabel")}</span>
        <div className="settings-seg">
          <button
            type="button"
            className="zbtn"
            aria-pressed={contrast === "normal"}
            onClick={() => setContrast("normal")}
          >
            {t("off")}
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={contrast === "high"}
            onClick={() => setContrast("high")}
          >
            {t("on")}
          </button>
        </div>
      </div>

      {/* Reduced Motion */}
      <div className="settings-group">
        <span className="lbl">{t("motionLabel")}</span>
        <div className="settings-seg">
          <button
            type="button"
            className="zbtn"
            aria-pressed={motion === "normal"}
            onClick={() => setMotion("normal")}
          >
            {t("off")}
          </button>
          <button
            type="button"
            className="zbtn"
            aria-pressed={motion === "reduce"}
            onClick={() => setMotion("reduce")}
          >
            {t("on")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPopover;
