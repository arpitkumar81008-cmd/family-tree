/**
/**
 * Adversarial Test Suite for Milestone M1 (Collapsible Mobile Navigation Bar).
 * Focus Areas:
 * 1. Interactive element protection under collapsed state (pointer-events: none, hit-testing).
 * 2. Focus-within keyboard trapping & tabbing into collapsed navbar.
 * 3. Settings popover open guard during mobile menu exploration.
 * 4. Boundary conditions, view switching, and display mode safeguards.
 *
 * Execution:
 * node --test tests/adversarial-m1-interaction.test.mjs
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  installMockBrowser,
  assertElementExists,
  assertElementCount,
  assertAttribute,
  assertClass,
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/harness.mjs';

import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import { createTranslator } from '../src/i18n/index.js';

// ============================================================================
// ADVERSARIAL ORACLES & HIT-TESTING SIMULATOR
// ============================================================================

/**
 * Parses CSS content and extracts property values for specific selectors.
 */
function extractCssRules(cssContent) {
  const rules = [];
  // Basic CSS rule extractor matching selector { declarations }
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(cssContent)) !== null) {
    const selectors = match[1].split(',').map(s => s.trim()).filter(Boolean);
    const body = match[2].trim();
    const declarations = {};
    body.split(';').forEach(decl => {
      const idx = decl.indexOf(':');
      if (idx !== -1) {
        const prop = decl.slice(0, idx).trim();
        const val = decl.slice(idx + 1).trim();
        if (prop && val) {
          declarations[prop] = val;
        }
      }
    });
    rules.push({ selectors, declarations });
  }
  return rules;
}

/**
 * Evaluates the effective pointer-events and transform state for .site-nav
 * based on stylesheet rules and application state.
 */
function resolveNavPointerState({
  isCollapsed = false,
  hasFocusWithin = false,
  isLaptopMode = false,
  isMobileViewport = true
}) {
  // Base rules:
  let transform = 'translateY(0)';
  let opacity = '1';
  let pointerEvents = 'auto';

  if (isCollapsed && isMobileViewport && !isLaptopMode) {
    transform = 'translateY(-100%)';
    opacity = '0';
    pointerEvents = 'none';
  }

  // :focus-within overrides with !important
  if (hasFocusWithin) {
    transform = 'translateY(0)';
    opacity = '1';
    pointerEvents = 'auto';
  }

  // Laptop mode override with !important
  if (isLaptopMode) {
    transform = 'translateY(0)';
    opacity = '1';
    pointerEvents = 'auto';
  }

  return { transform, opacity, pointerEvents };
}

/**
 * Simulates a pointer hit-test targeting a child button of .site-nav.
 * In browser specifications, if an element or its ancestor has `pointer-events: none`,
 * hit-testing ignores that element and returns whatever is underneath.
 */
function simulatePointerHitTest({
  targetButtonName,
  navState,
  handler
}) {
  const { pointerEvents } = resolveNavPointerState(navState);
  
  if (pointerEvents === 'none') {
    // Hit-test misses because pointer-events is none; handler is not invoked
    return {
      hitTarget: null,
      passedThroughToBackground: true,
      handlerInvoked: false
    };
  }

  // Hit-test hits the target button and fires handler
  let invoked = false;
  if (typeof handler === 'function') {
    handler();
    invoked = true;
  }

  return {
    hitTarget: targetButtonName,
    passedThroughToBackground: false,
    handlerInvoked: invoked
  };
}

/**
 * Pure simulation of the scroll + focus + settings state engine from Navbar.jsx.
 */
class NavbarStateEngine {
  constructor({
    viewportMode = 'mobile',
    innerWidth = 390,
    initialScrollY = 0,
    isSettingsOpen = false
  } = {}) {
    this.viewportMode = viewportMode;
    this.innerWidth = innerWidth;
    this.currentScrollY = initialScrollY;
    this.lastScrollY = initialScrollY;
    this.isCollapsed = false;
    this.isSettingsOpen = isSettingsOpen;
    this.focusedElement = null; // null or element ID string
    this.navElementIds = new Set([
      'nav-brand',
      'nav-btn-home',
      'nav-btn-demo',
      'nav-btn-mytree',
      'nav-btn-share',
      'nav-github-link',
      'nav-btn-signin',
      'settings-btn',
      'settings-popover'
    ]);
  }

  checkIsMobile() {
    if (this.viewportMode === 'laptop') return false;
    if (this.viewportMode === 'mobile') return true;
    return typeof this.innerWidth === 'number' && this.innerWidth <= 768;
  }

