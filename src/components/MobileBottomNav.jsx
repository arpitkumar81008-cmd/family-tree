import React from 'react';

export function MobileBottomNav({
  currentView = 'home',
  activeTreeId = '',
  hasPrivateTree,
  onNavigateHome,
  onNavigateDemo,
  onNavigateMyTree,
  onCreatePrivateTree,
  onToggleMenu,
  isMenuOpen = false,
  t
}) {
  const tr = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const res = t(key);
    return !res || res === key ? fallback : res;
  };

  const isHomeActive = currentView === 'home';
  const isDemoActive = currentView === 'tree' && !activeTreeId;
  const isMyTreeActive = currentView === 'tree' && Boolean(activeTreeId);

  const showDemoBtn = hasPrivateTree !== true;
  const showMyTreeBtn = hasPrivateTree !== false;
  const showCreateBtn = hasPrivateTree === false;

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label={tr('navSwitchView', 'Switch workspace view')}
    >
      <button
        type="button"
        className={`mobile-nav-btn ${isHomeActive ? 'active' : ''}`}
        aria-current={isHomeActive ? 'page' : undefined}
        onClick={() => onNavigateHome && onNavigateHome()}
      >
        <span className="mobile-nav-icon" aria-hidden="true">⌂</span>
        <span className="mobile-nav-label">{tr('mobileNavHome', 'Home')}</span>
      </button>

      {showDemoBtn && (
        <button
          type="button"
          className={`mobile-nav-btn ${isDemoActive ? 'active' : ''}`}
          aria-current={isDemoActive ? 'page' : undefined}
          onClick={() => onNavigateDemo && onNavigateDemo()}
        >
          <span className="mobile-nav-icon" aria-hidden="true">❖</span>
          <span className="mobile-nav-label">{tr('mobileNavDemo', 'Demo')}</span>
        </button>
      )}

      {showMyTreeBtn && (
        <button
          type="button"
          className={`mobile-nav-btn ${isMyTreeActive ? 'active' : ''}`}
          aria-current={isMyTreeActive ? 'page' : undefined}
          onClick={() => onNavigateMyTree && onNavigateMyTree()}
        >
          <span className="mobile-nav-icon" aria-hidden="true">🌳</span>
          <span className="mobile-nav-label">{tr('mobileNavMyTree', 'My Tree')}</span>
        </button>
      )}

      {showCreateBtn && (
        <button
          type="button"
          className="mobile-nav-btn mobile-nav-create-btn"
          onClick={() => (onCreatePrivateTree ? onCreatePrivateTree() : onNavigateMyTree && onNavigateMyTree())}
        >
          <span className="mobile-nav-icon" aria-hidden="true">✨</span>
          <span className="mobile-nav-label">{tr('mobileNavCreatePrivate', 'Create')}</span>
        </button>
      )}

      <button
        type="button"
        className={`mobile-nav-btn ${isMenuOpen ? 'active' : ''}`}
        aria-expanded={isMenuOpen}
        onClick={() => onToggleMenu && onToggleMenu()}
      >
        <span className="mobile-nav-icon" aria-hidden="true">⚙</span>
        <span className="mobile-nav-label">{tr('mobileNavMenu', 'Menu')}</span>
      </button>
    </nav>
  );
}

export default MobileBottomNav;
