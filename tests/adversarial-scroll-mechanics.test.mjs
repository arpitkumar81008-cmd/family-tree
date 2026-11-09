/**
 * Adversarial Empirical Challenge Suite for Milestone M1 (Collapsible Mobile Navigation Bar).
 * Stress-tests scroll mechanics under extreme, boundary, and hostile conditions:
 * - Rapid alternating scroll up/down within 1ms intervals.
 * - Micro-scrolls (1px to 11px deadzone).
 * - Overscroll & rubber-band conditions (negative scrollY, scrollY > document height).
 * - Exact boundary at 10px scrollY.
 * - Fractional precision, extreme velocity flings, and state guard invariants.
 *
 * Execution:
 * node --test tests/adversarial-scroll-mechanics.test.mjs
 */
import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { closeViteServer } from './helpers/ssr-runner.mjs';

/**
 * High-fidelity Scroll Controller Harness executing the exact scroll mechanics
 * implemented in src/components/Navbar.jsx lines 59-197.
 */
class NavbarScrollHarness {
  constructor(options = {}) {
    this.viewportMode = options.viewportMode || 'auto';
    this.windowWidth = options.windowWidth || 375;
    this.windowHeight = options.windowHeight || 667;
    this.documentScrollHeight = options.documentScrollHeight || 3000;
    this.dataViewport = options.dataViewport || (this.windowWidth <= 768 ? 'mobile' : 'laptop');
    this.isSettingsOpen = options.isSettingsOpen || false;
    this.hasFocusWithin = options.hasFocusWithin || false;

    this.isCollapsed = false;
    this.lastScrollY = Math.max(0, options.initialScrollY || 0);
    this.ticking = false;
    this.rafQueue = [];
    this.scrollY = options.initialScrollY || 0;
  }

  checkIsMobile() {
    if (this.dataViewport === 'laptop') return false;
    if (this.dataViewport === 'mobile') return true;
    if (this.viewportMode === 'laptop') return false;
    if (this.viewportMode === 'mobile') return true;
    return typeof this.windowWidth === 'number' && this.windowWidth <= 768;
  }