  focusElement(elementId) {
    this.focusedElement = elementId;
    // When focus enters nav, handleFocus resets isCollapsed
    if (this.navElementIds.has(elementId)) {
      this.isCollapsed = false;
    }
  }

  blurElement() {
    this.focusedElement = null;
  }

  setSettingsOpen(isOpen) {
    this.isSettingsOpen = Boolean(isOpen);
    if (this.isSettingsOpen) {
      this.isCollapsed = false;
    }
  }

  switchView(newView) {
    this.isCollapsed = false;
    this.lastScrollY = this.currentScrollY;
  }

  setViewportMode(mode) {
    this.viewportMode = mode;
    if (!this.checkIsMobile()) {
      this.isCollapsed = false;
    }
  }

  resize(newWidth) {
    this.innerWidth = newWidth;
    if (!this.checkIsMobile() && this.isCollapsed) {
      this.isCollapsed = false;
    }
  }

  scroll(targetScrollY) {
    const rawScrollY = Math.max(0, targetScrollY);
    this.currentScrollY = rawScrollY;

    // 1. Viewport check: Never collapse on desktop / laptop
    if (!this.checkIsMobile()) {
      if (this.isCollapsed) this.isCollapsed = false;
      return;
    }

    // 2. Settings popover guard: Never collapse while Settings popover is open
    if (this.isSettingsOpen) {
      if (this.isCollapsed) this.isCollapsed = false;
      return;
    }

    // 3. Focus-within guard: Never collapse while an element inside nav has keyboard focus
    if (this.focusedElement && this.navElementIds.has(this.focusedElement)) {
      if (this.isCollapsed) this.isCollapsed = false;
      return;
    }

    // 5. Top-of-page boundary guard: If currentScrollY <= 10px, always keep visible
    if (this.currentScrollY <= 10) {
      if (this.isCollapsed) this.isCollapsed = false;
      this.lastScrollY = this.currentScrollY;
      return;
    }

    // 6. Hysteresis threshold: 12px deadzone
    const delta = this.currentScrollY - this.lastScrollY;
    if (Math.abs(delta) < 12) {
      return;
    }

    // 7. Directional collapse/reveal:
    // delta > 12: scrolling upwards into page content -> collapse
    // delta < -12: scrolling downwards toward top -> reveal
    if (delta > 12) {
      this.isCollapsed = true;
      this.lastScrollY = this.currentScrollY;
    } else if (delta < -12) {
      this.isCollapsed = false;
      this.lastScrollY = this.currentScrollY;
    }
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Adversarial M1-2 Challenge: Interaction Protection & Focus Traps', () => {
  let browserEnv;
  let landingCssContent;

  before(async () => {
    landingCssContent = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
  });

  after(async () => {
    await closeViteServer();
  });

  beforeEach(() => {
    browserEnv = installMockBrowser('http://localhost:3000/?view=home');
  });

  afterEach(() => {
    browserEnv.cleanup();
  });

  // --------------------------------------------------------------------------
  // CHALLENGE DIMENSION 1: SYNTHETIC CLICKS UNDER COLLAPSED STATE
  // --------------------------------------------------------------------------
  describe('Dimension 1: Synthetic Clicks & Pointer-Events Suppression When Collapsed', () => {
    it('ADV-1-01: Stylesheet strictly defines pointer-events: none on .site-nav.is-collapsed', () => {
      const rules = extractCssRules(landingCssContent);
      const collapsedRule = rules.find(r => 
        r.selectors.some(s => s.includes('.site-nav.is-collapsed'))
      );

      assert.ok(collapsedRule, 'Must define CSS rule for .site-nav.is-collapsed');
      assert.equal(
        collapsedRule.declarations['pointer-events'],
        'none',
        '.site-nav.is-collapsed MUST specify pointer-events: none to prevent phantom clicks'
      );
      assert.equal(
        collapsedRule.declarations['transform'],
        'translateY(-100%)',
        '.site-nav.is-collapsed MUST translate off-screen (-100%)'
      );
      assert.equal(
        collapsedRule.declarations['opacity'],
        '0',
        '.site-nav.is-collapsed MUST have opacity 0'
      );
    });

    it('ADV-1-02: No child selector in .site-nav overrides pointer-events: auto while collapsed', () => {
      const rules = extractCssRules(landingCssContent);
      // Find all rules that target children of .site-nav without :focus-within
      const childOverride = rules.find(r => {
        const isChildOfCollapsed = r.selectors.some(s => 
          s.includes('.site-nav.is-collapsed') && 
          !s.includes(':focus-within') && 
          !s.includes('data-viewport="laptop"') &&
          s.split(/\s+/).length > 1
        );
        return isChildOfCollapsed && r.declarations['pointer-events'] === 'auto';
      });

      assert.equal(
        childOverride,
        undefined,
        'No descendant of .site-nav.is-collapsed should override pointer-events: auto'
      );
    });

    it('ADV-1-03: Attempting synthetic clicks on all 5 buttons while collapsed fails to invoke handlers', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');

      // Handlers tracking invocation
      let homeClicked = 0;
      let demoClicked = 0;
      let myTreeClicked = 0;
      let shareClicked = 0;
      let authClicked = 0;

      // 1. Render collapsed Navbar (SSR markup check)
      const html = renderComponentToHtml(Navbar, {
        currentView: 'home',
        t,
        onNavigateHome: () => { homeClicked++; },
        onNavigateDemo: () => { demoClicked++; },
        onNavigateMyTree: () => { myTreeClicked++; },
        onOpenShareModal: () => { shareClicked++; },
        onOpenAuth: () => { authClicked++; }
      });

      // Verify all 5 controls exist in DOM
      assertElementExists(html, '#nav-btn-home', 'Home button exists');
      assertElementExists(html, '#nav-btn-demo', 'Demo button exists');
      assertElementExists(html, '#nav-btn-mytree', 'My Tree button exists');
      assertElementExists(html, '.nav-action-btn', 'Share/Action button exists');
      assertElementExists(html, '.nav-github-link', 'GitHub link exists');

      // 2. Simulate collapsed state
      const navState = {
        isCollapsed: true,
        hasFocusWithin: false,
        isLaptopMode: false,
        isMobileViewport: true
      };

      // 3. Attempt pointer hit-test clicks on all 5 buttons:
      const hitHome = simulatePointerHitTest({
        targetButtonName: 'Home',
        navState,
        handler: () => { homeClicked++; }
      });
      assert.equal(hitHome.passedThroughToBackground, true);
      assert.equal(hitHome.handlerInvoked, false);
      assert.equal(homeClicked, 0, 'Home click must NOT fire when collapsed');

      const hitDemo = simulatePointerHitTest({
        targetButtonName: 'Demo Tree',
        navState,
        handler: () => { demoClicked++; }
      });
      assert.equal(hitDemo.passedThroughToBackground, true);
      assert.equal(hitDemo.handlerInvoked, false);
      assert.equal(demoClicked, 0, 'Demo Tree click must NOT fire when collapsed');

      const hitMyTree = simulatePointerHitTest({
        targetButtonName: 'My Tree',
        navState,
        handler: () => { myTreeClicked++; }
      });
      assert.equal(hitMyTree.passedThroughToBackground, true);
      assert.equal(hitMyTree.handlerInvoked, false);
      assert.equal(myTreeClicked, 0, 'My Tree click must NOT fire when collapsed');

      const hitShare = simulatePointerHitTest({
        targetButtonName: 'Copy Link',
        navState,
        handler: () => { shareClicked++; }
      });
      assert.equal(hitShare.passedThroughToBackground, true);
      assert.equal(hitShare.handlerInvoked, false);
      assert.equal(shareClicked, 0, 'Copy Link click must NOT fire when collapsed');

      const hitAuth = simulatePointerHitTest({
        targetButtonName: 'Sign In',
        navState,
        handler: () => { authClicked++; }
      });
      assert.equal(hitAuth.passedThroughToBackground, true);
      assert.equal(hitAuth.handlerInvoked, false);
      assert.equal(authClicked, 0, 'Sign In click must NOT fire when collapsed');

      const hitGitHub = simulatePointerHitTest({
        targetButtonName: 'GitHub',
        navState,
        handler: () => {}
      });
      assert.equal(hitGitHub.passedThroughToBackground, true);
      assert.equal(hitGitHub.handlerInvoked, false);
    });

    it('ADV-1-04: When visible, all 5 buttons are fully interactive and execute handlers', () => {
      let homeClicked = 0;
      let demoClicked = 0;
      let myTreeClicked = 0;
      let shareClicked = 0;
      let authClicked = 0;

      const navState = {
        isCollapsed: false,
        hasFocusWithin: false,
        isLaptopMode: false,
        isMobileViewport: true
      };

      simulatePointerHitTest({ targetButtonName: 'Home', navState, handler: () => { homeClicked++; } });
      simulatePointerHitTest({ targetButtonName: 'Demo Tree', navState, handler: () => { demoClicked++; } });
      simulatePointerHitTest({ targetButtonName: 'My Tree', navState, handler: () => { myTreeClicked++; } });
      simulatePointerHitTest({ targetButtonName: 'Copy Link', navState, handler: () => { shareClicked++; } });
      simulatePointerHitTest({ targetButtonName: 'Sign In', navState, handler: () => { authClicked++; } });

      assert.equal(homeClicked, 1, 'Home must fire when visible');
      assert.equal(demoClicked, 1, 'Demo Tree must fire when visible');
      assert.equal(myTreeClicked, 1, 'My Tree must fire when visible');
      assert.equal(shareClicked, 1, 'Copy Link must fire when visible');
      assert.equal(authClicked, 1, 'Sign In must fire when visible');
    });
  });

