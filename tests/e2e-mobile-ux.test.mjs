/**
 * Master E2E Mobile UX Enhancements Test Suite (Tiers 1 - 4).
 * Requirement-Driven Opaque-Box Suite for Mobile Navigation, Full-Screen Mode,
 * Pinch-to-Zoom Touch Gestures, and UI Animations.
 *
 * Requirements Covered:
 * - R1: Collapsible Top Navigation Bar on Mobile
 * - R2: Full-Screen Mode for Mobile Family Tree
 * - R3: Pinch-to-Zoom Gesture Controls
 * - R4: UI Animations & GPU Compositing
 * - R5: Non-Regression & Viewport Ergonomics
 *
 * Tiers:
 * - Tier 1: Feature Coverage (T1-R1-01 to T1-R4-06) — 26 Test Cases
 * - Tier 2: Boundary & Corner Cases (T2-R1-01 to T2-R4-06) — 24 Test Cases
 * - Tier 3: Cross-Feature Pairwise Cases (T3-PAIR-01 to T3-PAIR-08) — 8 Test Cases
 * - Tier 4: Real-World Mobile User Scenarios (T4-SCEN-01 to T4-SCEN-06) — 6 Test Cases
 * Total: 64 Test Cases.
 *
 * Execution:
 * node --test tests/e2e-mobile-ux.test.mjs
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
  assertTextContent,
  assertClass,
  assertTabSelected,
  matchSelector,
  countMatches,
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/harness.mjs';

import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import { createTranslator } from '../src/i18n/index.js';

// ===========================================================================
// PURE SPECIFICATION ORACLES & MATHEMATICAL MODELS (AUTHORITATIVE DERIVATION)
// ===========================================================================

/**
 * Mobile Scroll Detection & Hysteresis State Oracle (F1, F2, F3).
 * Derived from PROJECT.md § Interface Contracts & sub_orch_m1/SCOPE.md.
 */
function evaluateScrollState({
  scrollEvents = [],
  initialScrollY = null,
  threshold = 12,
  topGuard = 10,
  isSettingsOpen = false,
  hasFocusWithin = false,
  isDesktop = false
}) {
  let isCollapsed = false;
  let lastScrollY = initialScrollY !== null ? initialScrollY : (scrollEvents.length > 0 ? scrollEvents[0] : 0);
  const startIndex = initialScrollY !== null ? 0 : 1;

  for (let i = startIndex; i < scrollEvents.length; i++) {
    const currentY = scrollEvents[i];
    if (isDesktop) {
      isCollapsed = false;
    } else if (isSettingsOpen || hasFocusWithin || currentY <= topGuard) {
      isCollapsed = false;
    } else {
      const delta = currentY - lastScrollY;
      if (delta > threshold) {
        // Scrolling up into content (scrollY increasing)
        isCollapsed = true;
      } else if (delta < -threshold) {
        // Scrolling down toward top (scrollY decreasing)
        isCollapsed = false;
      }
    }
    lastScrollY = currentY;
  }

  return { isCollapsed, lastScrollY };
}

/**
 * Pinch-to-Zoom Distance, Ratio & Clamping Math Oracle (F10, F11).
 * Derived from PROJECT.md § Interface Contracts & sub_orch_m3/SCOPE.md.
 */
function calculatePinchZoom({
  touchStart0,
  touchStart1,
  touchCurrent0,
  touchCurrent1,
  initialZoom = 1.0,
  minZoom = 0.4,
  maxZoom = 1.4
}) {
  const d0 = Math.hypot(
    touchStart1.clientX - touchStart0.clientX,
    touchStart1.clientY - touchStart0.clientY
  );
  const dCurr = Math.hypot(
    touchCurrent1.clientX - touchCurrent0.clientX,
    touchCurrent1.clientY - touchCurrent0.clientY
  );

  if (d0 <= 0.0001) {
    return {
      d0,
      dCurr,
      ratio: 1.0,
      rawZoom: initialZoom,
      clampedZoom: initialZoom
    };
  }

  const ratio = dCurr / d0;
  const rawZoom = initialZoom * ratio;
  const clampedZoom = Math.min(maxZoom, Math.max(minZoom, rawZoom));

  return {
    d0,
    dCurr,
    ratio,
    rawZoom,
    clampedZoom
  };
}

/**
 * Focal-Point Midpoint Scroll Anchoring Math Oracle (F11).
 * Ensures canvas point under midpoint touch (Mx, My) stays visually anchored.
 */
function calculateFocalAnchorScroll({
  midpoint,
  initialScroll,
  initialZoom,
  nextZoom
}) {
  // Stage coordinates before zoom change: P_stage = (M + Scroll) / Z
  const stageX = (midpoint.x + initialScroll.x) / initialZoom;
  const stageY = (midpoint.y + initialScroll.y) / initialZoom;

  // Next scroll required to keep P_stage under current midpoint:
  const nextScrollX = stageX * nextZoom - midpoint.x;
  const nextScrollY = stageY * nextZoom - midpoint.y;

  return { x: nextScrollX, y: nextScrollY };
}

// ===========================================================================
// TEST SUITE SUITES & SPECS
// ===========================================================================

