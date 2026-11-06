import React from 'react';
import SettingsPopover from './SettingsPopover.jsx';

export function Navbar({
  currentView,
  setCurrentView,
  memberCount,
  generationCount,
  t,
  lang,
  setLang,
  theme,
  setTheme,
  textSize,
  setTextSize,
  contrast,
  setContrast,
  motion,
  setMotion,
  isSettingsOpen,
  setIsSettingsOpen
}) {
  return (
    <nav className="site-nav" aria-label="Primary">
      <button
        type="button"
        className="nav-brand"
        onClick={() => setCurrentView('home')}
        aria-label={t('navHome')}
      >
        <span className="brand-crest" aria-hidden="true">G</span>
        <span className="brand-text">
          <span className="brand-title">GUPTA FAMILY TREE</span>
          <span className="brand-sub">{t('navBrandSub')}</span>
        </span>
      </button>

      <div className="nav-center" role="tablist" aria-label="View">
        {[
          ['home', 'navHome'],
          ['tree', 'navTree']
        ].map(([id, key]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={currentView === id}
            className={`nav-tab${currentView === id ? ' active' : ''}`}
            onClick={() => setCurrentView(id)}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <div className="nav-actions">
        <span className="stats-badge">{t('statsBadge', memberCount, generationCount)}</span>
        <div className="settings-wrap">
          <button
            type="button"
            className="settings-btn"
            aria-label={t('settingsBtnAria')}
            aria-expanded={isSettingsOpen}
            aria-haspopup="dialog"
            onClick={() => setIsSettingsOpen(prev => !prev)}
          >
            ⋮
          </button>
          <SettingsPopover
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            theme={theme}
            setTheme={setTheme}
            textSize={textSize}
            setTextSize={setTextSize}
            contrast={contrast}
            setContrast={setContrast}
            motion={motion}
            setMotion={setMotion}
            lang={lang}
            setLang={setLang}
            t={t}
          />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