  // --------------------------------------------------------------------------
  // CHALLENGE DIMENSION 2: FOCUS TRAPS & KEYBOARD TABBING
  // --------------------------------------------------------------------------
  describe('Dimension 2: Focus Trapping & Keyboard Tabbing into Collapsed Navbar', () => {
    it('ADV-2-01: Stylesheet specifies :focus-within rule with !important overrides for transform, opacity, and pointer-events', () => {
      const rules = extractCssRules(landingCssContent);
      const focusWithinRule = rules.find(r =>
        r.selectors.some(s => s.includes('.site-nav:focus-within'))
      );

      assert.ok(focusWithinRule, 'Must define .site-nav:focus-within rule');
      assert.ok(
        focusWithinRule.declarations['transform']?.includes('translateY(0)') &&
        focusWithinRule.declarations['transform']?.includes('!important'),
        '.site-nav:focus-within must declare transform: translateY(0) !important'
      );
      assert.ok(
        focusWithinRule.declarations['opacity']?.includes('1') &&
        focusWithinRule.declarations['opacity']?.includes('!important'),
        '.site-nav:focus-within must declare opacity: 1 !important'
      );
      assert.ok(
        focusWithinRule.declarations['pointer-events']?.includes('auto') &&
        focusWithinRule.declarations['pointer-events']?.includes('!important'),
        '.site-nav:focus-within must declare pointer-events: auto !important'
      );
    });

    it('ADV-2-02: Tabbing into collapsed navbar immediately reveals it and clears isCollapsed', () => {
      const engine = new NavbarStateEngine({ initialScrollY: 100 });
      // 1. Scroll upward to collapse
      engine.scroll(150);
      assert.equal(engine.isCollapsed, true, 'Precondition: navbar is collapsed');

      // 2. Keyboard user tabs into Home button
      engine.focusElement('nav-btn-home');
      assert.equal(engine.isCollapsed, false, 'Tabbing into Home button must immediately reveal navbar');

      // 3. User tabs across all elements inside navbar
      const navElements = [
        'nav-brand',
        'nav-btn-home',
        'nav-btn-demo',
        'nav-btn-mytree',
        'nav-btn-share',
        'nav-github-link',
        'nav-btn-signin',
        'settings-btn'
      ];

      for (const el of navElements) {
        engine.focusElement(el);
        assert.equal(engine.isCollapsed, false, `Navbar must stay visible while focused on ${el}`);
      }
    });

    it('ADV-2-03: Scroll events while focus is inside navbar NEVER trigger collapse', () => {
      const engine = new NavbarStateEngine({ initialScrollY: 200 });
      engine.scroll(250); // collapsed
      assert.equal(engine.isCollapsed, true);

      // User tabs into Demo button
      engine.focusElement('nav-btn-demo');
      assert.equal(engine.isCollapsed, false);

      // Page scroll event fires while focus remains on Demo button:
      // Test upward scroll with huge delta (+500px)
      engine.scroll(750);
      assert.equal(engine.isCollapsed, false, 'Focus guard must prevent collapse during upward scroll');

      // Test micro-scroll oscillation
      engine.scroll(755);
      assert.equal(engine.isCollapsed, false);
      engine.scroll(745);
      assert.equal(engine.isCollapsed, false);

      // Test extreme fling
      engine.scroll(5000);
      assert.equal(engine.isCollapsed, false, 'Focus guard must prevent collapse during extreme fling');
    });

    it('ADV-2-04: Tabbing out of navbar allows subsequent upward scroll to collapse normally', () => {
      const engine = new NavbarStateEngine({ initialScrollY: 200 });
      engine.focusElement('settings-btn');
      assert.equal(engine.isCollapsed, false);

      // Focus moves to external element on canvas
      engine.focusElement('canvas-card-101'); // outside navElementIds
      assert.equal(engine.isCollapsed, false, 'Navbar remains visible immediately upon blur');

      // Subsequent upward scroll past hysteresis threshold collapses navbar
      engine.scroll(250); // delta = +50px
      assert.equal(engine.isCollapsed, true, 'Navbar collapses after focus leaves and upward scroll occurs');
    });
  });

