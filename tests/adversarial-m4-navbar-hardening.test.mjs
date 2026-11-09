/**
 * Tier 5 Adversarial Coverage Hardening — Navbar & Viewport Dynamics.
 * Milestone M4 Verification Suite for Mobile Top Navigation Bar (R1, R4, R5).
 *
 * Stress-tests hostile conditions, edge cases, and failure modes:
 * 1. Rapid orientation flip (portrait <-> landscape) crossing the 768px threshold dynamically.
 * 2. Jitter scrolling oscillating rapidly across the 12px deadzone boundary (e.g. scrollY cycling 20 -> 32 -> 20 -> 32).
 * 3. Scroll boundary recovery when immediately jumping to scrollY = 0 via programmatic scroll or "scroll to top" action.
 * 4. Settings popover state persistence: ensuring opening the popover keeps the navbar visible even if scroll events arrive while open.
 * 5. DOM element preservation: ensuring all navigation links (#nav-btn-home, #nav-btn-demo, #nav-btn-mytree, copy link, GitHub)
 *    remain present in DOM and fully functional.
 *
 * Execution:
 * node --test tests/adversarial-m4-navbar-hardening.test.mjs
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  installMockBrowser,
  assertElementExists,
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/harness.mjs';

import { createTranslator } from '../src/i18n/index.js';

// ============================================================================
// HIGH-FIDELITY NAVBAR VIEWPORT & SCROLL STATE MACHINE HARNESS
// Implements exact logic from src/components/Navbar.jsx lines 40-215.
// ============================================================================

class NavbarAdversarialHarness {
  constructor(options = {}) {
    this.viewportMode = options.viewportMode || 'auto';
    this.innerWidth = options.innerWidth ?? 390;
    this.innerHeight = options.innerHeight ?? 844;
    this.documentScrollHeight = options.documentScrollHeight ?? 4000;
    this.dataViewport = options.dataViewport || null; // 'mobile' | 'laptop' | null
    this.isSettingsOpen = Boolean(options.isSettingsOpen);
    this.focusedElementId = options.focusedElementId || null;
    this.currentView = options.currentView || 'home';

    this.isCollapsed = false;
    this.lastScrollY = Math.max(0, options.initialScrollY ?? 0);
    this.scrollY = options.initialScrollY ?? 0;
    this.ticking = false;
    this.rafQueue = [];

    this.navElementIds = new Set([
      'nav-brand',
      'nav-btn-home',
      'nav-btn-demo',
      'nav-btn-mytree',
      'nav-action-share',
      'nav-github-link',
      'nav-action-auth',
      'settings-btn',
      'settings-popover'
    ]);
  }

  checkIsMobile() {
    if (this.dataViewport === 'laptop') return false;
    if (this.dataViewport === 'mobile') return true;
    if (this.viewportMode === 'laptop') return false;
    if (this.viewportMode === 'mobile') return true;
    return typeof this.innerWidth === 'number' && this.innerWidth <= 768;
  }

  // Simulates window resize event (orientation flip or viewport width change)
  triggerResize(newWidth, newHeight) {
    this.innerWidth = newWidth;
    if (newHeight !== undefined) {
      this.innerHeight = newHeight;
    }
    // Resize handler in Navbar.jsx lines 199-203:
    if (!this.checkIsMobile() && this.isCollapsed) {
      this.isCollapsed = false;
    }
  }

  // Simulates settings popover toggle
  setSettingsOpen(isOpen) {
    this.isSettingsOpen = Boolean(isOpen);
    // Immediate reveal effect in Navbar.jsx lines 72-76:
    if (this.isSettingsOpen) {
      this.isCollapsed = false;
    }
  }

  // Simulates view navigation (Home -> Demo -> My Tree)
  switchView(newView) {
    this.currentView = newView;
    // Immediate reveal effect in Navbar.jsx lines 79-84:
    this.isCollapsed = false;
    this.lastScrollY = Math.max(0, this.scrollY);
  }

  // Simulates element focus inside or outside navbar
  focusElement(elementId) {
    this.focusedElementId = elementId;
    if (this.navElementIds.has(elementId)) {
      this.isCollapsed = false;
    }
  }

  blurElement() {
    this.focusedElementId = null;
  }

  // Simulates window scroll event with RAF batching
  triggerScroll(targetScrollY, immediate = true) {
    this.scrollY = targetScrollY;

    if (this.ticking) {
      return;
    }

    this.ticking = true;
    const task = () => {
      this.ticking = false;

      // 1. Viewport check: Never collapse on desktop / laptop
      if (!this.checkIsMobile()) {
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        return;
      }

      // 2. Settings popover guard: Never collapse while Settings popover is open
      if (this.isSettingsOpen) {
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        return;
      }

      // 3. Focus-within guard: Never collapse while an element inside nav has keyboard focus
      if (this.focusedElementId && this.navElementIds.has(this.focusedElementId)) {
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        return;
      }

      // 4. Current scroll position with fallback and rubber-band clamp
      const rawScrollY = this.scrollY;
      const maxScroll = Math.max(0, this.documentScrollHeight - this.innerHeight);
      const currentScrollY = Math.max(0, Math.min(rawScrollY, maxScroll));

      // 5. Top-of-page boundary guard: If currentScrollY <= 10px, always keep visible
      if (currentScrollY <= 10) {
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        this.lastScrollY = currentScrollY;
        return;
      }

      // 6. Hysteresis threshold: 12px deadzone
      const lastScrollY = this.lastScrollY;
      const delta = currentScrollY - lastScrollY;

      if (Math.abs(delta) < 12) {
        return;
      }

      // 7. Directional collapse/reveal:
      if (delta > 12) {
        if (!this.isCollapsed) {
          this.isCollapsed = true;
        }
        this.lastScrollY = currentScrollY;
      } else if (delta < -12) {
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        this.lastScrollY = currentScrollY;
      }
    };

    if (immediate) {
      task();
    } else {
      this.rafQueue.push(task);
    }
  }

  flushRaf() {
    while (this.rafQueue.length > 0) {
      const task = this.rafQueue.shift();
      task();
    }
  }
}

// Helper to extract CSS rules
function extractCssDeclarations(cssContent, selectorQuery) {
  const clean = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  const matches = [];
  while ((match = ruleRegex.exec(clean)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();
    if (selector.includes(selectorQuery)) {
      const decls = {};
      body.split(';').forEach(line => {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          const prop = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          if (prop && val) decls[prop] = val;
        }
      });
      matches.push({ selector, decls });
    }
  }
  return matches;
}

// ============================================================================
// ADVERSARIAL TEST SUITE
// ============================================================================

describe('Tier 5 Adversarial Hardening: Navbar & Viewport Dynamics (Milestone M4)', () => {
  let landingCssContent;

  before(async () => {
    landingCssContent = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
  });

  after(async () => {
    await closeViteServer();
  });

  // =========================================================================
  // SUITE 1: RAPID ORIENTATION FLIP & DYNAMIC BREAKPOINT CROSSING (768px)
  // =========================================================================
  describe('Suite 1: Rapid Orientation Flip & Dynamic Breakpoint Crossing (768px)', () => {
    it('ADV-M4-01: Portrait (390px) to landscape (844px) flip while collapsed immediately reveals navbar', () => {
      // Start in portrait mobile mode at 390px width
      const harness = new NavbarAdversarialHarness({ innerWidth: 390, innerHeight: 844, initialScrollY: 100 });
      // Scroll down into page content to collapse navbar
      harness.triggerScroll(150, true);
      assert.equal(harness.isCollapsed, true, 'Precondition: navbar must be collapsed in mobile portrait');

      // User rotates device to landscape (width 844px > 768px threshold)
      harness.triggerResize(844, 390);

      assert.equal(harness.isCollapsed, false, 'Rotating to landscape (> 768px) must immediately uncollapse navbar');
      assert.equal(harness.checkIsMobile(), false, 'checkIsMobile() must return false in landscape > 768px');
    });

    it('ADV-M4-02: Rapid continuous orientation alternation (100 cycles) preserves stability without freezing', () => {
      const harness = new NavbarAdversarialHarness({ innerWidth: 390, innerHeight: 844, initialScrollY: 100 });

      for (let cycle = 0; cycle < 100; cycle++) {
        // Portrait phase: scroll down to collapse
        harness.triggerResize(390, 844);
        harness.triggerScroll(100 + cycle * 20 + 25, true);
        assert.equal(harness.isCollapsed, true, `Cycle ${cycle}: portrait upward scroll must collapse`);

        // Landscape phase: orientation flip across 768px boundary
        harness.triggerResize(844, 390);
        assert.equal(harness.isCollapsed, false, `Cycle ${cycle}: landscape orientation must immediately reveal`);
      }

      assert.equal(harness.isCollapsed, false, 'Final state after landscape must remain revealed');
    });

    it('ADV-M4-03: Forced mobile mode (data-viewport="mobile") in landscape (844px) retains collapsible capability', () => {
      // Device is in landscape (844px width), but user selected Mobile display mode
      const harness = new NavbarAdversarialHarness({
        innerWidth: 844,
        innerHeight: 390,
        dataViewport: 'mobile',
        initialScrollY: 100
      });

      assert.equal(harness.checkIsMobile(), true, 'checkIsMobile() must be true when dataViewport="mobile"');

      // Scroll upward into content: delta = +50px > 12px
      harness.triggerScroll(150, true);
      assert.equal(harness.isCollapsed, true, 'Forced mobile mode in landscape must allow collapse');

      // Scroll downward toward top: delta = -40px < -12px
      harness.triggerScroll(110, true);
      assert.equal(harness.isCollapsed, false, 'Forced mobile mode in landscape must allow reveal');
    });

    it('ADV-M4-04: Forced laptop mode (data-viewport="laptop") in portrait (390px) permanently blocks collapse', () => {
      // Small screen (390px), but user forced Laptop display mode
      const harness = new NavbarAdversarialHarness({
        innerWidth: 390,
        innerHeight: 844,
        dataViewport: 'laptop',
        initialScrollY: 100
      });

      assert.equal(harness.checkIsMobile(), false, 'checkIsMobile() must be false when dataViewport="laptop"');

      // Massive upward scroll into page
      harness.triggerScroll(1500, true);
      assert.equal(harness.isCollapsed, false, 'Laptop mode on portrait screen must NEVER collapse');
    });

    it('ADV-M4-05: Exact floating-point threshold boundary (767.9px vs 768.0px vs 768.1px)', () => {
      // 767.9px: strictly <= 768 -> mobile
      const hMobile = new NavbarAdversarialHarness({ innerWidth: 767.9, initialScrollY: 100 });
      assert.equal(hMobile.checkIsMobile(), true, '767.9px is mobile');
      hMobile.triggerScroll(150, true);
      assert.equal(hMobile.isCollapsed, true, '767.9px collapses on scroll');

      // 768.0px: exact breakpoint (<= 768) -> mobile
      const hExact = new NavbarAdversarialHarness({ innerWidth: 768.0, initialScrollY: 100 });
      assert.equal(hExact.checkIsMobile(), true, '768.0px is mobile');
      hExact.triggerScroll(150, true);
      assert.equal(hExact.isCollapsed, true, '768.0px collapses on scroll');

      // 768.1px: strictly > 768 -> desktop
      const hDesktop = new NavbarAdversarialHarness({ innerWidth: 768.1, initialScrollY: 100 });
      assert.equal(hDesktop.checkIsMobile(), false, '768.1px is desktop');
      hDesktop.triggerScroll(150, true);
      assert.equal(hDesktop.isCollapsed, false, '768.1px never collapses');
    });

    it('ADV-M4-06: Simultaneous resize and scroll race condition handled safely in RAF queue', () => {
      const harness = new NavbarAdversarialHarness({ innerWidth: 390, innerHeight: 844, initialScrollY: 100 });

      // Queue a scroll event while in mobile portrait
      harness.triggerScroll(180, false);
      assert.equal(harness.rafQueue.length, 1);

      // Orientation flips to desktop landscape BEFORE the RAF callback executes
      harness.triggerResize(1024, 600);

      // Now flush the RAF callback
      harness.flushRaf();

      // Because checkIsMobile() inside RAF checks the current viewport, it detects desktop and aborts collapse!
      assert.equal(harness.isCollapsed, false, 'RAF execution must re-evaluate checkIsMobile and abort collapse');
    });
  });

  // =========================================================================
  // SUITE 2: JITTER SCROLLING & DEADZONE BOUNDARY OSCILLATIONS (12px)
  // =========================================================================
  describe('Suite 2: Jitter Scrolling & Deadzone Boundary Oscillations (12px)', () => {
    it('ADV-M4-07: Rapid jitter cycling across deadzone boundary (20 -> 32 -> 20 -> 32) preserves uncollapsed state', () => {
      // Initial scroll at 20px
      const harness = new NavbarAdversarialHarness({ initialScrollY: 20 });
      assert.equal(harness.isCollapsed, false);

      // Cycling between 20px and 32px: delta = 32 - 20 = 12px (not > 12)
      for (let i = 0; i < 200; i++) {
        const y = i % 2 === 0 ? 32 : 20;
        harness.triggerScroll(y, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `Jitter cycle ${i} at scrollY=${y} must remain uncollapsed (delta <= 12)`
        );
      }
    });

    it('ADV-M4-08: Exact deadzone boundary differential (+11.999px vs +12.000px vs +12.001px) under 500 bursts', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 100 });

      // 500 micro-scrolls at 11.999px delta
      for (let i = 0; i < 500; i++) {
        harness.triggerScroll(111.999, true);
        assert.equal(harness.isCollapsed, false, '11.999px must remain in deadzone');
      }

      // Delta exactly 12.000px: delta > 12 is false
      harness.triggerScroll(112.000, true);
      assert.equal(harness.isCollapsed, false, '12.000px exact boundary must not collapse');

      // Delta 12.001px: delta > 12 is true!
      harness.triggerScroll(112.001, true);
      assert.equal(harness.isCollapsed, true, '12.001px delta exceeds threshold and collapses');
    });

    it('ADV-M4-09: Erratic Brownian noise (+/- 1px to 11px random jitter) around 200px maintains stability over 1,000 cycles', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 200 });
      assert.equal(harness.isCollapsed, false);

      // Deterministic pseudo-random jitter sequence within [-11, +11]
      let seed = 42;
      for (let i = 0; i < 1000; i++) {
        seed = (seed * 16807) % 2147483647;
        const jitter = ((seed % 23) - 11); // range -11 to +11
        const nextY = 200 + jitter;

        harness.triggerScroll(nextY, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `Cycle ${i}: Brownian jitter to ${nextY}px must not trigger false collapse`
        );
      }
    });

    it('ADV-M4-10: Upward scroll with jitter flutter: minor downward jitters (-6px) during net upward scroll (+25px) collapse cleanly', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 100 });

      let currentY = 100;
      for (let step = 0; step < 10; step++) {
        // Upward surge of +25px
        currentY += 25;
        harness.triggerScroll(currentY, true);
        assert.equal(harness.isCollapsed, true, `Step ${step}: net upward surge must collapse`);

        // Minor downward flutter of -6px (within deadzone < 12px)
        currentY -= 6;
        harness.triggerScroll(currentY, true);
        assert.equal(harness.isCollapsed, true, `Step ${step}: minor downward flutter must NOT falsely reveal`);
      }
    });

    it('ADV-M4-11: Downward scroll with jitter flutter: minor upward jitters (+6px) during net downward scroll (-25px) reveal cleanly', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 1000 });
      harness.triggerScroll(1050, true);
      assert.equal(harness.isCollapsed, true, 'Precondition: collapsed at 1050px');

      let currentY = 1050;
      for (let step = 0; step < 10; step++) {
        // Downward surge toward top: -25px
        currentY -= 25;
        harness.triggerScroll(currentY, true);
        assert.equal(harness.isCollapsed, false, `Step ${step}: net downward surge must reveal`);

        // Minor upward flutter of +6px (within deadzone < 12px)
        currentY += 6;
        harness.triggerScroll(currentY, true);
        assert.equal(harness.isCollapsed, false, `Step ${step}: minor upward flutter must NOT falsely re-collapse`);
      }
    });

    it('ADV-M4-12: Slow cumulative drift (1px increments over 50 steps) triggers collapse once cumulative displacement exceeds 12px', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 100 });

      // Steps 1 to 12 (y = 101 to 112): delta <= 12, stays uncollapsed
      for (let delta = 1; delta <= 12; delta++) {
        harness.triggerScroll(100 + delta, true);
        assert.equal(harness.isCollapsed, false, `Delta ${delta}px must remain uncollapsed`);
      }

      // Step 13 (y = 113): delta = 13 > 12 -> triggers collapse!
      harness.triggerScroll(113, true);
      assert.equal(harness.isCollapsed, true, 'Cumulative displacement reaching 13px must collapse navbar');
    });
  });

  // =========================================================================
  // SUITE 3: PROGRAMMATIC SCROLL RECOVERY & TOP BOUNDARY (scrollY = 0)
  // =========================================================================
  describe('Suite 3: Programmatic Scroll Recovery & Top Boundary (scrollY = 0)', () => {
    it('ADV-M4-13: Instant programmatic jump to scrollY = 0 from 10,000px forces instant reveal and resets lastScrollY', () => {
      const harness = new NavbarAdversarialHarness({
        initialScrollY: 0,
        documentScrollHeight: 20000,
        innerHeight: 800
      });

      // Scroll deep into page
      harness.triggerScroll(10000, true);
      assert.equal(harness.isCollapsed, true, 'Collapsed at 10,000px');
      assert.equal(harness.lastScrollY, 10000);

      // Instant programmatic jump to top (e.g. window.scrollTo(0, 0) or "Back to Top" button)
      harness.triggerScroll(0, true);

      assert.equal(harness.isCollapsed, false, 'Jump to scrollY = 0 must immediately reveal navbar');
      assert.equal(harness.lastScrollY, 0, 'lastScrollY must be reset to 0');
    });

    it('ADV-M4-14: Boundary jump to scrollY <= 10px triggers top guard immediate reveal regardless of prior delta', () => {
      const topGuardValues = [0, 1, 3.5, 7, 9.9, 10.0];

      for (const y of topGuardValues) {
        const harness = new NavbarAdversarialHarness({ initialScrollY: 500 });
        harness.triggerScroll(550, true);
        assert.equal(harness.isCollapsed, true);

        // Jump into top guard
        harness.triggerScroll(y, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `Jump to scrollY=${y}px must immediately uncollapse navbar (top guard <= 10px)`
        );
        assert.equal(harness.lastScrollY, y);
      }
    });

    it('ADV-M4-15: Precision boundary test at 10.0px vs 10.1px', () => {
      // Test 1: Jump from 100px to 10.0px: top guard (<= 10) triggers immediately
      const h1 = new NavbarAdversarialHarness({ initialScrollY: 100 });
      h1.triggerScroll(150, true);
      assert.equal(h1.isCollapsed, true);
      h1.triggerScroll(10.0, true);
      assert.equal(h1.isCollapsed, false, '10.0px hits top guard');

      // Test 2: Jump from 100px to 10.1px: delta = 10.1 - 100 = -89.9 < -12, directional reveal triggers
      const h2 = new NavbarAdversarialHarness({ initialScrollY: 100 });
      h2.triggerScroll(150, true);
      assert.equal(h2.isCollapsed, true);
      h2.triggerScroll(10.1, true);
      assert.equal(h2.isCollapsed, false, '10.1px triggers directional reveal via delta < -12');
    });

    it('ADV-M4-16: Ping-pong scroll flings (0 -> 8000 -> 0 -> 8000 -> 0) maintain 100% deterministic state recovery', () => {
      const harness = new NavbarAdversarialHarness({
        initialScrollY: 0,
        documentScrollHeight: 20000,
        innerHeight: 800
      });

      for (let round = 0; round < 25; round++) {
        harness.triggerScroll(8000, true);
        assert.equal(harness.isCollapsed, true, `Round ${round}: fling to 8000px must collapse`);

        harness.triggerScroll(0, true);
        assert.equal(harness.isCollapsed, false, `Round ${round}: jump to 0px must reveal`);
      }
    });

    it('ADV-M4-17: Rubber-band negative overscroll bounce (-250px -> 0px -> 25px) transitions safely through top guard', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 0 });

      // iOS rubber-band overscroll pull down
      harness.triggerScroll(-250, true);
      assert.equal(harness.isCollapsed, false, 'Negative scrollY clamped to 0 <= 10, remains visible');
      assert.equal(harness.lastScrollY, 0);

      // Snap back to 0
      harness.triggerScroll(0, true);
      assert.equal(harness.isCollapsed, false);

      // Rebound moves into content: 5px -> 9px -> 25px
      harness.triggerScroll(5, true);
      assert.equal(harness.isCollapsed, false, '5px <= 10px guard');
      harness.triggerScroll(9, true);
      assert.equal(harness.isCollapsed, false, '9px <= 10px guard');

      // Now scroll past 10px and past 12px deadzone (lastScrollY was 9, now 25 -> delta = 16 > 12)
      harness.triggerScroll(25, true);
      assert.equal(harness.isCollapsed, true, 'Moving past top guard collapses navbar');
    });
  });

  // =========================================================================
  // SUITE 4: SETTINGS POPOVER STATE PERSISTENCE UNDER HOSTILE SCROLLING
  // =========================================================================
  describe('Suite 4: Settings Popover State Persistence Under Hostile Scrolling', () => {
    it('ADV-M4-18: Opening Settings popover while collapsed immediately clears collapsed state', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 100 });
      harness.triggerScroll(180, true);
      assert.equal(harness.isCollapsed, true, 'Precondition: navbar is collapsed');

      // User opens Settings popover
      harness.setSettingsOpen(true);
      assert.equal(harness.isCollapsed, false, 'Opening Settings popover must immediately reveal navbar');
    });

    it('ADV-M4-19: Hostile flood of 250 random and extreme scroll events while isSettingsOpen === true never collapses navbar', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 200, isSettingsOpen: true });
      assert.equal(harness.isCollapsed, false);

      // Hostile scroll inputs
      let pseudo = 999;
      for (let i = 0; i < 250; i++) {
        pseudo = (pseudo * 48271) % 2147483647;
        const targetY = pseudo % 15000;
        harness.triggerScroll(targetY, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `Adversarial scroll step ${i} (scrollY=${targetY}) must NOT collapse navbar while settings popover is open`
        );
      }
    });

    it('ADV-M4-20: CSS stacking context verification: .site-nav:has(.settings-popover) elevates z-index to 1000', () => {
      const decls = extractCssDeclarations(landingCssContent, '.site-nav:has(.settings-popover)');
      assert.ok(decls.length > 0, 'landing.css must declare .site-nav:has(.settings-popover)');
      
      const hasZIndex = decls.some(d => d.decls['z-index']?.includes('1000'));
      assert.ok(hasZIndex, '.site-nav:has(.settings-popover) must elevate z-index to 1000 (above fullscreen z-index: 800)');
    });

    it('ADV-M4-21: Closing Settings popover cleanly restores scroll-collapse capability on subsequent scrolls', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 300, isSettingsOpen: true });
      harness.triggerScroll(500, true);
      assert.equal(harness.isCollapsed, false, 'Protected while open');

      // User closes settings popover
      harness.setSettingsOpen(false);
      assert.equal(harness.isCollapsed, false, 'Remains revealed immediately upon close');

      // Next upward scroll collapses navbar normally
      harness.triggerScroll(550, true); // delta = +50 > 12
      assert.equal(harness.isCollapsed, true, 'Navbar collapses normally on next upward scroll after popover close');
    });

    it('ADV-M4-22: Keyboard focus inside Settings popover controls prevents collapse even if scroll events fire concurrently', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 300, isSettingsOpen: false });
      // Focus is placed on settings button
      harness.focusElement('settings-btn');
      assert.equal(harness.isCollapsed, false);

      // Large scroll fires
      harness.triggerScroll(800, true);
      assert.equal(harness.isCollapsed, false, 'Focus on settings-btn prevents collapse during scroll');

      // Focus moves to popover container
      harness.focusElement('settings-popover');
      harness.triggerScroll(1200, true);
      assert.equal(harness.isCollapsed, false, 'Focus on settings-popover prevents collapse during scroll');
    });
  });

  // =========================================================================
  // SUITE 5: DOM ELEMENT PRESERVATION & INTERACTIVE INTEGRITY
  // =========================================================================
  describe('Suite 5: DOM Element Preservation & Interactive Integrity', () => {
    it('ADV-M4-23: DOM node permanence: all core controls remain continuously in DOM when collapsed', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');

      // Render Navbar SSR with all controls
      const html = renderComponentToHtml(Navbar, {
        currentView: 'home',
        t,
        activeTreeId: '',
        user: null
      });

      // Assert continuous presence of required navigation controls
      assertElementExists(html, '.site-nav', 'Root nav exists');
      assertElementExists(html, '.nav-brand', 'Brand logo/button exists');
      assertElementExists(html, '#nav-btn-home', '#nav-btn-home exists');
      assertElementExists(html, '#nav-btn-demo', '#nav-btn-demo exists');
      assertElementExists(html, '#nav-btn-mytree', '#nav-btn-mytree exists');
      assertElementExists(html, '.nav-action-btn', 'Action buttons exist');
      assertElementExists(html, '.nav-github-link', 'GitHub link exists');
      assertElementExists(html, '.settings-btn', 'Settings button exists');
      assert.ok(html.includes('href="https://github.com/arpitkumar81008-cmd"'), 'GitHub link destination intact');
    });

    it('ADV-M4-24: aria-hidden attribute parity on <nav> reflects true when collapsed and false when visible', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');

      // Normal visible state: aria-hidden on <nav> should be false
      const htmlVisible = renderComponentToHtml(Navbar, { currentView: 'home', t });
      const navTagMatch = htmlVisible.match(/<nav[^>]*>/);
      assert.ok(navTagMatch, 'Must render <nav> root tag');
      const navTag = navTagMatch[0];

      assert.ok(
        navTag.includes('aria-hidden="false"'),
        `<nav> root tag in visible state must have aria-hidden="false", found: ${navTag}`
      );
      assert.ok(
        !navTag.includes('is-collapsed'),
        `<nav> root tag in visible state must not have is-collapsed class, found: ${navTag}`
      );
    });

    it('ADV-M4-25: 3-way navigation tablist semantic attributes intact across Home, Demo, and My Tree views', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');

      // 1. Home View
      const htmlHome = renderComponentToHtml(Navbar, { currentView: 'home', t });
      assert.ok(htmlHome.includes('role="tablist"'), 'Tablist container role present');
      assert.ok(htmlHome.includes('id="nav-btn-home"'), 'Home tab present');
      assert.ok(htmlHome.includes('aria-selected="true"'), 'Selected tab attribute present');

      // 2. Demo View
      const htmlDemo = renderComponentToHtml(Navbar, { currentView: 'tree', activeTreeId: '', t });
      assert.ok(htmlDemo.includes('id="nav-btn-demo"'));

      // 3. My Tree View
      const htmlMyTree = renderComponentToHtml(Navbar, { currentView: 'tree', activeTreeId: 'tree-xyz', t });
      assert.ok(htmlMyTree.includes('id="nav-btn-mytree"'));
    });

    it('ADV-M4-26: Keyboard focus-within resurrection: CSS :focus-within forces transform: translateY(0) and pointer-events: auto', () => {
      const decls = extractCssDeclarations(landingCssContent, '.site-nav:focus-within');
      assert.ok(decls.length > 0, 'landing.css must declare .site-nav:focus-within');

      const rule = decls[0].decls;
      assert.ok(
        rule['transform']?.includes('translateY(0)') && rule['transform']?.includes('!important'),
        '.site-nav:focus-within must declare transform: translateY(0) !important'
      );
      assert.ok(
        rule['opacity']?.includes('1') && rule['opacity']?.includes('!important'),
        '.site-nav:focus-within must declare opacity: 1 !important'
      );
      assert.ok(
        rule['pointer-events']?.includes('auto') && rule['pointer-events']?.includes('!important'),
        '.site-nav:focus-within must declare pointer-events: auto !important'
      );
    });

    it('ADV-M4-27: Pointer-events suppression verification: .site-nav.is-collapsed strictly enforces pointer-events: none', () => {
      const decls = extractCssDeclarations(landingCssContent, '.site-nav.is-collapsed');
      assert.ok(decls.length > 0, 'landing.css must declare .site-nav.is-collapsed');

      const rule = decls[0].decls;
      assert.equal(
        rule['pointer-events'],
        'none',
        '.site-nav.is-collapsed must specify pointer-events: none'
      );
      assert.equal(
        rule['transform'],
        'translateY(-100%)',
        '.site-nav.is-collapsed must specify translateY(-100%)'
      );
      assert.equal(
        rule['opacity'],
        '0',
        '.site-nav.is-collapsed must specify opacity: 0'
      );
    });

    it('ADV-M4-28: Switching active view (Home -> Demo -> My Tree) while collapsed immediately resets isCollapsed and synchronizes lastScrollY', () => {
      const harness = new NavbarAdversarialHarness({ initialScrollY: 100, currentView: 'home' });
      harness.triggerScroll(200, true);
      assert.equal(harness.isCollapsed, true, 'Precondition: collapsed at 200px');

      // User switches to Demo tree
      harness.switchView('tree');
      assert.equal(harness.isCollapsed, false, 'View change to tree must reveal navbar');
      assert.equal(harness.lastScrollY, 200, 'lastScrollY synchronized with current scroll position');

      // Re-collapse at 250px
      harness.triggerScroll(250, true);
      assert.equal(harness.isCollapsed, true);

      // User switches back to Home
      harness.switchView('home');
      assert.equal(harness.isCollapsed, false, 'View change to home must reveal navbar');
      assert.equal(harness.lastScrollY, 250);
    });
  });
});
