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
  viewportMode = 'auto',
  setViewportMode,
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

  const isHi = lang === "hi";
  const hasCustomSettings =
    theme !== "system" ||
    textSize !== "normal" ||
    contrast !== "normal" ||
    motion !== "normal" ||
    viewportMode !== "auto";

  const handleResetDefaults = () => {
    setTheme?.("system");
    setTextSize?.("normal");
    setContrast?.("normal");
    setMotion?.("normal");
    setViewportMode?.("auto");
  };

  return (
    <div
      ref={popoverRef}
      className="settings-popover"
      role="dialog"
      aria-modal="true"
      aria-label={t("settingsTitle")}
    >
      <div className="settings-head">
        <div className="settings-head-title">
          <span className="settings-head-icon" aria-hidden="true">⚙</span>
          <h3>{t("settingsTitle")}</h3>
        </div>
        <button
          className="settings-close"
          type="button"
          aria-label={t("close")}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {isHi ? "भाषा और प्रदर्शन" : "Display & Language"}
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

        {/* Display / Visibility Mode (Laptop vs Mobile Optimization) */}
        {setViewportMode && (
          <div className="settings-group">
            <span className="lbl">{t("viewportLabel")}</span>
            <div className="settings-seg">
              <button
                type="button"
                className="zbtn"
                aria-pressed={viewportMode === "auto"}
                onClick={() => setViewportMode("auto")}
              >
                {t("viewAuto")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={viewportMode === "laptop"}
                onClick={() => setViewportMode("laptop")}
              >
                💻 {t("viewLaptop")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={viewportMode === "mobile"}
                onClick={() => setViewportMode("mobile")}
              >
                📱 {t("viewMobile")}
              </button>
            </div>
          </div>
        )}

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
              ☀️ {t("themeLight")}
            </button>
            <button
              type="button"
              className="zbtn"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              🌙 {t("themeDark")}
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
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {isHi ? "सुगम्यता (Accessibility)" : "Accessibility"}
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

        {/* High Contrast & Reduced Motion */}
        <div className="settings-a11y-pair">
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
      </div>

      {hasCustomSettings && (
        <div className="settings-foot">
          <button
            type="button"
            className="settings-reset-btn"
            onClick={handleResetDefaults}
          >
            ↺ {isHi ? "डिफ़ॉल्ट पर रीसेट करें" : "Reset to defaults"}
          </button>
        </div>
      )}
    </div>
  );
}

export default SettingsPopover;
