import React, { useState } from 'react';
import SettingsPopover from './SettingsPopover.jsx';
import { isFirebaseConfigured } from '../services/firebase.js';

export function Navbar({
  currentView = 'home',
  setCurrentView,
  memberCount,
  generationCount,
  activeTreeId = '',
  activeTreeTitle = '',
  activeTreeMeta = null,
  isPrivateTree,
  isOwner,
  user = null,
  onOpenAuth,
  onSignOut,
  onOpenTreesModal,
  onNavigateHome,
  onNavigateDemo,
  onNavigateMyTree,
  onSwitchView,
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
  viewportMode,
  setViewportMode,
  isSettingsOpen,
  setIsSettingsOpen
}) {
  const [copied, setCopied] = useState(false);
  const cloudConfigured = isFirebaseConfigured();

  const translate = typeof t === 'function' ? t : ((key, ...args) => {
    if (key === 'badgeViewingTree' && args[0]) return `Viewing: ${args[0]}`;
    if (key === 'statsBadge' && args[0] !== undefined) return `${args[0]} members · ${args[1]} generations`;
    return key;
  });

  const isHome = currentView === 'home';
  const isDemo = currentView === 'tree' && (!activeTreeId || activeTreeId === '');
  const isMyTree = currentView === 'tree' && Boolean(activeTreeId && activeTreeId.trim() !== '');

  const handleHomeClick = () => {
    if (isHome) return;
    if (onNavigateHome) {
      onNavigateHome();
    } else if (setCurrentView) {
      setCurrentView('home');
    }
  };

  const handleDemoClick = () => {
    if (isDemo) return;
    if (onNavigateDemo) {
      onNavigateDemo();
    } else if (setCurrentView) {
      setCurrentView('tree');
    }
  };

  const handleMyTreeClick = () => {
    if (isMyTree) return;
    if (onNavigateMyTree) {
      onNavigateMyTree();
    } else if (onOpenTreesModal) {
      onOpenTreesModal();
    } else if (setCurrentView) {
      setCurrentView('tree');
    }
  };

  const isDemoTree = !activeTreeId || activeTreeId === '';
  const resolvedTitle = (activeTreeMeta?.title || activeTreeTitle || '').trim();
  const isOwnerTree = Boolean(
    !isDemoTree && (isOwner ?? (user && activeTreeMeta && (activeTreeMeta.ownerUid === user.uid || activeTreeMeta.ownerId === user.uid)))
  );
  const isPrivate = Boolean(
    !isDemoTree && (isPrivateTree ?? (activeTreeMeta && activeTreeMeta.isPublic === false))
  );

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
        onClick={handleHomeClick}
        aria-label={translate('navHome')}
      >
        <span className="brand-crest" aria-hidden="true">V</span>
        <span className="brand-text">
          <span className="brand-title">
            {currentView === 'home'
              ? 'FAMILY TREE'
              : (resolvedTitle || 'FAMILY TREE')}
          </span>
          <span className="brand-sub">{translate('navBrandSub')}</span>
        </span>
      </button>

      <div
        className="nav-center nav-view-switcher"
        role="tablist"
        aria-label="View Switcher"
        data-testid="nav-view-switcher"
      >
        <button
          id="nav-btn-home"
          data-testid="nav-btn-home"
          type="button"
          role="tab"
          aria-selected={isHome}
          aria-current={isHome ? 'page' : undefined}
          className={`nav-tab${isHome ? ' active' : ''}`}
          aria-label={translate('navHome')}
          onClick={handleHomeClick}
        >
          {translate('navHome')}
        </button>

        <button
          id="nav-btn-demo"
          data-testid="nav-btn-demo"
          type="button"
          role="tab"
          aria-selected={isDemo}
          aria-current={isDemo ? 'page' : undefined}
          className={`nav-tab${isDemo ? ' active' : ''}`}
          aria-label={translate('navDemoTree')}
          onClick={handleDemoClick}
        >
          {translate('navDemoTree')}
        </button>

        <button
          id="nav-btn-mytree"
          data-testid="nav-btn-mytree"
          type="button"
          role="tab"
          aria-selected={isMyTree}
          aria-current={isMyTree ? 'page' : undefined}
          className={`nav-tab${isMyTree ? ' active' : ''}`}
          aria-label={translate('navMyTree')}
          onClick={handleMyTreeClick}
        >
          {translate('navMyTree')}
        </button>
      </div>

      <div className="nav-actions">
        {currentView !== 'home' && (
          <span
            className="stats-badge nav-status-badge active-tree-badge"
            data-testid="nav-status-badge"
            role="status"
            aria-live="polite"
          >
            {typeof memberCount === 'number' && typeof generationCount === 'number' && (
              <span className="badge-stats">
                {translate('statsBadge', memberCount, generationCount)} ·{' '}
              </span>
            )}
            <span
              className="badge-context"
              title={resolvedTitle || (isDemoTree ? translate('badgeDemoTree') : translate('badgePrivateTree'))}
            >
              {isDemoTree
                ? translate('badgeDemoTree')
                : resolvedTitle
                ? translate('badgeViewingTree', resolvedTitle)
                : translate('badgePrivateTree')}
            </span>
            {!isDemoTree && (
              <span className="badge-access">
                {' '}· {isPrivate ? translate('privateBadge') : isOwnerTree ? translate('ownerBadge') : translate('readOnlyBadge')}
              </span>
            )}
          </span>
        )}

        {(!activeTreeId || cloudConfigured) && (
          <button
            type="button"
            className="zbtn nav-action-btn"
            onClick={copyShareLink}
            title={translate('shareTreeBtn')}
          >
            {copied ? translate('linkCopied') : translate('shareTreeBtn')}
          </button>
        )}

        <a
          href="https://github.com/arpitkumar81008-cmd"
          target="_blank"
          rel="noopener noreferrer"
          className="zbtn nav-action-btn nav-github-link"
          title="GitHub · arpitkumar81008-cmd"
          aria-label="GitHub profile (arpitkumar81008-cmd)"
        >
          GitHub ↗
        </a>

        {user ? (
          <div className="nav-user">
            <span className="user-pill" title={user.email}>
              {user.displayName}
            </span>
            <button type="button" className="zbtn nav-action-btn" onClick={onSignOut}>
              {translate('signOut')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn nav-action-btn" onClick={onOpenAuth}>
            {translate('signIn')}
          </button>
        )}

        <div className="settings-wrap">
          <button
            type="button"
            className="settings-btn"
            aria-label={translate('settingsBtnAria')}
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
            viewportMode={viewportMode}
            setViewportMode={setViewportMode}
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