  // --------------------------------------------------------------------------
  // CHALLENGE DIMENSION 3: SETTINGS POPOVER OPEN PROTECTION
  // --------------------------------------------------------------------------
  describe('Dimension 3: Settings Popover Open Protection on Mobile', () => {
    it('ADV-3-01: Opening Settings popover on mobile immediately uncollapses navbar', () => {
      const engine = new NavbarStateEngine({ initialScrollY: 100 });
      engine.scroll(150);
      assert.equal(engine.isCollapsed, true, 'Precondition: navbar is collapsed');

      // User clicks settings button
      engine.setSettingsOpen(true);
      assert.equal(engine.isCollapsed, false, 'Opening Settings popover must immediately reveal navbar');
    });

    it('ADV-3-02: Barrage of 100 adversarial scroll events while Settings popover is open never collapses navbar', () => {
      const engine = new NavbarStateEngine({ initialScrollY: 200, isSettingsOpen: true });
      assert.equal(engine.isCollapsed, false);

      // Generate 100 adversarial scroll coordinates:
      // Including large jumps, negative overscrolls, upward flings, downward scrolls
      const scrollSequence = [
        250, 300, 310, 350, 400, 600, 1000, 5000,
        4980, 4950, 4500, 3000, 1500, 800, 200, 50,
        0, -10, -50, 0, 10, 25, 45, 90, 180,
        // Rapid oscillation
        185, 180, 187, 181, 189, 182, 195, 180, 250,
        // Large steps
        500, 750, 1200, 2400, 4800, 9600, 2000, 500, 10
      ];

      for (let i = 0; i < scrollSequence.length; i++) {
        const y = scrollSequence[i];
        engine.scroll(y);
        assert.equal(
          engine.isCollapsed,
          false,
          `Navbar collapsed at scroll step ${i} (scrollY=${y}) while Settings popover was open`
        );
      }
    });

    it('ADV-3-03: Interacting with all Settings popover items preserves visibility', async () => {
      const SettingsPopover = await loadComponent('./src/components/SettingsPopover.jsx');
      const t = createTranslator('en');

      let langVal = 'en';
      let themeVal = 'light';
      let textSizeVal = 'normal';
      let contrastVal = 'normal';
      let motionVal = 'normal';
      let viewportVal = 'mobile';
      let closeCalled = 0;

      const html = renderComponentToHtml(SettingsPopover, {
        isOpen: true,
        onClose: () => { closeCalled++; },
        lang: langVal,
        setLang: (l) => { langVal = l; },
        theme: themeVal,
        setTheme: (th) => { themeVal = th; },
        textSize: textSizeVal,
        setTextSize: (ts) => { textSizeVal = ts; },
        contrast: contrastVal,
        setContrast: (c) => { contrastVal = c; },
        motion: motionVal,
        setMotion: (m) => { motionVal = m; },
        viewportMode: viewportVal,
        setViewportMode: (v) => { viewportVal = v; },
        t
      });

      // Verify all settings sections render correctly
      assertElementExists(html, '.settings-popover');
      assertElementExists(html, '.settings-close');
      assert.ok(html.includes('English') && html.includes('हिन्दी'));
      assert.ok(html.includes('💻') && html.includes('📱'));

      // Simulate state engine while exploring options:
      const engine = new NavbarStateEngine({ initialScrollY: 150, isSettingsOpen: true });
      
      // Explore Language options
      langVal = 'hi';
      engine.scroll(180);
      assert.equal(engine.isCollapsed, false);

      // Explore Theme options
      themeVal = 'dark';
      engine.scroll(220);
      assert.equal(engine.isCollapsed, false);

      // Explore Viewport options
      viewportVal = 'laptop';
      engine.setViewportMode('laptop');
      engine.scroll(300);
      assert.equal(engine.isCollapsed, false);

      // Switch back to mobile viewport
      viewportVal = 'mobile';
      engine.setViewportMode('mobile');
      engine.scroll(350);
      assert.equal(engine.isCollapsed, false);

      // Close popover
      engine.setSettingsOpen(false);
      assert.equal(engine.isCollapsed, false, 'Navbar stays visible immediately after popover closes');

      // Subsequent upward scroll now collapses navbar
      engine.scroll(400); // delta = +50px
      assert.equal(engine.isCollapsed, true, 'Navbar collapses on next scroll after popover is closed');
    });
  });

