import React from 'react';

export function MobileBottomNav({
  currentView = 'home',
  activeTreeId = '',
  onNavigateHome,
  onNavigateDemo,
  onNavigateMyTree,
  onToggleMenu,
  isMenuOpen = false,
  t
}) {
  const tr = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);

  const isHomeActive = currentView === 'home';
  const isDemoActive = currentView === 'tree' && !activeTreeId;
  const isMyTreeActive = currentView === 'tree' && Boolean(activeTreeId);

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

      <button
        type="button"
        className={`mobile-nav-btn ${isDemoActive ? 'active' : ''}`}
        aria-current={isDemoActive ? 'page' : undefined}
        onClick={() => onNavigateDemo && onNavigateDemo()}
      >
        <span className="mobile-nav-icon" aria-hidden="true">❖</span>
        <span className="mobile-nav-label">{tr('mobileNavDemo', 'Demo')}</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${isMyTreeActive ? 'active' : ''}`}
        aria-current={isMyTreeActive ? 'page' : undefined}
        onClick={() => onNavigateMyTree && onNavigateMyTree()}
      >
        <span className="mobile-nav-icon" aria-hidden="true">🌳</span>
        <span className="mobile-nav-label">{tr('mobileNavMyTree', 'My Tree')}</span>
      </button>

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
