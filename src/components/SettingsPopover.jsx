import React, { useEffect, useRef } from 'react';

export function SettingsPopover({
  isOpen = false,
  onClose,
  theme = 'system',
  setTheme,
  textSize = 'normal',
  setTextSize,
  contrast = 'normal',
  setContrast,
  motion = 'normal',
  setMotion,
  viewportMode = 'auto',
  setViewportMode,
  lang = 'en',
  setLang,
  t
}) {
  const popoverRef = useRef(null);
  const translate = typeof t === 'function' ? t : (key => key);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const firstFocusable = popoverRef.current?.querySelector?.(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled])'
    );
    firstFocusable?.focus?.();
    const handleKeyDown = e => {
      if (e.key === "Escape") onClose?.();
    };
    const handleClickOutside = e => {
      const target = e.target;
      if (
        target?.closest?.('.settings-btn, [data-settings-toggle], .mobile-nav-btn[aria-haspopup="dialog"]')
      ) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose?.();
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
      aria-label={translate("settingsTitle")}
    >
      <div className="settings-head">
        <div className="settings-head-title">
          <span className="settings-head-icon" aria-hidden="true">⚙</span>
          <h3>{translate("settingsTitle")}</h3>
        </div>
        <button
          className="settings-close"
          type="button"
          aria-label={translate("close")}
          onClick={() => onClose?.()}
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
          <span className="lbl">{translate("langLabel")}</span>
          <div className="settings-seg">
            <button
              type="button"
              className="zbtn"
              aria-pressed={lang === "en"}
              onClick={() => setLang?.("en")}
            >
              English
            </button>
            <button
              type="button"
              className="zbtn"
              aria-pressed={lang === "hi"}
              onClick={() => setLang?.("hi")}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Display / Visibility Mode (Laptop vs Mobile Optimization) */}
        {setViewportMode && (
          <div className="settings-group">
            <span className="lbl">{translate("viewportLabel")}</span>
            <div className="settings-seg">
              <button
                type="button"
                className="zbtn"
                aria-pressed={viewportMode === "auto"}
                onClick={() => setViewportMode("auto")}
              >
                {translate("viewAuto")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={viewportMode === "laptop"}
                onClick={() => setViewportMode("laptop")}
              >
                💻 {translate("viewLaptop")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={viewportMode === "mobile"}
                onClick={() => setViewportMode("mobile")}
              >
                📱 {translate("viewMobile")}
              </button>
            </div>
          </div>
        )}

        {/* Theme */}
        <div className="settings-group">
          <span className="lbl">{translate("themeLabel")}</span>
          <div className="settings-seg">
            <button
              type="button"
              className="zbtn"
              aria-pressed={theme === "light"}
              onClick={() => setTheme?.("light")}
            >
              {translate("themeLight")}
            </button>
            <button
              type="button"
              className="zbtn"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme?.("dark")}
            >
              {translate("themeDark")}
            </button>
            <button
              type="button"
              className="zbtn"
              aria-pressed={theme === "system"}
              onClick={() => setTheme?.("system")}
            >
              {translate("themeSystem")}
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
          <span className="lbl">{translate("textSizeLabel")}</span>
          <div className="settings-seg">
            <button
              type="button"
              className="zbtn"
              aria-pressed={textSize === "normal"}
              onClick={() => setTextSize?.("normal")}
            >
              {translate("textDefault")}
            </button>
            <button
              type="button"
              className="zbtn"
              aria-pressed={textSize === "large"}
              onClick={() => setTextSize?.("large")}
            >
              {translate("textLarge")}
            </button>
            <button
              type="button"
              className="zbtn"
              aria-pressed={textSize === "xlarge"}
              onClick={() => setTextSize?.("xlarge")}
            >
              {translate("textXLarge")}
            </button>
          </div>
        </div>

        {/* High Contrast & Reduced Motion */}
        <div className="settings-a11y-pair">
          <div className="settings-group">
            <span className="lbl">{translate("contrastLabel")}</span>
            <div className="settings-seg">
              <button
                type="button"
                className="zbtn"
                aria-pressed={contrast === "normal"}
                onClick={() => setContrast?.("normal")}
              >
                {translate("off")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={contrast === "high"}
                onClick={() => setContrast?.("high")}
              >
                {translate("on")}
              </button>
            </div>
          </div>

          <div className="settings-group">
            <span className="lbl">{translate("motionLabel")}</span>
            <div className="settings-seg">
              <button
                type="button"
                className="zbtn"
                aria-pressed={motion === "normal"}
                onClick={() => setMotion?.("normal")}
              >
                {translate("off")}
              </button>
              <button
                type="button"
                className="zbtn"
                aria-pressed={motion === "reduce"}
                onClick={() => setMotion?.("reduce")}
              >
                {translate("on")}
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