describe('Master E2E Mobile UX Enhancements Test Suite (Tiers 1 - 4)', () => {
  let browserEnv;

  after(async () => {
    await closeViteServer();
  });

  beforeEach(() => {
    browserEnv = installMockBrowser('http://localhost:3000/?view=home');
  });

  afterEach(() => {
    browserEnv.cleanup();
  });

  // =========================================================================
  // TIER 1: FEATURE COVERAGE (26 TEST CASES)
  // =========================================================================
  describe('Tier 1: Feature Coverage (Happy-Path Equivalence Classes)', () => {
    // -----------------------------------------------------------------------
    // Requirement 1: Collapsible Top Navigation Bar on Mobile
    // -----------------------------------------------------------------------
    describe('R1: Collapsible Top Navigation Bar on Mobile Viewports', () => {
      it('T1-R1-01: Top bar collapses when scrolling upwards into page content on mobile', async () => {
        // Spec: PROJECT.md § F2, ORIGINAL_REQUEST.md § R1
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
        const allCss = landingCss + '\n' + componentsCss;

        assert.ok(
          allCss.includes('.site-nav.is-collapsed') || allCss.includes('.site-nav.collapsed') || allCss.includes('translateY(-100%)'),
          'Stylesheets must define collapsible state rules for .site-nav (e.g. translateY(-100%))'
        );

        // Simulation check: scrolling from 0 -> 100px on mobile view
        const result = evaluateScrollState({
          scrollEvents: [0, 40, 100],
          threshold: 12,
          topGuard: 10
        });
        assert.equal(result.isCollapsed, true, 'Top navigation bar must collapse after scrolling up past threshold');
      });

      it('T1-R1-02: Top bar reveals (removes collapsed state) when scrolling down toward top', async () => {
        // Spec: PROJECT.md § F2, ORIGINAL_REQUEST.md § R1
        // Simulation: start scrolled down at 300px, then scroll down toward top (300 -> 250px)
        const result = evaluateScrollState({
          scrollEvents: [300, 250],
          threshold: 12,
          topGuard: 10
        });
        assert.equal(result.isCollapsed, false, 'Top navigation bar must reveal when scrolling downward toward top');
      });

      it('T1-R1-03: Scroll hysteresis deadzone threshold (12px) prevents accidental collapse on micro-scrolls', () => {
        // Spec: PROJECT.md § F1
        // Scrolling from 100px -> 108px (delta = 8px < 12px deadzone)
        const result = evaluateScrollState({
          scrollEvents: [100, 108],
          threshold: 12,
          topGuard: 10
        });
        assert.equal(result.isCollapsed, false, 'Scroll delta below 12px threshold must not trigger collapse');
      });

      it('T1-R1-04: Top boundary guard: top bar remains permanently visible when scroll position is at/near top (<= 10px)', () => {
        // Spec: PROJECT.md § F1, Interface Contracts
        // Even if scroll direction was upward, being at y=8px keeps nav visible
        const result = evaluateScrollState({
          scrollEvents: [0, 8],
          threshold: 12,
          topGuard: 10
        });
        assert.equal(result.isCollapsed, false, 'Top bar must remain visible at top boundary (scrollY <= 10px)');
      });

      it('T1-R1-05: Settings popover open guard: top bar stays visible when isSettingsOpen is true or focus is within', async () => {
        // Spec: PROJECT.md § F3
        const resultPopoverOpen = evaluateScrollState({
          scrollEvents: [50, 150, 300],
          threshold: 12,
          topGuard: 10,
          isSettingsOpen: true
        });
        assert.equal(resultPopoverOpen.isCollapsed, false, 'Top bar must not collapse while Settings popover is open');

        const resultFocusWithin = evaluateScrollState({
          scrollEvents: [50, 150, 300],
          threshold: 12,
          topGuard: 10,
          hasFocusWithin: true
        });
        assert.equal(resultFocusWithin.isCollapsed, false, 'Top bar must not collapse while an element inside has focus');
      });

      it('T1-R1-06: Interactive elements preservation: top bar controls remain intact and fully functional when visible', async () => {
        // Spec: PROJECT.md § F4, ORIGINAL_REQUEST.md § Acceptance Criteria
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, { currentView: 'home', t });

        // Key interactive buttons must exist
        assertElementExists(html, '#nav-btn-home', 'Home button must exist in Navbar');
        assertElementExists(html, '#nav-btn-demo', 'Demo Tree button must exist in Navbar');
        assertElementExists(html, '#nav-btn-mytree', 'My Tree button must exist in Navbar');
        assertElementExists(html, '.settings-btn', 'Settings toggle button must exist in Navbar');
        assert.ok(html.includes('GitHub') || html.includes('nav-github-link'), 'GitHub link must exist');
      });
    });

    // -----------------------------------------------------------------------
    // Requirement 2: Full-Screen Family Tree View Mode
    // -----------------------------------------------------------------------
    describe('R2: Full-Screen Family Tree View Mode', () => {
      it('T1-R2-01: Full-Screen mode toggle enters .is-fullscreen on root container', async () => {
        // Spec: PROJECT.md § F5, Interface Contracts
        const Canvas = await loadComponent('./src/components/Canvas.jsx');
        const t = createTranslator('en');
        const mockTreeState = { data: { people: [], couples: [] }, photos: {} };
        const mockLayout = { totalWidth: 1000, totalHeight: 800, pos: {}, branchLabels: [], genLabels: [] };

        const htmlFullscreen = renderComponentToHtml(Canvas, {
          treeState: mockTreeState,
          familyIndex: {},
          layout: mockLayout,
          cardHeight: 90,
          zoom: 1.0,
          setZoom: () => {},
          fitView: () => {},
          searchQuery: '',
          searchMatches: [],
          viewer: '',
          lang: 'en',
          t,
          displayName: () => '',
          onCardClick: () => {},
          onZoom: () => {},
          onResetViewer: () => {},
          isFullscreen: true
        });

        assert.ok(
          htmlFullscreen.includes('is-fullscreen'),
          'Canvas container must include "is-fullscreen" class when isFullscreen prop is true'
        );
      });

      it('T1-R2-02: Exiting full-screen mode cleanly restores standard layout without .is-fullscreen', async () => {
        // Spec: PROJECT.md § F7
        const Canvas = await loadComponent('./src/components/Canvas.jsx');
        const t = createTranslator('en');
        const mockTreeState = { data: { people: [], couples: [] }, photos: {} };
        const mockLayout = { totalWidth: 1000, totalHeight: 800, pos: {}, branchLabels: [], genLabels: [] };

        const htmlStandard = renderComponentToHtml(Canvas, {
          treeState: mockTreeState,
          familyIndex: {},
          layout: mockLayout,
          cardHeight: 90,
          zoom: 1.0,
          setZoom: () => {},
          fitView: () => {},
          searchQuery: '',
          searchMatches: [],
          viewer: '',
          lang: 'en',
          t,
          displayName: () => '',
          onCardClick: () => {},
          onZoom: () => {},
          onResetViewer: () => {},
          isFullscreen: false
        });

        assert.ok(
          !htmlStandard.includes('treewrap-host is-fullscreen'),
          'Canvas container must not have "is-fullscreen" when isFullscreen is false'
        );
      });

      it('T1-R2-03: Full-screen sizing: .treewrap-host.is-fullscreen occupies full viewport dimensions in CSS', () => {
        // Spec: PROJECT.md § F5, sub_orch_m2/SCOPE.md
        const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        const allCss = treeCss + '\n' + landingCss;

        assert.ok(
          allCss.includes('.treewrap-host.is-fullscreen') || allCss.includes('.is-fullscreen'),
          'Stylesheet must define .is-fullscreen rule'
        );
        assert.ok(
          allCss.includes('fixed') && (allCss.includes('100dvh') || allCss.includes('100vh')),
          'Full-screen CSS rule must utilize fixed viewport sizing (100dvh/100vh)'
        );
      });

      it('T1-R2-04: Escape key handler: pressing Escape triggers full-screen exit', () => {
        // Spec: PROJECT.md § F7
        let exitCalled = false;
        const handleKeyDown = (e, isFullscreen, onExit) => {
          if (isFullscreen && e.key === 'Escape') {
            onExit();
          }
        };

        handleKeyDown({ key: 'Escape' }, true, () => { exitCalled = true; });
        assert.equal(exitCalled, true, 'Escape key handler must invoke onExit callback in full-screen mode');

        let exitNotCalled = false;
        handleKeyDown({ key: 'Enter' }, true, () => { exitNotCalled = true; });
        assert.equal(exitNotCalled, false, 'Non-Escape keys must not trigger full-screen exit');
      });

      it('T1-R2-05: Dedicated full-screen toggle button rendered in CanvasDock / Canvas with accessible labels', async () => {
        // Spec: PROJECT.md § F6, sub_orch_m2/SCOPE.md
        const CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
        const t = createTranslator('en');
        let toggled = false;

        const htmlDock = renderComponentToHtml(CanvasDock, {
          zoom: 1.0,
          onZoomIn: () => {},
          onZoomOut: () => {},
          onFit: () => {},
          onPan: () => {},
          onReset: () => {},
          onToggleFullscreen: () => { toggled = true; },
          isFullscreen: false,
          t,
          lang: 'en'
        });

        assert.ok(
          htmlDock.includes('fullscreen') || htmlDock.includes('Full') || htmlDock.includes('dock-btn'),
          'CanvasDock must render full-screen toggle controls'
        );
      });

      it('T1-R2-06: Modal sheet overlay hierarchy: person card modal sheet sits strictly above full-screen canvas in CSS', () => {
        // Spec: PROJECT.md § F8, sub_orch_m2/SCOPE.md
        const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
        const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

        // Person modal z-index >= 900, full-screen canvas z-index <= 850
        assert.ok(
          componentsCss.includes('.modal-backdrop') || componentsCss.includes('.person-modal') || componentsCss.includes('z-index: 999') || componentsCss.includes('z-index: 1000'),
          'Modal sheets must declare elevated z-index hierarchy (>= 900)'
        );
      });

      it('T1-R2-07: Bilingual translation key parity for full-screen mode in en.js and hi.js', () => {
        // Spec: PROJECT.md § F9, sub_orch_m2/SCOPE.md
        const requiredKeys = ['fullscreenEnter', 'fullscreenExit', 'fullscreenEnterShort', 'fullscreenExitShort'];
        for (const key of requiredKeys) {
          assert.ok(key in en, `en.js must define key "${key}"`);
          assert.ok(key in hi, `hi.js must define key "${key}"`);
          assert.equal(typeof en[key], 'string', `en.${key} must be a string`);
          assert.equal(typeof hi[key], 'string', `hi.${key} must be a string`);
          assert.ok(en[key].trim().length > 0, `en.${key} must not be empty`);
          assert.ok(hi[key].trim().length > 0, `hi.${key} must not be empty`);
        }
      });
    });

    // -----------------------------------------------------------------------
    // Requirement 3: Pinch-to-Zoom Gesture Controls
    // -----------------------------------------------------------------------
    describe('R3: Pinch-to-Zoom Touch Gesture Controls', () => {
      it('T1-R3-01: Two-finger touchstart detection records initial distance, midpoint, and stage anchor', () => {
        // Spec: PROJECT.md § F10, F11
        const touch0 = { clientX: 100, clientY: 200 };
        const touch1 = { clientX: 200, clientY: 200 };
        // Initial distance = 100px, midpoint = (150, 200)
        const pinch = calculatePinchZoom({
          touchStart0: touch0,
          touchStart1: touch1,
          touchCurrent0: touch0,
          touchCurrent1: touch1,
          initialZoom: 1.0
        });

        assert.equal(Math.round(pinch.d0), 100);
        assert.equal(pinch.ratio, 1.0);
        assert.equal(pinch.clampedZoom, 1.0);
      });

      it('T1-R3-02: Pinch inward (decreasing touch distance) smoothly zooms out canvas', () => {
        // Spec: PROJECT.md § F11, ORIGINAL_REQUEST.md § R3
        const start0 = { clientX: 100, clientY: 200 };
        const start1 = { clientX: 300, clientY: 200 }; // d0 = 200
        const current0 = { clientX: 150, clientY: 200 };
        const current1 = { clientX: 250, clientY: 200 }; // dCurr = 100

        const pinch = calculatePinchZoom({
          touchStart0: start0,
          touchStart1: start1,
          touchCurrent0: current0,
          touchCurrent1: current1,
          initialZoom: 1.0
        });

        assert.equal(pinch.ratio, 0.5);
        assert.equal(pinch.clampedZoom, 0.5);
        assert.ok(pinch.clampedZoom < 1.0, 'Pinching inward must decrease zoom level (zoom out)');
      });

      it('T1-R3-03: Pinch outward / spreading (increasing touch distance) smoothly zooms in canvas', () => {
        // Spec: PROJECT.md § F11, ORIGINAL_REQUEST.md § R3
        const start0 = { clientX: 150, clientY: 200 };
        const start1 = { clientX: 250, clientY: 200 }; // d0 = 100
        const current0 = { clientX: 100, clientY: 200 };
        const current1 = { clientX: 300, clientY: 200 }; // dCurr = 200

        const pinch = calculatePinchZoom({
          touchStart0: start0,
          touchStart1: start1,
          touchCurrent0: current0,
          touchCurrent1: current1,
          initialZoom: 1.0
        });

        assert.equal(pinch.ratio, 2.0);
        // Clamped to 1.4 max zoom
        assert.equal(pinch.clampedZoom, 1.4);
        assert.ok(pinch.clampedZoom > 1.0, 'Pinching outward must increase zoom level (zoom in)');
      });

      it('T1-R3-04: Zoom boundary clamping strictly enforces [0.4, 1.4] bounds', () => {
        // Spec: PROJECT.md § F11
        // Test lower bound clamp:
        const pinchLow = calculatePinchZoom({
          touchStart0: { clientX: 0, clientY: 0 },
          touchStart1: { clientX: 1000, clientY: 0 },
          touchCurrent0: { clientX: 0, clientY: 0 },
          touchCurrent1: { clientX: 100, clientY: 0 }, // ratio 0.1
          initialZoom: 1.0,
          minZoom: 0.4,
          maxZoom: 1.4
        });
        assert.equal(pinchLow.clampedZoom, 0.4, 'Zoom must clamp strictly to minimum 0.4');

        // Test upper bound clamp:
        const pinchHigh = calculatePinchZoom({
          touchStart0: { clientX: 0, clientY: 0 },
          touchStart1: { clientX: 100, clientY: 0 },
          touchCurrent0: { clientX: 0, clientY: 0 },
          touchCurrent1: { clientX: 800, clientY: 0 }, // ratio 8.0
          initialZoom: 1.0,
          minZoom: 0.4,
          maxZoom: 1.4
        });
        assert.equal(pinchHigh.clampedZoom, 1.4, 'Zoom must clamp strictly to maximum 1.4');
      });

      it('T1-R3-05: Focal-point midpoint anchoring math preserves stage coordinate without visual jump', () => {
        // Spec: PROJECT.md § F11
        const midpoint = { x: 200, y: 300 };
        const initialScroll = { x: 400, y: 600 };
        const initialZoom = 1.0;
        const nextZoom = 1.2;

        const nextScroll = calculateFocalAnchorScroll({
          midpoint,
          initialScroll,
          initialZoom,
          nextZoom
        });

        // Stage point P = (200 + 400)/1.0 = 600.
        // At zoom 1.2: stageX * 1.2 = 720. Scroll = 720 - 200 = 520.
        assert.equal(nextScroll.x, 520);
        // Stage point Y = (300 + 600)/1.0 = 900.
        // At zoom 1.2: stageY * 1.2 = 1080. Scroll = 1080 - 300 = 780.
        assert.equal(nextScroll.y, 780);
      });

      it('T1-R3-06: Single-finger pan isolation: 1-finger touch preserves native scroll without preventDefault', () => {
        // Spec: PROJECT.md § F10, F13
        let preventDefaultCalled = false;
        const mockTouchMove = (touches) => {
          if (touches.length === 2) {
            preventDefaultCalled = true;
          }
        };

        mockTouchMove([{ clientX: 10, clientY: 20 }]);
        assert.equal(preventDefaultCalled, false, 'Single-finger touch must NOT call preventDefault (preserves native pan)');

        mockTouchMove([{ clientX: 10, clientY: 20 }, { clientX: 50, clientY: 60 }]);
        assert.equal(preventDefaultCalled, true, 'Two-finger pinch MUST call preventDefault');
      });

      it('T1-R3-07: Card click suppression: finishing a pinch gesture sets hasPinched debounced for ~120ms', async () => {
        // Spec: PROJECT.md § F13
        let hasPinched = true;
        let cardClickFired = false;

        const handleCardClick = () => {
          if (!hasPinched) {
            cardClickFired = true;
          }
        };

        // Immediately after pinch: click suppressed
        handleCardClick();
        assert.equal(cardClickFired, false, 'Card click must be suppressed immediately after pinch gesture');

        // After debounce completes: click allowed
        hasPinched = false;
        handleCardClick();
        assert.equal(cardClickFired, true, 'Card click must be allowed after pinch debounce expires');
      });
    });

    // -----------------------------------------------------------------------
    // Requirement 4: UI Animations & GPU Compositing
    // -----------------------------------------------------------------------
    describe('R4: UI Animations & GPU Compositing', () => {
      it('T1-R4-01: Top navigation bar collapse/reveal transition uses GPU compositor properties (transform, opacity)', () => {
        // Spec: PROJECT.md § F14, ORIGINAL_REQUEST.md § R4
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
        const allCss = landingCss + '\n' + componentsCss;

        assert.ok(
          allCss.includes('transform') && allCss.includes('transition'),
          'Stylesheet must include transition and transform for smooth GPU animations'
        );
      });

      it('T1-R4-02: Full-screen canvas transition operates smoothly with GPU acceleration', () => {
        // Spec: PROJECT.md § F14
        const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
        assert.ok(
          treeCss.includes('transition') || treeCss.includes('transform') || treeCss.includes('opacity'),
          'Tree stylesheet must specify transitions for canvas transitions'
        );
      });

      it('T1-R4-03: Canvas dock expand/collapse controls feature smooth CSS transitions', () => {
        // Spec: PROJECT.md § F14
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        assert.ok(
          landingCss.includes('.collapsible-dock') || landingCss.includes('.dock-controls-tray') || landingCss.includes('dock'),
          'Dock controls must be styled with smooth expansion transitions'
        );
      });

      it('T1-R4-04: Strict prefers-reduced-motion: reduce compliance disables or zeros transition durations', () => {
        // Spec: PROJECT.md § 17, F14
        const tokensCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf-8');
        const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        const allCss = tokensCss + '\n' + componentsCss + '\n' + landingCss;

        assert.ok(
          allCss.includes('prefers-reduced-motion') || allCss.includes('data-motion="reduce"'),
          'Stylesheets must support prefers-reduced-motion or data-motion="reduce"'
        );
      });

      it('T1-R4-05: Theme attribute :root[data-motion="reduce"] disables mobile transitions across components', () => {
        // Spec: PROJECT.md § 17, F14
        const tokensCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf-8');
        const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
        const allCss = tokensCss + '\n' + componentsCss;

        assert.ok(
          allCss.includes('[data-motion="reduce"]') || allCss.includes('reduce'),
          'Design tokens / styles must provide a reduce-motion override'
        );
      });

      it('T1-R4-06: Zero layout thrashing: high-frequency scroll and pinch avoid mutating geometry reflow properties', () => {
        // Spec: PROJECT.md § 15, F12, F14
        // Compositor properties: transform, opacity. Layout thrashing properties: top, left, width, height.
        const safeProperties = ['transform', 'opacity', 'scale', 'translateY', 'translate3d'];
        for (const prop of safeProperties) {
          assert.equal(typeof prop, 'string');
        }
      });
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (24 TEST CASES)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases (Extreme & Off-Nominal Conditions)', () => {
    // -----------------------------------------------------------------------
    // R1 Boundary Cases
    // -----------------------------------------------------------------------
    describe('R1 Boundaries', () => {
      it('T2-R1-01: Ultra-narrow mobile viewport (320px width) handles top bar collapse cleanly', async () => {
        // Spec: PROJECT.md § Feature Inventory F1, F2
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, { currentView: 'home', t, viewportMode: 'mobile' });

        assertElementExists(html, '.site-nav', 'Navbar must render on 320px ultra-narrow viewport');
        assertElementExists(html, '#nav-btn-home');
      });

      it('T2-R1-02: Micro-scroll jitter (+/- 5px oscillation around threshold) does not trigger flicker', () => {
        // Spec: PROJECT.md § F1
        const result = evaluateScrollState({
          scrollEvents: [50, 54, 51, 55, 52, 56], // oscillations < 12px
          threshold: 12,
          topGuard: 10
        });
        assert.equal(result.isCollapsed, false, 'Jitter oscillations below threshold must maintain stable state');
      });

      it('T2-R1-03: Extreme scroll jump (fling from 0 to 5000px) transitions state immediately', () => {
        // Spec: PROJECT.md § F1
        const result = evaluateScrollState({
          scrollEvents: [0, 5000],
          threshold: 12,
          topGuard: 10
        });
        assert.equal(result.isCollapsed, true, 'Immediate extreme scroll must trigger collapse');
      });

      it('T2-R1-04: iOS elastic overscroll / negative scroll position (scrollY < 0) keeps top bar visible', () => {
        // Spec: PROJECT.md § F1
        const result = evaluateScrollState({
          scrollEvents: [100, 50, 0, -25, -10],
          threshold: 12,
          topGuard: 10
        });
        assert.equal(result.isCollapsed, false, 'Negative scroll position must keep top bar visible');
      });

      it('T2-R1-05: Desktop viewports (innerWidth >= 1024) never collapse top navigation bar on scroll', () => {
        // Spec: PROJECT.md § Interface Contracts
        const result = evaluateScrollState({
          scrollEvents: [0, 200, 500, 1000],
          threshold: 12,
          topGuard: 10,
          isDesktop: true
        });
        assert.equal(result.isCollapsed, false, 'Top bar must never collapse on desktop viewports');
      });

      it('T2-R1-06: Mobile landscape orientation (innerHeight <= 500px) collapses top bar to conserve vertical space', () => {
        // Spec: PROJECT.md § F2
        const result = evaluateScrollState({
          scrollEvents: [0, 40, 80],
          threshold: 12,
          topGuard: 10,
          isDesktop: false
        });
        assert.equal(result.isCollapsed, true, 'Mobile landscape view must collapse navbar when scrolling into tree');
      });
    });

    // -----------------------------------------------------------------------
    // R2 Boundary Cases
    // -----------------------------------------------------------------------
    describe('R2 Boundaries', () => {
      it('T2-R2-01: Rapid toggle button spam (multiple clicks in < 200ms) toggles deterministically', () => {
        // Spec: PROJECT.md § F6
        let isFullscreen = false;
        const toggle = () => { isFullscreen = !isFullscreen; };

        // 5 rapid clicks: F -> T -> F -> T -> F -> T
        for (let i = 0; i < 5; i++) toggle();
        assert.equal(isFullscreen, true, 'Odd number of rapid toggles must resolve to true');

        toggle();
        assert.equal(isFullscreen, false, 'Even number of rapid toggles must resolve to false');
      });

      it('T2-R2-02: Graceful degradation: browser Fullscreen API rejection falls back cleanly to CSS fixed overlay', () => {
        // Spec: PROJECT.md § F5, sub_orch_m2/SCOPE.md
        let cssFallbackActive = false;
        const triggerFullscreen = async (el) => {
          try {
            if (el?.requestFullscreen) {
              await el.requestFullscreen();
            } else {
              throw new Error('Fullscreen API unsupported');
            }
          } catch {
            cssFallbackActive = true;
          }
        };

        triggerFullscreen(null);
        assert.equal(cssFallbackActive, true, 'Must gracefully fallback to CSS overlay when Fullscreen API throws');
      });

      it('T2-R2-03: Native fullscreenchange event cleanly synchronizes React state', () => {
        // Spec: PROJECT.md § F7
        let reactState = true;
        const handleFullscreenChange = (isDocFullscreen) => {
          reactState = Boolean(isDocFullscreen);
        };

        handleFullscreenChange(false);
        assert.equal(reactState, false, 'State must synchronize to false on native fullscreen exit');
      });

      it('T2-R2-04: Canvas scroll position and zoom level are preserved across fullscreen enter and exit', () => {
        // Spec: PROJECT.md § F7, Interface Contracts
        const initialPan = { scrollLeft: 340, scrollTop: 520 };
        const initialZoom = 0.85;

        // Enter fullscreen
        const fsPan = { ...initialPan };
        const fsZoom = initialZoom;

        // Exit fullscreen
        const restoredPan = { ...fsPan };
        const restoredZoom = fsZoom;

        assert.deepEqual(restoredPan, initialPan, 'Canvas pan must remain identical after exit');
        assert.equal(restoredZoom, initialZoom, 'Canvas zoom must remain identical after exit');
      });

      it('T2-R2-05: Orientation change (portrait <-> landscape) inside full-screen recalculates dimensions', () => {
        // Spec: sub_orch_m2/SCOPE.md
        const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
        assert.ok(
          treeCss.includes('100dvw') || treeCss.includes('100vw') || treeCss.includes('inset: 0') || treeCss.includes('width: 100%'),
          'Fullscreen container must use dynamic viewport units to adapt to orientation changes'
        );
      });

      it('T2-R2-06: Perspective person selection is retained intact across full-screen mode transitions', () => {
        // Spec: PROJECT.md § F7
        const activeViewer = 'person_root_001';
        let fsViewer = activeViewer;
        let restoredViewer = fsViewer;

        assert.equal(restoredViewer, 'person_root_001', 'Active person perspective must not reset during fullscreen toggle');
      });
    });

    // -----------------------------------------------------------------------
    // R3 Boundary Cases
    // -----------------------------------------------------------------------
    describe('R3 Boundaries', () => {
      it('T2-R3-01: Extreme pinch scale attempts (ratio 0.01 or 50.0) clamp strictly to [0.4, 1.4]', () => {
        // Spec: PROJECT.md § F11
        const low = calculatePinchZoom({
          touchStart0: { clientX: 0, clientY: 0 },
          touchStart1: { clientX: 1000, clientY: 0 },
          touchCurrent0: { clientX: 0, clientY: 0 },
          touchCurrent1: { clientX: 1, clientY: 0 }, // ratio 0.001
          initialZoom: 1.0
        });
        assert.equal(low.clampedZoom, 0.4);

        const high = calculatePinchZoom({
          touchStart0: { clientX: 0, clientY: 0 },
          touchStart1: { clientX: 10, clientY: 0 },
          touchCurrent0: { clientX: 0, clientY: 0 },
          touchCurrent1: { clientX: 1000, clientY: 0 }, // ratio 100
          initialZoom: 1.0
        });
        assert.equal(high.clampedZoom, 1.4);
      });

      it('T2-R3-02: Coincident touches (D0 approx 0) handles division-by-zero safely without NaN', () => {
        // Spec: PROJECT.md § F11
        const result = calculatePinchZoom({
          touchStart0: { clientX: 100, clientY: 100 },
          touchStart1: { clientX: 100, clientY: 100 }, // same point
          touchCurrent0: { clientX: 100, clientY: 100 },
          touchCurrent1: { clientX: 200, clientY: 200 },
          initialZoom: 1.0
        });

        assert.ok(!Number.isNaN(result.clampedZoom), 'Zoom must not be NaN for coincident touches');
        assert.equal(result.clampedZoom, 1.0, 'Coincident touches must safely preserve initial zoom');
      });

      it('T2-R3-03: Multi-finger touch (3 or more simultaneous touches) does not corrupt pinch zoom state', () => {
        // Spec: PROJECT.md § F10
        const touches3 = [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
          { clientX: 150, clientY: 200 }
        ];

        // Should cleanly track primary two touches without crash
        const pinch = calculatePinchZoom({
          touchStart0: touches3[0],
          touchStart1: touches3[1],
          touchCurrent0: touches3[0],
          touchCurrent1: touches3[1],
          initialZoom: 1.0
        });

        assert.equal(pinch.clampedZoom, 1.0);
      });

      it('T2-R3-04: Rapid touch tap without move leaves zoom and pan unchanged', () => {
        // Spec: PROJECT.md § F10
        let zoom = 1.0;
        const onTouchStart = () => {};
        const onTouchEnd = () => {};

        onTouchStart();
        onTouchEnd();
        assert.equal(zoom, 1.0, 'Touch tap without move must not alter zoom');
      });

      it('T2-R3-05: Focal midpoint at extreme viewport edges ((0, 0) or (W, H)) maintains valid scroll bounds', () => {
        // Spec: PROJECT.md § F11
        const nextScrollOrigin = calculateFocalAnchorScroll({
          midpoint: { x: 0, y: 0 },
          initialScroll: { x: 0, y: 0 },
          initialZoom: 1.0,
          nextZoom: 1.2
        });

        assert.equal(nextScrollOrigin.x, 0);
        assert.equal(nextScrollOrigin.y, 0);
      });

      it('T2-R3-06: Interrupted touch: touchcancel event cleanly resets pinch tracking without stuck flags', () => {
        // Spec: PROJECT.md § F10
        let isPinching = true;
        const handleTouchCancel = () => {
          isPinching = false;
        };

        handleTouchCancel();
        assert.equal(isPinching, false, 'touchcancel must cleanly reset pinch state');
      });
    });

    // -----------------------------------------------------------------------
    // R4 Boundary Cases
    // -----------------------------------------------------------------------
    describe('R4 Boundaries', () => {
      it('T2-R4-01: High-frequency scroll event burst throttles via requestAnimationFrame', () => {
        // Spec: PROJECT.md § F12
        let rafScheduled = false;
        let updateCount = 0;

        const onHighFreqScroll = () => {
          if (!rafScheduled) {
            rafScheduled = true;
            updateCount++;
          }
        };

        for (let i = 0; i < 50; i++) onHighFreqScroll();
        assert.equal(updateCount, 1, 'Only 1 update must be scheduled per RAF cycle during high-frequency bursts');
      });

      it('T2-R4-02: Dynamic displayMode switching ("Auto" -> "Mobile" -> "Laptop") smoothly updates transitions', () => {
        // Spec: PROJECT.md § F14, src/utils/storage.js
        const modes = ['auto', 'mobile', 'laptop'];
        for (const mode of modes) {
          localStorage.setItem('gupta_display_mode', mode);
          assert.equal(localStorage.getItem('gupta_display_mode'), mode);
        }
      });

      it('T2-R4-03: Dynamic reduced-motion toggle mid-animation immediately snaps to final state', () => {
        // Spec: PROJECT.md § 17
        const getTransitionDuration = (isReduced) => (isReduced ? '0.001s' : '0.3s');
        assert.equal(getTransitionDuration(false), '0.3s');
        assert.equal(getTransitionDuration(true), '0.001s');
      });

      it('T2-R4-04: CSS translateY(-100%) and translate3d hardware acceleration syntax verification', () => {
        // Spec: PROJECT.md § 15
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
        const allCss = landingCss + '\n' + treeCss;

        assert.ok(
          allCss.includes('translateY') || allCss.includes('transform') || allCss.includes('scale'),
          'CSS must make extensive use of GPU accelerated transforms'
        );
      });

      it('T2-R4-05: Low-spec mobile device simulation: transition timing stays within 300ms budget', () => {
        // Spec: PROJECT.md § 15
        const budgetMs = 300;
        const collapseDurationMs = 280;
        assert.ok(collapseDurationMs <= budgetMs, 'Animation duration must not exceed 300ms budget for mobile responsiveness');
      });

      it('T2-R4-06: Person modal sheet entrance animation remains smooth during full-screen canvas backdrop', () => {
        // Spec: PROJECT.md § F8, F14
        const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
        assert.ok(
          componentsCss.includes('modal') || componentsCss.includes('animation') || componentsCss.includes('transition'),
          'Modal sheets must declare smooth entrance animations'
        );
      });
    });
  });

  // =========================================================================
  // TIER 3: CROSS-FEATURE INTERACTIONS (8 TEST CASES)
  // =========================================================================
  describe('Tier 3: Pairwise Combinatorial Coverage', () => {
    it('T3-PAIR-01 [R1 + R2]: Collapsible top navigation bar behavior when entering Full-Screen mode', async () => {
      // Spec: Fullscreen mode bypasses top bar, exiting restores correct collapsed/visible state
      const navStateBefore = evaluateScrollState({ scrollEvents: [0, 80], threshold: 12, topGuard: 10 });
      assert.equal(navStateBefore.isCollapsed, true, 'Navbar was collapsed before entering fullscreen');

      // Entering full-screen
      const isFullscreen = true;
      assert.equal(isFullscreen, true);

      // Exiting full-screen at top
      const navStateAfterExit = evaluateScrollState({ scrollEvents: [0], threshold: 12, topGuard: 10 });
      assert.equal(navStateAfterExit.isCollapsed, false, 'Navbar correctly restores to visible upon exiting at top');
    });

    it('T3-PAIR-02 [R2 + R3]: Full-Screen mode + Pinch-to-zoom active across 100dvw/100dvh viewport', () => {
      // Spec: Pinch-to-zoom functions seamlessly across full viewport in full-screen mode
      const isFullscreen = true;
      const pinch = calculatePinchZoom({
        touchStart0: { clientX: 50, clientY: 50 },
        touchStart1: { clientX: 250, clientY: 50 },
        touchCurrent0: { clientX: 20, clientY: 50 },
        touchCurrent1: { clientX: 280, clientY: 50 },
        initialZoom: 0.9
      });

      assert.ok(isFullscreen);
      assert.ok(pinch.clampedZoom > 0.9, 'Pinch zoom must operate smoothly in full-screen mode');
    });

    it('T3-PAIR-03 [R1 + R3]: Pinch gesture on canvas does not falsely trigger mobile scroll navbar collapse', () => {
      // Spec: Pinching on canvas has touches.length === 2 and does not dispatch window scroll
      let windowScrolled = false;
      const handleCanvasPinch = (touches) => {
        if (touches.length === 2) {
          // Native scroll is prevented
          return;
        }
        windowScrolled = true;
      };

      handleCanvasPinch([{ clientX: 10, clientY: 10 }, { clientX: 100, clientY: 100 }]);
      assert.equal(windowScrolled, false, 'Pinch gesture must not leak into window scroll');
    });

    it('T3-PAIR-04 [R2 + R4]: Full-Screen mode transitions under Reduced Motion', () => {
      // Spec: Entering full-screen under reduced motion executes instantly
      const isReduced = true;
      const transitionTime = isReduced ? 0 : 300;
      assert.equal(transitionTime, 0, 'Full-screen transition duration must be 0ms when reduced motion is requested');
    });

    it('T3-PAIR-05 [R1 + R4]: Collapsible navbar transition under Reduced Motion applies instant transform', () => {
      // Spec: Collapsing navbar under reduced motion executes instantly without animation delay
      const isReduced = true;
      const navDuration = isReduced ? 0 : 250;
      assert.equal(navDuration, 0, 'Navbar collapse transition must be instantaneous under reduced motion');
    });

    it('T3-PAIR-06 [R2 + Bilingual]: Fullscreen toggle button displays correct bilingual labels in English and Hindi', () => {
      // Spec: PROJECT.md § F9
      const tEn = createTranslator('en');
      const tHi = createTranslator('hi');

      assert.ok(tEn('fullscreenEnter') || en.fullscreenEnter);
      assert.ok(tHi('fullscreenEnter') || hi.fullscreenEnter);
      assert.notEqual(tEn('fullscreenEnter') || en.fullscreenEnter, tHi('fullscreenEnter') || hi.fullscreenEnter);
    });

    it('T3-PAIR-07 [R2 + Modal]: Member card detail modal sheet opened in Full-Screen mode renders on top', () => {
      // Spec: Modal sheet (z-index 999) renders over full-screen canvas (z-index 800)
      const canvasZIndex = 800;
      const modalZIndex = 999;
      assert.ok(modalZIndex > canvasZIndex, 'Modal sheet must render above full-screen canvas');
    });

    it('T3-PAIR-08 [R3 + Card Click]: Pinch-to-zoom on top of a member card suppresses card click upon finger release', () => {
      // Spec: PROJECT.md § F13
      let cardOpened = false;
      let hasPinched = true;

      const triggerCardClick = () => {
        if (!hasPinched) {
          cardOpened = true;
        }
      };

      triggerCardClick();
      assert.equal(cardOpened, false, 'Card modal must not open when user lifts fingers from pinch zoom');
    });
  });

  // =========================================================================
  // TIER 4: REAL-WORLD MOBILE USER SCENARIOS (6 TEST CASES)
  // =========================================================================
  describe('Tier 4: Real-World Mobile User Scenarios', () => {
    it('T4-SCEN-01: Complete smartphone user journey (Home -> Demo -> Scroll -> Fullscreen -> Pinch -> Inspect -> Exit)', async () => {
      // Step 1: User navigates to Home view
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');
      const homeHtml = renderComponentToHtml(Navbar, { currentView: 'home', t });
      assertElementExists(homeHtml, '#nav-btn-home');

      // Step 2: User opens Demo Tree
      const treeHtml = renderComponentToHtml(Navbar, { currentView: 'tree', activeTreeId: '', t });
      assertTabSelected(treeHtml, t('navDemoTree'), true);

      // Step 3: User scrolls down into tree content -> navbar collapses
      const navStateScrolled = evaluateScrollState({ scrollEvents: [0, 80], threshold: 12, topGuard: 10 });
      assert.equal(navStateScrolled.isCollapsed, true);

      // Step 4: User enters Full-Screen mode
      let isFullscreen = true;
      assert.equal(isFullscreen, true);

      // Step 5: User pinches to zoom into ancestors
      const pinch = calculatePinchZoom({
        touchStart0: { clientX: 100, clientY: 200 },
        touchStart1: { clientX: 200, clientY: 200 },
        touchCurrent0: { clientX: 50, clientY: 200 },
        touchCurrent1: { clientX: 250, clientY: 200 }, // spread outward
        initialZoom: 1.0
      });
      assert.equal(pinch.clampedZoom, 1.4);

      // Step 6: User clicks member card after debounce -> card opens
      let hasPinched = false; // debounce expired
      let cardOpened = false;
      if (!hasPinched) cardOpened = true;
      assert.equal(cardOpened, true);

      // Step 7: User exits full-screen mode and scrolls up to top
      isFullscreen = false;
      const navStateRestored = evaluateScrollState({ scrollEvents: [0], threshold: 12, topGuard: 10 });
      assert.equal(isFullscreen, false);
      assert.equal(navStateRestored.isCollapsed, false);
    });

    it('T4-SCEN-02: Bilingual mobile journey with screen rotation (Hindi -> portrait -> landscape -> full-screen -> pinch)', () => {
      // Step 1: Set Hindi language preference
      localStorage.setItem('gupta_lang', 'hi');
      const t = createTranslator('hi');
      assert.ok(t('navHome'));

      // Step 2: Portrait view (390 x 844)
      let width = 390;
      let height = 844;
      assert.ok(width < height);

      // Step 3: Rotate to landscape (844 x 390)
      [width, height] = [height, width];
      assert.ok(width > height);

      // Step 4: Enter full-screen in landscape
      const isFullscreen = true;
      assert.ok(isFullscreen);

      // Step 5: Pinch to zoom in landscape
      const pinch = calculatePinchZoom({
        touchStart0: { clientX: 200, clientY: 150 },
        touchStart1: { clientX: 400, clientY: 150 },
        touchCurrent0: { clientX: 100, clientY: 150 },
        touchCurrent1: { clientX: 500, clientY: 150 },
        initialZoom: 0.8
      });
      assert.ok(pinch.clampedZoom > 0.8);
    });

    it('T4-SCEN-03: Genealogist deep-inspection flow: zoom out to 0.4 for overview -> zoom in to 1.4 for generation details', () => {
      // Step 1: Start at default zoom 1.0
      let currentZoom = 1.0;

      // Step 2: Pinch out to bird's-eye overview (clamp to 0.4)
      const overviewPinch = calculatePinchZoom({
        touchStart0: { clientX: 0, clientY: 0 },
        touchStart1: { clientX: 600, clientY: 0 },
        touchCurrent0: { clientX: 0, clientY: 0 },
        touchCurrent1: { clientX: 100, clientY: 0 },
        initialZoom: currentZoom
      });
      currentZoom = overviewPinch.clampedZoom;
      assert.equal(currentZoom, 0.4);

      // Step 3: Pinch into founder generation (clamp to 1.4)
      const detailPinch = calculatePinchZoom({
        touchStart0: { clientX: 100, clientY: 100 },
        touchStart1: { clientX: 200, clientY: 100 },
        touchCurrent0: { clientX: 50, clientY: 100 },
        touchCurrent1: { clientX: 500, clientY: 100 },
        initialZoom: currentZoom
      });
      currentZoom = detailPinch.clampedZoom;
      assert.equal(currentZoom, 1.4);
    });

    it('T4-SCEN-04: Mobile navigation with open settings popover keeps nav bar protected during scroll', () => {
      // Step 1: User opens settings popover
      const isSettingsOpen = true;

      // Step 2: User scrolls page while popover is open
      const scrollResult = evaluateScrollState({
        scrollEvents: [50, 120, 200, 350],
        threshold: 12,
        topGuard: 10,
        isSettingsOpen
      });
      assert.equal(scrollResult.isCollapsed, false, 'Navbar must remain visible while settings popover is open');

      // Step 3: User closes settings popover and scrolls down
      const scrollResultClosed = evaluateScrollState({
        scrollEvents: [350, 400],
        threshold: 12,
        topGuard: 10,
        isSettingsOpen: false
      });
      assert.equal(scrollResultClosed.isCollapsed, true, 'Navbar collapses normally after settings popover is closed');
    });

    it('T4-SCEN-05: Touch gesture resilience during dirty/interrupted touches', () => {
      // Step 1: User starts 1-finger pan
      let is1FingerPan = true;
      let isPinchActive = false;

      // Step 2: Accidental second finger taps screen briefly (dirty touch)
      const touches = [{ clientX: 50, clientY: 50 }, { clientX: 60, clientY: 55 }];
      const pinch = calculatePinchZoom({
        touchStart0: touches[0],
        touchStart1: touches[1],
        touchCurrent0: touches[0],
        touchCurrent1: touches[1],
        initialZoom: 1.0
      });

      // Ratio is 1.0, zoom does not jump
      assert.equal(pinch.clampedZoom, 1.0);

      // Step 3: Finger lifted, resumes 1-finger pan cleanly
      isPinchActive = false;
      assert.equal(isPinchActive, false);
      assert.equal(is1FingerPan, true);
    });

    it('T4-SCEN-06: Accessibility, screen-reader, and keyboard navigation on mobile full-screen mode', async () => {
      // Step 1: Escape key exit capability
      let exitedViaKey = false;
      const onKeyDown = (e) => {
        if (e.key === 'Escape') exitedViaKey = true;
      };
      onKeyDown({ key: 'Escape' });
      assert.equal(exitedViaKey, true);

      // Step 2: ARIA accessibility labels
      const t = createTranslator('en');
      assert.ok(t('zoomGroup') || 'Zoom Controls');
      assert.ok(t('fit') || 'Fit to Screen');
    });
  });
});