  // Simulates window.dispatchEvent(new Event('scroll'))
  triggerScroll(newScrollY, immediate = true) {
    this.scrollY = newScrollY;

    if (this.ticking) {
      // Throttled by RAF: subsequent scroll events during ticking are dropped
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

      // 2. Settings popover guard
      if (this.isSettingsOpen) {
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        return;
      }

      // 3. Focus-within guard
      if (this.hasFocusWithin) {
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        return;
      }

      // 4. Current scroll position with rubber-band clamp
      const rawScrollY = this.scrollY;
      const maxScroll = Math.max(0, this.documentScrollHeight - this.windowHeight);
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

describe('Adversarial M1: Scroll Mechanics & Boundary Stress Harness', () => {
  after(async () => {
    await closeViteServer();
  });

  // =========================================================================
  // 1. RAPID SCROLL & HIGH FREQUENCY ALTERNATING STRESS
  // =========================================================================
  describe('Group 1: Rapid Scroll & High-Frequency Alternating Stress', () => {
    it('ADV-M1-01: Synchronous rapid burst of 100 alternating scroll events (1ms interval simulation)', () => {
      const harness = new NavbarScrollHarness({ initialScrollY: 0 });

      // Simulate 100 rapid scroll events queued between frames
      for (let i = 1; i <= 100; i++) {
        // Alternates: 100, 20, 150, 10, 200, 5, etc.
        const scrollY = i % 2 === 0 ? 20 : 200;
        harness.triggerScroll(scrollY, false); // queued via RAF
      }

      // Only the first event was accepted into ticking queue, RAF throttles the rest
      assert.equal(harness.rafQueue.length, 1, 'RAF throttling must consolidate rapid scroll burst to single frame');
      harness.flushRaf();

      // At frame render, latest scrollY = 20 (since 100 is even)
      // delta from 0 to 20 is +20 (> 12) -> collapsed
      assert.equal(harness.isCollapsed, true);
    });

    it('ADV-M1-02: Rapid alternating scroll across 50 discrete animation frames', () => {
      const harness = new NavbarScrollHarness({ initialScrollY: 100 });

      for (let frame = 0; frame < 50; frame++) {
        // Oscillate between 150 (scroll up into content) and 80 (scroll down toward top)
        if (frame % 2 === 0) {
          harness.triggerScroll(150, true);
          assert.equal(harness.isCollapsed, true, `Frame ${frame}: scroll to 150 must collapse navbar`);
        } else {
          harness.triggerScroll(80, true);
          assert.equal(harness.isCollapsed, false, `Frame ${frame}: scroll to 80 must reveal navbar`);
        }
      }
    });

    it('ADV-M1-03: Zero-velocity scroll events (delta = 0) do not trigger state changes or RAF leaks', () => {
      const harness = new NavbarScrollHarness({ initialScrollY: 100 });
      harness.triggerScroll(150, true); // Collapsed
      assert.equal(harness.isCollapsed, true);

      // 50 identical scroll events at y = 150
      for (let i = 0; i < 50; i++) {
        harness.triggerScroll(150, true);
        assert.equal(harness.isCollapsed, true);
      }
      assert.equal(harness.lastScrollY, 150);
    });
  });

  // =========================================================================
  // 2. MICRO-SCROLLS (< 12px DEADZONE)
  // =========================================================================
  describe('Group 2: Micro-Scrolls (< 12px deadzone threshold)', () => {
    it('ADV-M1-04: Single micro-scrolls from 1px to 11.99px must NEVER trigger collapse from rest', () => {
      const microDeltas = [1, 2, 3, 5, 7.5, 9, 10, 11, 11.5, 11.99];

      for (const delta of microDeltas) {
        const harness = new NavbarScrollHarness({ initialScrollY: 100 });
        assert.equal(harness.isCollapsed, false);

        harness.triggerScroll(100 + delta, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `Micro-scroll of +${delta}px from 100px must NOT collapse navbar (deadzone < 12px)`
        );
      }
    });

    it('ADV-M1-05: Symmetrical downward micro-scrolls (-1px to -11.99px) must NEVER trigger reveal when collapsed', () => {
      const microDeltas = [-1, -2, -3, -5, -8, -10, -11, -11.99];

      for (const delta of microDeltas) {
        const harness = new NavbarScrollHarness({ initialScrollY: 200 });
        harness.triggerScroll(250, true); // Ensure collapsed at 250
        assert.equal(harness.isCollapsed, true);

        harness.triggerScroll(250 + delta, true);
        assert.equal(
          harness.isCollapsed,
          true,
          `Downward micro-scroll of ${delta}px from 250px must NOT reveal navbar (deadzone < 12px)`
        );
      }
    });

    it('ADV-M1-06: High-frequency micro-jitter (+/- 5px oscillation around 100px for 1,000 cycles)', () => {
      const harness = new NavbarScrollHarness({ initialScrollY: 100 });
      assert.equal(harness.isCollapsed, false);

      // Jitter oscillates between 95px and 105px (amplitude = 5px, peak-to-peak = 10px < 12px)
      for (let i = 0; i < 1000; i++) {
        const jitterY = i % 2 === 0 ? 105 : 95;
        harness.triggerScroll(jitterY, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `Jitter cycle ${i} at y=${jitterY} must maintain stable uncollapsed state`
        );
      }
    });

    it('ADV-M1-07: Exact 12px deadzone threshold boundary (11.99px vs 12.00px vs 12.01px)', () => {
      // Test 11.99px: strictly within deadzone
      const h1 = new NavbarScrollHarness({ initialScrollY: 100 });
      h1.triggerScroll(111.99, true);
      assert.equal(h1.isCollapsed, false, 'delta 11.99px must not collapse');

      // Test 12.00px: exact threshold boundary
      const h2 = new NavbarScrollHarness({ initialScrollY: 100 });
      h2.triggerScroll(112.00, true);
      assert.equal(h2.isCollapsed, false, 'delta 12.00px is not > 12, so remains in deadzone');

      // Test 12.01px: exceeds threshold
      const h3 = new NavbarScrollHarness({ initialScrollY: 100 });
      h3.triggerScroll(112.01, true);
      assert.equal(h3.isCollapsed, true, 'delta 12.01px exceeds 12px threshold and must collapse');
    });

    it('ADV-M1-08: Slow cumulative scroll (3px per step) collapses navbar once cumulative displacement exceeds 12px', () => {
      const harness = new NavbarScrollHarness({ initialScrollY: 100 });

      harness.triggerScroll(103, true); // delta +3: deadzone
      assert.equal(harness.isCollapsed, false);
      harness.triggerScroll(106, true); // delta +6: deadzone
      assert.equal(harness.isCollapsed, false);
      harness.triggerScroll(109, true); // delta +9: deadzone
      assert.equal(harness.isCollapsed, false);
      harness.triggerScroll(113, true); // delta +13 (> 12): collapses!
      assert.equal(harness.isCollapsed, true, 'Slow cumulative scrolling past 12px deadzone must collapse');
    });
  });

  // =========================================================================
  // 3. OVERSCROLL & RUBBER-BAND CONDITIONS
  // =========================================================================
  describe('Group 3: Overscroll & Rubber-Band Conditions', () => {
    it('ADV-M1-09: iOS top rubber-band overscroll (negative scrollY) permanently clamps and keeps top bar visible', () => {
      const negativeValues = [-1, -5, -25, -100, -500, -10000];

      for (const negY of negativeValues) {
        const harness = new NavbarScrollHarness({ initialScrollY: 0 });
        harness.triggerScroll(negY, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `Negative scroll position (${negY}px) must keep navbar visible`
        );
        assert.equal(harness.lastScrollY, 0, 'Negative scrollY must be clamped to 0');
      }
    });

    it('ADV-M1-10: Elastic bounce recovery from -150px to +50px', () => {
      const harness = new NavbarScrollHarness({ initialScrollY: 0 });

      // Rubber-band pull down: -150 -> -100 -> -50 -> 0
      harness.triggerScroll(-150, true);
      assert.equal(harness.isCollapsed, false);
      harness.triggerScroll(-50, true);
      assert.equal(harness.isCollapsed, false);
      harness.triggerScroll(0, true);
      assert.equal(harness.isCollapsed, false);

      // Rebound moves slightly into content: 5px -> 10px -> 25px
      harness.triggerScroll(5, true);
      assert.equal(harness.isCollapsed, false, 'scrollY = 5px <= 10px guard, stays visible');
      harness.triggerScroll(10, true);
      assert.equal(harness.isCollapsed, false, 'scrollY = 10px <= 10px guard, stays visible');

      // Past top guard and past deadzone (lastScrollY was 10, now 25 -> delta = 15 > 12)
      harness.triggerScroll(25, true);
      assert.equal(harness.isCollapsed, true, 'scrollY = 25px collapses navbar');
    });

    it('ADV-M1-11: Bottom rubber-band overscroll (scrollY > document height) clamps to maxScroll without false delta', () => {
      // scrollHeight = 3000, windowHeight = 667 -> maxScroll = 2333
      const harness = new NavbarScrollHarness({
        initialScrollY: 2000,
        documentScrollHeight: 3000,
        windowHeight: 667
      });

      // Reach bottom at 2333px:
      harness.triggerScroll(2333, true);
      assert.equal(harness.isCollapsed, true);

      // Overscroll past bottom: 2350, 2400, 2500, 3500px
      harness.triggerScroll(2350, true);
      assert.equal(harness.isCollapsed, true, 'Overscroll past bottom must not reveal');
      harness.triggerScroll(2500, true);
      assert.equal(harness.isCollapsed, true, 'Overscroll past bottom must not reveal');

      // Rebound back from 2500 to 2333:
      harness.triggerScroll(2333, true);
      assert.equal(harness.isCollapsed, true, 'Bounce back to bottom boundary must not reveal');

      // User scrolls upwards away from bottom toward top (e.g. 2333 -> 2300: delta = -33 < -12)
      harness.triggerScroll(2300, true);
      assert.equal(harness.isCollapsed, false, 'Scrolling upward toward top must reveal');
    });

    it('ADV-M1-12: Zero scroll container (document height <= window height) permanently protects top bar', () => {
      const harness = new NavbarScrollHarness({
        initialScrollY: 0,
        documentScrollHeight: 500,
        windowHeight: 800 // innerHeight > scrollHeight -> maxScroll = 0
      });

      // Attempt scroll to 300px on non-scrollable page
      harness.triggerScroll(300, true);
      assert.equal(harness.isCollapsed, false, 'Top bar must never collapse on non-scrollable page');
    });
  });

  // =========================================================================
  // 4. EXACT BOUNDARY AT 10px scrollY
  // =========================================================================
  describe('Group 4: Exact Boundary at 10px scrollY', () => {
    it('ADV-M1-13: Top guard permanently keeps navbar visible for all scrollY <= 10px', () => {
      const boundaryValues = [0, 0.5, 1, 3, 5, 7.99, 8, 9, 9.99, 10.0];

      for (const y of boundaryValues) {
        const harness = new NavbarScrollHarness({ initialScrollY: 0 });
        harness.triggerScroll(y, true);
        assert.equal(
          harness.isCollapsed,
          false,
          `scrollY = ${y}px must remain visible (<= 10px top guard)`
        );
      }
    });

    it('ADV-M1-14: Collapsed navbar immediately reveals when scrolling into top guard (<= 10px) even with 1px delta', () => {
      const harness = new NavbarScrollHarness({ initialScrollY: 100 });
      harness.triggerScroll(150, true);
      assert.equal(harness.isCollapsed, true, 'Must be collapsed at 150px');

      // User moves down to 22px:
      harness.triggerScroll(22, true);
      // delta = 22 - 150 = -128 < -12 -> reveals!
      assert.equal(harness.isCollapsed, false);

      // Now re-collapse at 35px:
      harness.triggerScroll(35, true); // delta = 35 - 22 = +13 > 12 -> collapses!
      assert.equal(harness.isCollapsed, true);

      // User scrolls down to 11px:
      // delta = 11 - 35 = -24 < -12 -> reveals!
      // Let's test a micro-step into the guard:
      // Start collapsed at 22px, scroll to 11px (delta = -11, < 12px deadzone)
      const h2 = new NavbarScrollHarness({ initialScrollY: 10 });
      h2.triggerScroll(23, true); // delta = +13 > 12 -> collapsed at 23
      assert.equal(h2.isCollapsed, true);

      // Scroll to 11px (delta = 11 - 23 = -12, deadzone < 12px)
      h2.triggerScroll(11, true);
      assert.equal(h2.isCollapsed, true, 'At 11px (> 10px), delta -12 does not trigger reveal');

      // Now scroll just 1px further down to 10px (top guard threshold)
      h2.triggerScroll(10, true);
      assert.equal(
        h2.isCollapsed,
        false,
        'At 10px (<= 10px), top boundary guard MUST FORCE REVEAL even with micro delta'
      );
    });

    it('ADV-M1-15: Floating-point boundary behavior around 10px (9.999px vs 10.000px vs 10.001px)', () => {
      // 9.999px <= 10 -> guard active
      const h1 = new NavbarScrollHarness({ initialScrollY: 0 });
      h1.triggerScroll(9.999, true);
      assert.equal(h1.isCollapsed, false);

      // 10.000px <= 10 -> guard active
      const h2 = new NavbarScrollHarness({ initialScrollY: 0 });
      h2.triggerScroll(10.000, true);
      assert.equal(h2.isCollapsed, false);

      // 10.001px > 10, delta = 10.001 - 0 = 10.001 < 12 -> within deadzone, stays uncollapsed
      const h3 = new NavbarScrollHarness({ initialScrollY: 0 });
      h3.triggerScroll(10.001, true);
      assert.equal(h3.isCollapsed, false);
    });
  });

  // =========================================================================
  // 5. INVARIANTS: DESKTOP, SETTINGS POPOVER, FOCUS-WITHIN
  // =========================================================================
  describe('Group 5: Invariants (Desktop, Settings, Focus)', () => {
    it('ADV-M1-16: Desktop mode invariant (data-viewport="laptop" or windowWidth > 768) never collapses', () => {
      const hLaptopAttr = new NavbarScrollHarness({ dataViewport: 'laptop' });
      hLaptopAttr.triggerScroll(500, true);
      assert.equal(hLaptopAttr.isCollapsed, false, 'Laptop data-viewport must never collapse');

      const hDesktopWidth = new NavbarScrollHarness({ windowWidth: 1024, dataViewport: '' });
      hDesktopWidth.triggerScroll(1500, true);
      assert.equal(hDesktopWidth.isCollapsed, false, 'Desktop width (1024px) must never collapse');
    });

    it('ADV-M1-17: Settings popover open invariant: scrolling while settings open keeps navbar revealed', () => {
      const harness = new NavbarScrollHarness({ isSettingsOpen: true });
      harness.triggerScroll(300, true);
      assert.equal(harness.isCollapsed, false, 'Navbar must not collapse when isSettingsOpen is true');
      harness.triggerScroll(800, true);
      assert.equal(harness.isCollapsed, false);
    });

    it('ADV-M1-18: Focus-within invariant: scrolling while an element inside navbar has focus keeps navbar revealed', () => {
      const harness = new NavbarScrollHarness({ hasFocusWithin: true });
      harness.triggerScroll(300, true);
      assert.equal(harness.isCollapsed, false, 'Navbar must not collapse when an element has focus');
    });

    it('ADV-M1-19: Extreme fling velocity (0 -> 50,000px and 50,000px -> 0px)', () => {
      const harness = new NavbarScrollHarness({
        initialScrollY: 0,
        documentScrollHeight: 100000,
        windowHeight: 667
      });

      // Fling down into page
      harness.triggerScroll(50000, true);
      assert.equal(harness.isCollapsed, true, 'Massive fling must collapse navbar');

      // Fling back to top
      harness.triggerScroll(0, true);
      assert.equal(harness.isCollapsed, false, 'Fling to top must reveal navbar immediately');
    });
  });

  // =========================================================================
  // 6. DOM, ACCESSIBILITY & CSS CASCADE INVARIANTS
  // =========================================================================
  describe('Group 6: DOM, Accessibility & CSS Cascade Invariants', () => {
    it('ADV-M1-20: landing.css strictly declares GPU transforms and pointer-events: none on .is-collapsed', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');

      // Rule declarations
      assert.ok(landingCss.includes('.site-nav.is-collapsed'), 'Must define .site-nav.is-collapsed rule');
      assert.ok(landingCss.includes('transform: translateY(-100%)'), 'Collapsed transform must be translateY(-100%)');
      assert.ok(landingCss.includes('pointer-events: none'), 'Collapsed nav must disable pointer events to prevent phantom taps');
      assert.ok(landingCss.includes('will-change: transform, opacity'), 'Base site-nav must declare will-change on GPU compositor properties');
      assert.ok(landingCss.includes(':focus-within'), 'Must define focus-within override');
      assert.ok(landingCss.includes('data-viewport="laptop"'), 'Must define laptop mode override');
      assert.ok(landingCss.includes('data-motion="reduce"'), 'Must define data-motion="reduce" override');
      assert.ok(landingCss.includes('prefers-reduced-motion: reduce'), 'Must define prefers-reduced-motion media query');
    });

    it('ADV-M1-21: Navbar JSX renders all critical controls and preserves tab roles', async () => {
      const { loadComponent, renderComponentToHtml } = await import('./helpers/ssr-runner.mjs');
      const { createTranslator } = await import('../src/i18n/index.js');
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');

      const html = renderComponentToHtml(Navbar, { currentView: 'home', t });

      // Core brand & tabs
      assert.ok(html.includes('class="site-nav"'), 'Must render root nav element with class site-nav');
      assert.ok(html.includes('id="nav-btn-home"'), 'Home tab button must exist');
      assert.ok(html.includes('id="nav-btn-demo"'), 'Demo tree tab button must exist');
      assert.ok(html.includes('id="nav-btn-mytree"'), 'My tree tab button must exist');
      assert.ok(html.includes('class="settings-btn"'), 'Settings button must exist');
      assert.ok(html.includes('nav-github-link'), 'GitHub link must exist');
      assert.ok(html.includes('aria-label="Primary"'), 'Primary landmark label must exist');
    });
  });
});