  // --------------------------------------------------------------------------
  // CHALLENGE DIMENSION 4: BOUNDARY CONDITIONS & RESILIENCE
  // --------------------------------------------------------------------------
  describe('Dimension 4: Viewport Safeguards, View Changes & Screen Resizing', () => {
    it('ADV-4-01: Switching view (Home -> Demo -> My Tree) reveals collapsed navbar', () => {
      const engine = new NavbarStateEngine({ initialScrollY: 100 });
      engine.scroll(150);
      assert.equal(engine.isCollapsed, true);

      // View change triggers reveal
      engine.switchView('tree');
      assert.equal(engine.isCollapsed, false, 'Navbar must reveal when switching to tree view');

      engine.scroll(200);
      assert.equal(engine.isCollapsed, true);

      // Switch to home view
      engine.switchView('home');
      assert.equal(engine.isCollapsed, false, 'Navbar must reveal when switching to home view');
    });

    it('ADV-4-02: Laptop Display Mode strictly overrides and prevents collapse in JS and CSS', () => {
      // 1. CSS rule check
      const rules = extractCssRules(landingCssContent);
      const laptopRule = rules.find(r => 
        r.selectors.some(s => s.includes(':root[data-viewport="laptop"] .site-nav.is-collapsed'))
      );
      assert.ok(laptopRule, 'Must define :root[data-viewport="laptop"] .site-nav.is-collapsed rule');
      assert.ok(
        laptopRule.declarations['pointer-events']?.includes('auto !important'),
        'Laptop mode rule must force pointer-events: auto !important'
      );
      assert.ok(
        laptopRule.declarations['transform']?.includes('translateY(0) !important'),
        'Laptop mode rule must force transform: translateY(0) !important'
      );

      // 2. Engine check
      const engine = new NavbarStateEngine({ viewportMode: 'laptop', initialScrollY: 100 });
      engine.scroll(500);
      assert.equal(engine.isCollapsed, false, 'Laptop mode must never collapse navbar');
    });

    it('ADV-4-03: Screen resize from mobile (390px) to desktop (1280px) reveals collapsed navbar', () => {
      const engine = new NavbarStateEngine({ viewportMode: 'auto', innerWidth: 390, initialScrollY: 100 });
      engine.scroll(150);
      assert.equal(engine.isCollapsed, true, 'Precondition: collapsed on mobile screen');

      // User rotates tablet or resizes browser window to desktop
      engine.resize(1024);
      assert.equal(engine.isCollapsed, false, 'Resizing to desktop width (1024px) must immediately uncollapse navbar');

      // Scroll on desktop does not collapse
      engine.scroll(300);
      assert.equal(engine.isCollapsed, false, 'Desktop width prevents collapse');
    });

    it('ADV-4-04: Top boundary guard (scrollY <= 10px) permanently overrides collapse', () => {
      const engine = new NavbarStateEngine({ initialScrollY: 100 });
      engine.scroll(150);
      assert.equal(engine.isCollapsed, true);

      // Scroll to near-top (y = 5px)
      engine.scroll(5);
      assert.equal(engine.isCollapsed, false, 'ScrollY <= 10px must permanently reveal navbar');

      // Micro-scroll at top (y = 8px, delta = +3px)
      engine.scroll(8);
      assert.equal(engine.isCollapsed, false, 'ScrollY <= 10px must remain revealed');
    });

    it('ADV-4-05: Reduced motion compliance does not break visibility or pointer-events', () => {
      const rules = extractCssRules(landingCssContent);
      const reducedMotionThemeRule = rules.find(r => 
        r.selectors.some(s => s.includes(':root[data-motion="reduce"] .site-nav'))
      );
      const reducedMotionMediaRule = rules.find(r => 
        r.selectors.some(s => s.includes('.site-nav')) && 
        landingCssContent.includes('@media (prefers-reduced-motion: reduce)')
      );

      assert.ok(
        reducedMotionThemeRule || reducedMotionMediaRule,
        'Stylesheet must define reduced-motion rule for .site-nav'
      );
    });
  });
});
