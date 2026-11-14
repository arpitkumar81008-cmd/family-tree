import React, { useState, useEffect, useRef } from 'react';
import SettingsPopover from './SettingsPopover.jsx';
import { isFirebaseConfigured } from '../services/firebase.js';
import {
  buildPrivateShareUrl,
  generatePrivateShareToken,
  updateTreeSharingSettings
} from '../services/treeSync.js';

export function Navbar({
  currentView = 'home',
  setCurrentView,
  memberCount,
  generationCount,
  activeTreeId = '',
  activeTreeTitle = '',
  activeTreeMeta = null,
  isPrivateTree,
  hasPrivateTree,
  isOwner,
  user = null,
  onOpenAuth,
  onSignOut,
  onOpenTreesModal,
  onOpenShareModal,
  onCreatePrivateTree,
  onEnsurePrivateShareLink,
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
  viewportMode = 'auto',
  setViewportMode,
  isSettingsOpen = false,
  setIsSettingsOpen
}) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const rafIdRef = useRef(null);
  const navRef = useRef(null);
  const isCollapsedRef = useRef(isCollapsed);
  const isSettingsOpenRef = useRef(isSettingsOpen);
  const viewportModeRef = useRef(viewportMode);

  // Keep ref mirrors synchronized with latest values
  isCollapsedRef.current = isCollapsed;
  isSettingsOpenRef.current = isSettingsOpen;
  viewportModeRef.current = viewportMode;

  const cloudConfigured = isFirebaseConfigured();

  // Helper to determine mobile viewport status
  const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;
    if (typeof document !== 'undefined' && document.documentElement) {
      const docAttr = document.documentElement.getAttribute('data-viewport');
      if (docAttr === 'laptop') return false;
      if (docAttr === 'mobile') return true;
    }
    if (viewportModeRef.current === 'laptop') return false;
    if (viewportModeRef.current === 'mobile') return true;
    return typeof window.innerWidth === 'number' && window.innerWidth <= 768;
  };

  // Immediate reveal when settings popover is open
  useEffect(() => {
    if (isSettingsOpen) {
      setIsCollapsed(false);
    }
  }, [isSettingsOpen]);

  // Immediate reveal and scroll sync when view changes
  useEffect(() => {
    setIsCollapsed(false);
    if (typeof window !== 'undefined') {
      lastScrollYRef.current = Math.max(0, window.scrollY || 0);
    }
  }, [currentView]);

  // Immediate reveal when switching away from mobile mode
  useEffect(() => {
    if (!checkIsMobile()) {
      setIsCollapsed(false);
    }
  }, [viewportMode]);

  // Scroll listener for mobile viewport with hysteresis, boundary guards, and SSR safety
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Cross-environment animation frame helpers (safe in Node.js test runner)
    const requestAnimFrame = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame
      : (cb) => setTimeout(cb, 16);

    const cancelAnimFrame = typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame
      : (id) => clearTimeout(id);

    // Initialize lastScrollY to current scroll position
    lastScrollYRef.current = Math.max(
      0,
      window.scrollY !== undefined
        ? window.scrollY
        : (window.pageYOffset !== undefined
          ? window.pageYOffset
          : (document.documentElement ? document.documentElement.scrollTop : 0))
    );

    const handleScroll = () => {
      if (tickingRef.current) return;

      tickingRef.current = true;
      rafIdRef.current = requestAnimFrame(() => {
        tickingRef.current = false;

        // 1. Viewport check: Never collapse on desktop / laptop
        if (!checkIsMobile()) {
          if (isCollapsedRef.current) {
            setIsCollapsed(false);
          }
          return;
        }

        // 2. Settings popover guard: Never collapse while Settings popover is open
        if (isSettingsOpenRef.current) {
          if (isCollapsedRef.current) {
            setIsCollapsed(false);
          }
          return;
        }

        // 3. Focus-within guard: Never collapse while an element inside nav has keyboard focus
        if (
          typeof document !== 'undefined' &&
          document.activeElement &&
          navRef.current &&
          navRef.current.contains(document.activeElement)
        ) {
          if (isCollapsedRef.current) {
            setIsCollapsed(false);
          }
          return;
        }

        // 4. Current scroll position with fallback and rubber-band clamp
        const rawScrollY = window.scrollY !== undefined
          ? window.scrollY
          : (window.pageYOffset !== undefined
            ? window.pageYOffset
            : (document.documentElement ? document.documentElement.scrollTop : 0));

        const maxScroll = typeof document !== 'undefined' && document.documentElement
          ? Math.max(0, document.documentElement.scrollHeight - (window.innerHeight || 0))
          : Infinity;

        const currentScrollY = Math.max(0, Math.min(rawScrollY, maxScroll));

        // 5. Top-of-page boundary guard: If currentScrollY <= 10px, always keep visible
        if (currentScrollY <= 10) {
          if (isCollapsedRef.current) {
            setIsCollapsed(false);
          }
          lastScrollYRef.current = currentScrollY;
          return;
        }

        // 6. Hysteresis threshold: 12px deadzone
        const lastScrollY = lastScrollYRef.current;
        const delta = currentScrollY - lastScrollY;

        if (Math.abs(delta) < 12) {
          return;
        }

        // 7. Directional collapse/reveal:
        // delta > 12: scrolling upwards (finger moving up, scrollY increasing into page) -> collapse
        // delta < -12: scrolling downwards (finger moving down, scrollY decreasing toward top) -> reveal
        if (delta > 12) {
          if (!isCollapsedRef.current) {
            setIsCollapsed(true);
          }
          lastScrollYRef.current = currentScrollY;
        } else if (delta < -12) {
          if (isCollapsedRef.current) {
            setIsCollapsed(false);
          }
          lastScrollYRef.current = currentScrollY;
        }
      });
    };

    const handleResize = () => {
      if (!checkIsMobile() && isCollapsedRef.current) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafIdRef.current) {
        cancelAnimFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleFocus = () => {
    setIsCollapsed(false);
  };

  const translate = typeof t === 'function' ? t : ((key, ...args) => {
    if (key === 'badgeViewingTree' && args[0]) return `Viewing: ${args[0]}`;
    if (key === 'statsBadge' && args[0] !== undefined) return `${args[0]} members · ${args[1]} generations`;
    return key;
  });

  const tr = (key, fallback) => {
    const res = translate(key);
    return !res || res === key ? fallback : res;
  };

  const isHome = currentView === 'home';
  const isDemo = currentView === 'tree' && (!activeTreeId || activeTreeId === '');
  const isMyTree = currentView === 'tree' && Boolean(activeTreeId && activeTreeId.trim() !== '');
  const isPrivateTreePage = currentView === 'tree' && Boolean(activeTreeId && activeTreeId.trim() !== '');

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

  const showDemoTab = hasPrivateTree !== true;
  const showMyTreeTab = hasPrivateTree !== false;
  const showCreatePrivateCta = hasPrivateTree === false;

  const handleCreatePrivateClick = () => {
    if (onCreatePrivateTree) {
      onCreatePrivateTree();
    } else if (onOpenTreesModal) {
      onOpenTreesModal();
    } else if (onOpenAuth && !user) {
      onOpenAuth();
    }
  };

  const copyShareLink = async () => {
    if (isPrivate && activeTreeId) {
      try {
        let shareUrl = '';
        if (onEnsurePrivateShareLink) {
          const res = await onEnsurePrivateShareLink(activeTreeId);
          if (typeof res === 'string') {
            shareUrl = res.includes('view=tree') ? res : buildPrivateShareUrl(activeTreeId, res);
          } else if (res && typeof res === 'object') {
            shareUrl = res.url || buildPrivateShareUrl(activeTreeId, res.shareCode || '');
          }
        } else {
          let code = (activeTreeMeta?.shareCode || '').trim().toUpperCase();
          if (!code && isOwnerTree && user?.uid) {
            code = generatePrivateShareToken();
            await updateTreeSharingSettings(
              activeTreeId,
              { shareCode: code, shareCodeRole: activeTreeMeta?.shareCodeRole || 'viewer' },
              user
            );
          }
          shareUrl = buildPrivateShareUrl(activeTreeId, code);
        }
        if (shareUrl && navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
      return;
    }

    if (onOpenShareModal) {
      onOpenShareModal();
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <nav
      ref={navRef}
      className={`site-nav${isCollapsed ? ' is-collapsed' : ''}`}
      aria-label="Primary"
      aria-hidden={isCollapsed}
      onFocus={handleFocus}
    >
      <button
        type="button"
        className="nav-brand"
        onClick={handleHomeClick}
        aria-label={translate('navHome')}
      >
        <span className="brand-crest" aria-hidden="true">
          <img src="/images/tree-logo.png" alt="" className="brand-crest-img" />
        </span>
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

        {showDemoTab && (
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
        )}

        {showMyTreeTab && (
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
        )}
      </div>

      <div className="nav-actions">
        {showCreatePrivateCta && (
          <button
            id="nav-btn-create-private"
            data-testid="nav-btn-create-private"
            type="button"
            className="btn nav-action-btn nav-create-private-cta"
            onClick={handleCreatePrivateClick}
          >
            {tr('navCreatePrivateCta', lang === 'hi' ? 'अपना वृक्ष बनाएँ' : 'Build your own tree')}
          </button>
        )}
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

        {isPrivateTreePage && (
          <button
            type="button"
            className="zbtn nav-action-btn"
            onClick={copyShareLink}
            title={translate('shareModalTitle')}
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
          <svg
            className="github-icon"
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385 0.6 0.113 0.82-0.258 0.82-0.577 0-0.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.546-1.385-1.335-1.755-1.335-1.755-1.087-0.744 0.084-0.729 0.084-0.729 1.205 0.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495 0.998 0.108-0.776 0.417-1.305 0.76-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.105-3.176 0 0 1.005-0.322 3.3 1.23 0.96-0.267 1.98-0.399 3-0.405 1.02 0.006 2.04 0.138 3 0.405 2.28-1.552 3.285-1.23 3.285-1.23 0.645 1.653 0.24 2.873 0.12 3.176 0.765 0.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92 0.42 0.36 0.81 1.096 0.81 2.22 0 1.606-0.015 2.896-0.015 3.286 0 0.315 0.21 0.69 0.825 0.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
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
            onClick={() => setIsSettingsOpen && setIsSettingsOpen(prev => !prev)}
          >
            ⋮
          </button>
          <SettingsPopover
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen && setIsSettingsOpen(false)}
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
