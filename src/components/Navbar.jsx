import React, { useState } from 'react';
import SettingsPopover from './SettingsPopover.jsx';
import { isFirebaseConfigured } from '../services/firebase.js';

export function Navbar({
  currentView,
  setCurrentView,
  memberCount,
  generationCount,
  activeTreeId,
  activeTreeTitle,
  isOwner,
  user,
  onOpenAuth,
  onSignOut,
  onOpenTreesModal,
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
  const [copied, setCopied] = useState(false);
  const cloudConfigured = isFirebaseConfigured();

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

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
          <span className="brand-title">{activeTreeTitle || 'GUPTA FAMILY TREE'}</span>
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
        <button
          type="button"
          className="nav-tab"
          onClick={onOpenTreesModal}
        >
          {t('landCtaCreate')}
        </button>
      </div>

      <div className="nav-actions">
        <span className="stats-badge">
          {t('statsBadge', memberCount, generationCount)} ·{' '}
          {isOwner ? t('ownerBadge') : t('readOnlyBadge')}
        </span>

        {(!activeTreeId || cloudConfigured) && (
          <button
            type="button"
            className="zbtn nav-action-btn"
            onClick={copyShareLink}
            title={t('shareTreeBtn')}
          >
            {copied ? t('linkCopied') : t('shareTreeBtn')}
          </button>
        )}

        {user ? (
          <div className="nav-user">
            <span className="user-pill" title={user.email}>
              {user.displayName}
            </span>
            <button type="button" className="zbtn nav-action-btn" onClick={onSignOut}>
              {t('signOut')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn nav-action-btn" onClick={onOpenAuth}>
            {t('signIn')}
          </button>
        )}

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
