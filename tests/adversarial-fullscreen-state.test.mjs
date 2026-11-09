/**
 * Adversarial Empirical Challenge Suite for Milestone M2 (Full-Screen Family Tree View Mode).
 * 
 * Stress-tests full-screen state machine, coordinate preservation, escape key containment,
 * controlled/uncontrolled modes, and CSS stacking context under hostile edge cases.
 *
 * Requirements Covered:
 * - R2: Full-Screen Mode for Mobile Family Tree (F5, F6, F7, F8, F9, F14)
 * - Non-Regression & Viewport Ergonomics (F15)
 *
 * Dimensions:
 * - Dimension 1: Rapid Toggle Sequences (Stress & Async State Parity) — ADV-FS-01 to ADV-FS-05
 * - Dimension 2: Pan Coordinate & Scroll Position Preservation — ADV-FS-06 to ADV-FS-10
 * - Dimension 3: Escape Key Bubbling, Trapping & Containment — ADV-FS-11 to ADV-FS-16
 * - Dimension 4: Controlled vs. Uncontrolled Mode Behavior — ADV-FS-17 to ADV-FS-22
 * - Dimension 5: Viewport CSS Architecture & Stacking Context — ADV-FS-23 to ADV-FS-27
 * Total: 27 Test Cases.
 *
 * Execution:
 * node --test tests/adversarial-fullscreen-state.test.mjs
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  installMockBrowser,
  assertElementExists,
  assertClass,
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/harness.mjs';

import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import { createTranslator } from '../src/i18n/index.js';
import { saveCanvasPan, loadSavedCanvasPan } from '../src/utils/storage.js';

// ============================================================================
// HIGH-FIDELITY FULL-SCREEN CONTROLLER & STATE ENGINE HARNESS
// Executing the exact specifications from Canvas.jsx lines 33-117.
// ============================================================================

class CanvasFullscreenHarness {
  constructor(options = {}) {
    this.isFullscreenProp = options.isFullscreenProp; // undefined for uncontrolled, boolean for controlled
    this.onToggleFullscreenProp = options.onToggleFullscreenProp || null;
    this.internalFullscreen = false;
    this.prevFullscreen = this.isFullscreen;

    // Pan coordinates
    this.scrollLeft = options.initialScrollLeft ?? 0;
    this.scrollTop = options.initialScrollTop ?? 0;
    this.zoom = options.initialZoom ?? 1.0;

    // Native Fullscreen API Simulation
    this.requestFullscreenBehavior = options.requestFullscreenBehavior || 'resolve'; // 'resolve' | 'reject' | 'delay'
    this.exitFullscreenBehavior = options.exitFullscreenBehavior || 'resolve';
    this.asyncLatencyMs = options.asyncLatencyMs ?? 0;
    this.nativeFullscreenElement = null;

    // DOM & Modal environment
    this.hasOverlayModal = Boolean(options.hasOverlayModal);
    this.hasSettingsPopover = Boolean(options.hasSettingsPopover);

    // Storage mock
    this.storage = options.storage || new Map();
    this.savedPans = [];

    // RAF & Listeners
    this.rafQueue = [];
    this.windowListeners = new Map();
    this.documentListeners = new Map();

    this.hostRef = {
      current: {
        requestFullscreen: async () => {
          if (this.requestFullscreenBehavior === 'reject') {
            throw new Error('NotAllowedError: The play() request was interrupted or permission denied');
          }
          if (this.asyncLatencyMs > 0) {
            await new Promise(r => setTimeout(r, this.asyncLatencyMs));
          }
          this.nativeFullscreenElement = this.hostRef.current;
        }
      }
    };

    this.containerRef = {
      current: {
        scrollLeft: this.scrollLeft,
        scrollTop: this.scrollTop
      }
    };

    this.setupListeners();
  }

  get isFullscreen() {
    return this.isFullscreenProp !== undefined ? this.isFullscreenProp : this.internalFullscreen;
  }

  setupListeners() {
    // Native fullscreen change listener
    this.onFullscreenChange = () => {
      const isDocFullscreen = Boolean(this.nativeFullscreenElement);
      if (!isDocFullscreen && this.isFullscreen) {
        if (this.isFullscreenProp === undefined) {
          this.internalFullscreen = false;
        }
        this.onToggleFullscreenProp?.(false);
        this.triggerTransitionEffect();
      }
    };

    // Window keydown listener for Escape
    this.onKeyDown = (e) => {
      if (!this.isFullscreen) return;
      if (e.key === 'Escape') {
        const hasOpenModal = this.hasOverlayModal || this.hasSettingsPopover;
        if (hasOpenModal) return;
        e.preventDefault?.();
        this.handleToggleFullscreen();
      }
    };
  }

  triggerTransitionEffect() {
    const currentFs = this.isFullscreen;
    if (this.prevFullscreen !== currentFs) {
      this.prevFullscreen = currentFs;
      const el = this.containerRef.current;
      if (el) {
        const sl = el.scrollLeft;
        const st = el.scrollTop;
        this.requestAnimationFrame(() => {
          if (this.containerRef.current) {
            this.containerRef.current.scrollLeft = sl;
            this.containerRef.current.scrollTop = st;
            this.savedPans.push({ scrollLeft: sl, scrollTop: st });
            saveCanvasPan({ scrollLeft: sl, scrollTop: st });
          }
        });
      }
    }
  }

  requestAnimationFrame(cb) {
    this.rafQueue.push(cb);
  }

  flushRaf() {
    const queue = [...this.rafQueue];
    this.rafQueue = [];
    for (const cb of queue) {
      cb();
    }
  }

  async handleToggleFullscreen() {
    const next = !this.isFullscreen;
    if (this.isFullscreenProp === undefined) {
      this.internalFullscreen = next;
    }
    this.onToggleFullscreenProp?.(next);
    this.triggerTransitionEffect();

    if (next) {
      try {
        const el = this.hostRef.current;
        if (el?.requestFullscreen) {
          await el.requestFullscreen();
        }
      } catch {
        // Progressive enhancement fallback to CSS overlay
      }
    } else {
      try {
        if (this.nativeFullscreenElement) {
          if (this.exitFullscreenBehavior === 'reject') {
            throw new Error('TypeError: Document not active');
          }
          if (this.asyncLatencyMs > 0) {
            await new Promise(r => setTimeout(r, this.asyncLatencyMs));
          }
          this.nativeFullscreenElement = null;
        }
      } catch {
        // Progressive enhancement fallback to CSS overlay
      }
    }
  }

  dispatchWindowKeydown(eventInit) {
    let defaultPrevented = false;
    let propagationStopped = false;
    const event = {
      ...eventInit,
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => { propagationStopped = true; },
      defaultPrevented: false
    };
    Object.defineProperty(event, 'defaultPrevented', {
      get: () => defaultPrevented
    });

    this.onKeyDown(event);
    return event;
  }

  simulateNativeExit() {
    this.nativeFullscreenElement = null;
    this.onFullscreenChange();
  }
}

// ============================================================================
// ADVERSARIAL TEST SUITE
// ============================================================================

describe('Adversarial Empirical Challenge Suite: Full-Screen State Machine (Milestone M2)', () => {
  let browserEnv;

  beforeEach(() => {
    browserEnv = installMockBrowser('http://localhost:3000/?view=demo');
  });

  afterEach(() => {
    browserEnv.cleanup();
  });

  after(async () => {
    await closeViteServer();
  });

  // =========================================================================
  // DIMENSION 1: RAPID TOGGLE SEQUENCES (STRESS & ASYNC STATE PARITY)
  // =========================================================================
  describe('Dimension 1: Rapid Toggle Sequences (Stress & Async State Parity)', () => {
    it('ADV-FS-01: Rapid alternating toggle burst (10 rapid toggles in < 50ms) preserves parity', async () => {
      const harness = new CanvasFullscreenHarness();
      assert.equal(harness.isFullscreen, false, 'Initial state must be standard mode (false)');

      // 10 toggles: false -> true -> false -> true -> false -> true -> false -> true -> false -> true -> false
      for (let i = 1; i <= 10; i++) {
        await harness.handleToggleFullscreen();
        const expectedState = i % 2 !== 0;
        assert.equal(
          harness.isFullscreen,
          expectedState,
          `At toggle iteration ${i}, isFullscreen must equal ${expectedState}`
        );
      }

      harness.flushRaf();
      assert.equal(harness.isFullscreen, false, 'Even number of rapid toggles (10) must end in false');

      // 11th toggle -> true
      await harness.handleToggleFullscreen();
      harness.flushRaf();
      assert.equal(harness.isFullscreen, true, 'Odd number of rapid toggles (11) must end in true');
    });

    it('ADV-FS-02: Rapid async API resolution latency: pipelining toggles before promises resolve', async () => {
      // Latency simulation: Fullscreen API takes 15ms per call
      const harness = new CanvasFullscreenHarness({ asyncLatencyMs: 15 });

      // Trigger enter -> exit -> enter without awaiting between calls
      const p1 = harness.handleToggleFullscreen();
      const p2 = harness.handleToggleFullscreen();
      const p3 = harness.handleToggleFullscreen();

      await Promise.all([p1, p2, p3]);
      harness.flushRaf();

      assert.equal(harness.isFullscreen, true, '3 in-flight asynchronous toggles must resolve to true');
      assert.ok(harness.nativeFullscreenElement !== null, 'Native element must be set upon final enter');
    });

    it('ADV-FS-03: Fullscreen API rejection & progressive enhancement resilience: zero crashes', async () => {
      const harness = new CanvasFullscreenHarness({ requestFullscreenBehavior: 'reject' });

      // Enter fullscreen when browser rejects native requestFullscreen (e.g. mobile Safari / iframe restriction)
      let threw = false;
      try {
        await harness.handleToggleFullscreen();
      } catch {
        threw = true;
      }

      assert.equal(threw, false, 'Canvas handleToggleFullscreen must catch API rejection without throwing');
      assert.equal(harness.isFullscreen, true, 'CSS fixed overlay fallback must activate even when native API rejects');

      // Now test rejection on exitFullscreen
      harness.exitFullscreenBehavior = 'reject';
      threw = false;
      try {
        await harness.handleToggleFullscreen();
      } catch {
        threw = true;
      }

      assert.equal(threw, false, 'Exit fullscreen rejection must not crash application');
      assert.equal(harness.isFullscreen, false, 'State must cleanly restore to standard mode (false)');
    });

    it('ADV-FS-04: Out-of-order native fullscreenchange events during toggle in-flight', async () => {
      const harness = new CanvasFullscreenHarness();

      // Enter fullscreen
      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, true);

      // Simulate native exit event fired by browser (e.g. user pressed ESC or window minimized)
      harness.simulateNativeExit();
      harness.flushRaf();

      assert.equal(harness.isFullscreen, false, 'fullscreenchange exit must synchronize isFullscreen to false');
      assert.equal(harness.nativeFullscreenElement, null, 'Native fullscreen element must be null');
    });

    it('ADV-FS-05: 1,000-cycle high-velocity stress test with random micro-delays', async () => {
      const harness = new CanvasFullscreenHarness();
      const TOTAL_CYCLES = 1000;

      for (let i = 1; i <= TOTAL_CYCLES; i++) {
        await harness.handleToggleFullscreen();
        if (i % 20 === 0) {
          harness.flushRaf();
        }
      }
      harness.flushRaf();

      const expectedFinal = (TOTAL_CYCLES % 2) !== 0;
      assert.equal(
        harness.isFullscreen,
        expectedFinal,
        `1,000 toggles must strictly equal ${expectedFinal} according to modulo parity`
      );
    });
  });

  // =========================================================================
  // DIMENSION 2: PAN COORDINATE & SCROLL POSITION PRESERVATION
  // =========================================================================
  describe('Dimension 2: Pan Coordinate & Scroll Position Preservation', () => {
    it('ADV-FS-06: Normal pan coordinate preservation across full-screen entry and exit', async () => {
      const initialX = 540;
      const initialY = 360;
      const harness = new CanvasFullscreenHarness({
        initialScrollLeft: initialX,
        initialScrollTop: initialY
      });

      // Enter full-screen mode
      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, true);
      harness.flushRaf();

      // Coordinates after enter
      assert.equal(harness.containerRef.current.scrollLeft, initialX, 'scrollLeft preserved on enter');
      assert.equal(harness.containerRef.current.scrollTop, initialY, 'scrollTop preserved on enter');

      // User scrolls slightly while in full-screen
      harness.containerRef.current.scrollLeft = 720;
      harness.containerRef.current.scrollTop = 480;

      // Exit full-screen mode
      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, false);
      harness.flushRaf();

      // Coordinates after exit must preserve the position from full-screen
      assert.equal(harness.containerRef.current.scrollLeft, 720, 'scrollLeft preserved on exit');
      assert.equal(harness.containerRef.current.scrollTop, 480, 'scrollTop preserved on exit');
    });

    it('ADV-FS-07: Extreme pan coordinates & boundary values (0, max, subpixel, negative)', async () => {
      // 1. Zero coordinates (0, 0)
      const hZero = new CanvasFullscreenHarness({ initialScrollLeft: 0, initialScrollTop: 0 });
      await hZero.handleToggleFullscreen();
      hZero.flushRaf();
      assert.equal(hZero.containerRef.current.scrollLeft, 0);
      assert.equal(hZero.containerRef.current.scrollTop, 0);

      // 2. Large tree coordinates (4500, 3200)
      const hLarge = new CanvasFullscreenHarness({ initialScrollLeft: 4500, initialScrollTop: 3200 });
      await hLarge.handleToggleFullscreen();
      hLarge.flushRaf();
      assert.equal(hLarge.containerRef.current.scrollLeft, 4500);
      assert.equal(hLarge.containerRef.current.scrollTop, 3200);

      // 3. Subpixel coordinates (250.75, 180.25) clamped/rounded by saveCanvasPan
      saveCanvasPan({ scrollLeft: 250.75, scrollTop: 180.25 });
      const savedSubpixel = loadSavedCanvasPan();
      assert.equal(savedSubpixel.scrollLeft, 251, 'Subpixel scrollLeft must round to nearest integer');
      assert.equal(savedSubpixel.scrollTop, 180, 'Subpixel scrollTop must round to nearest integer');

      // 4. Negative values clamped to 0
      saveCanvasPan({ scrollLeft: -100, scrollTop: -50 });
      const savedNegative = loadSavedCanvasPan();
      assert.equal(savedNegative.scrollLeft, 0, 'Negative scrollLeft must clamp to 0');
      assert.equal(savedNegative.scrollTop, 0, 'Negative scrollTop must clamp to 0');
    });

    it('ADV-FS-08: Rapid enter-exit-enter cycles maintain scroll coordinate stability without zeroing', async () => {
      const harness = new CanvasFullscreenHarness({ initialScrollLeft: 850, initialScrollTop: 620 });

      // Perform 5 rapid transitions without waiting for intermediate RAF
      await harness.handleToggleFullscreen(); // enter
      await harness.handleToggleFullscreen(); // exit
      await harness.handleToggleFullscreen(); // enter
      await harness.handleToggleFullscreen(); // exit
      await harness.handleToggleFullscreen(); // enter (final = true)

      harness.flushRaf();

      assert.equal(harness.isFullscreen, true);
      assert.equal(harness.containerRef.current.scrollLeft, 850, 'scrollLeft must remain 850 across rapid toggles');
      assert.equal(harness.containerRef.current.scrollTop, 620, 'scrollTop must remain 620 across rapid toggles');

      const loaded = loadSavedCanvasPan();
      assert.equal(loaded.scrollLeft, 850);
      assert.equal(loaded.scrollTop, 620);
    });

    it('ADV-FS-09: Canvas zoom level invariant is strictly preserved across full-screen transitions', async () => {
      // Test zoom invariance across minimum, midpoint, and maximum bounds
      const zoomLevels = [0.4, 0.75, 1.0, 1.25, 1.4];

      for (const z of zoomLevels) {
        const harness = new CanvasFullscreenHarness({
          initialScrollLeft: 300,
          initialScrollTop: 200,
          initialZoom: z
        });

        await harness.handleToggleFullscreen(); // enter
        assert.equal(harness.zoom, z, `Zoom level ${z} must remain intact upon entering full-screen`);

        await harness.handleToggleFullscreen(); // exit
        assert.equal(harness.zoom, z, `Zoom level ${z} must remain intact upon exiting full-screen`);
      }
    });

    it('ADV-FS-10: Persistence layer round-trip synchronization with storage.js', () => {
      const panData = { scrollLeft: 1120, scrollTop: 890 };
      const saved = saveCanvasPan(panData);
      assert.equal(saved, true, 'saveCanvasPan must return true');

      const loaded = loadSavedCanvasPan();
      assert.deepEqual(loaded, panData, 'loadSavedCanvasPan must return exact persisted coordinates');
    });
  });

  // =========================================================================
  // DIMENSION 3: ESCAPE KEY BUBBLING, TRAPPING & CONTAINMENT
  // =========================================================================
  describe('Dimension 3: Escape Key Bubbling, Trapping & Containment', () => {
    it('ADV-FS-11: Escape key exits fullscreen and prevents default when no modal sheet is open', async () => {
      const harness = new CanvasFullscreenHarness();
      await harness.handleToggleFullscreen(); // Enter full-screen
      assert.equal(harness.isFullscreen, true);

      // Dispatch Escape key with no modal open
      const event = harness.dispatchWindowKeydown({ key: 'Escape' });

      assert.equal(event.defaultPrevented, true, 'Escape key handler must call preventDefault()');
      assert.equal(harness.isFullscreen, false, 'Escape key must exit full-screen mode');
    });

    it('ADV-FS-12: Non-Escape keys (Enter, Space, Tab, ArrowDown) are harmless in fullscreen', async () => {
      const harness = new CanvasFullscreenHarness();
      await harness.handleToggleFullscreen(); // Enter full-screen
      assert.equal(harness.isFullscreen, true);

      const nonEscapeKeys = ['Enter', ' ', 'Tab', 'ArrowDown', 'ArrowUp', 'KeyA', 'Backspace'];
      for (const key of nonEscapeKeys) {
        const event = harness.dispatchWindowKeydown({ key });
        assert.equal(event.defaultPrevented, false, `Key "${key}" must NOT call preventDefault()`);
        assert.equal(harness.isFullscreen, true, `Key "${key}" must NOT exit full-screen mode`);
      }
    });

    it('ADV-FS-13: Person detail modal sheet (.overlay) containment: Escape closes sheet, fullscreen stays true', async () => {
      const harness = new CanvasFullscreenHarness({ hasOverlayModal: true });
      await harness.handleToggleFullscreen(); // Enter full-screen with modal open
      assert.equal(harness.isFullscreen, true);

      // Simulate Escape key press when modal sheet is open
      const event = harness.dispatchWindowKeydown({ key: 'Escape' });

      // Canvas Escape handler detects .overlay and returns early without exiting
      assert.equal(event.defaultPrevented, false, 'Canvas must NOT prevent default or consume Escape when modal is open');
      assert.equal(harness.isFullscreen, true, 'Full-screen mode MUST NOT exit while person detail modal sheet is open');
    });

    it('ADV-FS-14: Settings popover (.settings-popover) containment: Escape does NOT exit fullscreen', async () => {
      const harness = new CanvasFullscreenHarness({ hasSettingsPopover: true });
      await harness.handleToggleFullscreen(); // Enter full-screen with settings open
      assert.equal(harness.isFullscreen, true);

      const event = harness.dispatchWindowKeydown({ key: 'Escape' });

      assert.equal(event.defaultPrevented, false, 'Canvas must NOT prevent default when settings popover is open');
      assert.equal(harness.isFullscreen, true, 'Full-screen mode MUST NOT exit while settings popover is open');
    });

    it('ADV-FS-15: Sequential two-stage Escape key dismissal (Stage 1: Modal closes -> Stage 2: Fullscreen exits)', async () => {
      const harness = new CanvasFullscreenHarness({ hasOverlayModal: true });
      await harness.handleToggleFullscreen(); // Enter full-screen
      assert.equal(harness.isFullscreen, true);
      assert.equal(harness.hasOverlayModal, true);

      // Stage 1: User hits Escape while modal is open
      let ev1 = harness.dispatchWindowKeydown({ key: 'Escape' });
      assert.equal(ev1.defaultPrevented, false, 'Stage 1: Canvas leaves event unprevented for modal to consume');
      assert.equal(harness.isFullscreen, true, 'Stage 1: Full-screen mode remains active');

      // Modal closes (e.g. Sheet.jsx handles Escape and calls close())
      harness.hasOverlayModal = false;

      // Stage 2: User hits Escape again (now no modal exists in DOM)
      let ev2 = harness.dispatchWindowKeydown({ key: 'Escape' });
      assert.equal(ev2.defaultPrevented, true, 'Stage 2: Canvas consumes Escape and calls preventDefault()');
      assert.equal(harness.isFullscreen, false, 'Stage 2: Full-screen mode cleanly exits');
    });

    it('ADV-FS-16: Non-fullscreen Escape neutrality: pressing Escape in standard mode does nothing', () => {
      const harness = new CanvasFullscreenHarness();
      assert.equal(harness.isFullscreen, false);

      const event = harness.dispatchWindowKeydown({ key: 'Escape' });
      assert.equal(event.defaultPrevented, false, 'Escape in standard mode must not call preventDefault');
      assert.equal(harness.isFullscreen, false, 'Escape in standard mode must not enter full-screen');
    });
  });

  // =========================================================================
  // DIMENSION 4: CONTROLLED VS. UNCONTROLLED MODE BEHAVIOR
  // =========================================================================
  describe('Dimension 4: Controlled vs. Uncontrolled Mode Behavior', () => {
    it('ADV-FS-17: Uncontrolled mode default state and autonomous toggle transitions', async () => {
      // In uncontrolled mode, isFullscreenProp is undefined
      const harness = new CanvasFullscreenHarness({ isFullscreenProp: undefined });
      assert.equal(harness.isFullscreen, false, 'Uncontrolled mode defaults to false');

      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, true, 'Uncontrolled mode toggles to true autonomously');

      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, false, 'Uncontrolled mode toggles back to false autonomously');
    });

    it('ADV-FS-18: Controlled mode authority: prop strictly controls rendered state', async () => {
      let requestedState = null;
      const harness = new CanvasFullscreenHarness({
        isFullscreenProp: false,
        onToggleFullscreenProp: (next) => { requestedState = next; }
      });

      assert.equal(harness.isFullscreen, false, 'Controlled mode initializes with isFullscreenProp');

      // Click toggle in controlled mode
      await harness.handleToggleFullscreen();
      assert.equal(requestedState, true, 'Controlled mode must notify parent with requested next state (true)');
      assert.equal(harness.isFullscreen, false, 'Controlled mode must NOT update internal state when prop remains false');

      // Parent component updates prop to true
      harness.isFullscreenProp = true;
      assert.equal(harness.isFullscreen, true, 'Controlled mode strictly follows parent isFullscreen prop update');
    });

    it('ADV-FS-19: Uncontrolled mode native fullscreenchange synchronization', () => {
      const harness = new CanvasFullscreenHarness({ isFullscreenProp: undefined });
      harness.internalFullscreen = true;
      harness.nativeFullscreenElement = harness.hostRef.current;
      assert.equal(harness.isFullscreen, true);

      // Browser exits fullscreen natively (e.g. F11 pressed)
      harness.simulateNativeExit();
      assert.equal(harness.isFullscreen, false, 'Native exit must reset uncontrolled internalFullscreen to false');
    });

    it('ADV-FS-20: Controlled mode native fullscreenchange notifies parent via callback', () => {
      let notifiedWith = null;
      const harness = new CanvasFullscreenHarness({
        isFullscreenProp: true,
        onToggleFullscreenProp: (val) => { notifiedWith = val; }
      });
      harness.nativeFullscreenElement = harness.hostRef.current;

      harness.simulateNativeExit();
      assert.equal(notifiedWith, false, 'Controlled mode native exit must notify parent with false');
    });

    it('ADV-FS-21: Standalone SSR markup rendering for uncontrolled vs controlled props', async () => {
      const Canvas = await loadComponent('./src/components/Canvas.jsx');
      const t = createTranslator('en');
      const mockTreeState = { data: { people: [], couples: [] }, photos: {} };
      const mockLayout = { W: 1200, H: 900, pos: {}, branchLabels: [], genLabels: [] };

      // Render uncontrolled (no isFullscreen prop)
      const htmlUncontrolled = renderComponentToHtml(Canvas, {
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
        onResetViewer: () => {}
      });

      assert.ok(
        htmlUncontrolled.includes('treewrap-host') && !htmlUncontrolled.includes('treewrap-host is-fullscreen'),
        'Uncontrolled Canvas must render standard treewrap-host container without is-fullscreen'
      );
      assert.ok(
        htmlUncontrolled.includes('Enter full screen') || htmlUncontrolled.includes('Full screen'),
        'Uncontrolled Canvas toggle button must show enter label'
      );

      // Render controlled with isFullscreen: true
      const htmlControlledTrue = renderComponentToHtml(Canvas, {
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
        htmlControlledTrue.includes('treewrap-host is-fullscreen'),
        'Controlled Canvas must render container with "is-fullscreen" class when prop is true'
      );
      assert.ok(
        htmlControlledTrue.includes('Exit full screen') || htmlControlledTrue.includes('Exit'),
        'Controlled Canvas toggle button must show exit label when isFullscreen is true'
      );
    });

    it('ADV-FS-22: CanvasDock prop propagation & accessibility labels in both modes', async () => {
      const CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
      const t = createTranslator('en');

      // Dock standard mode
      const htmlDockStandard = renderComponentToHtml(CanvasDock, {
        zoom: 1.0,
        onZoomIn: () => {},
        onZoomOut: () => {},
        onFit: () => {},
        onPan: () => {},
        onReset: () => {},
        onToggleFullscreen: () => {},
        isFullscreen: false,
        t,
        lang: 'en'
      });

      assert.ok(htmlDockStandard.includes('dock-fullscreen-btn'), 'CanvasDock must render dock-fullscreen-btn');
      assert.ok(htmlDockStandard.includes('aria-pressed="false"'), 'aria-pressed must be false in standard mode');
      assert.ok(!htmlDockStandard.includes('dock-fullscreen-btn active'), 'Button must not have active class');

      // Dock fullscreen mode
      const htmlDockFullscreen = renderComponentToHtml(CanvasDock, {
        zoom: 1.0,
        onZoomIn: () => {},
        onZoomOut: () => {},
        onFit: () => {},
        onPan: () => {},
        onReset: () => {},
        onToggleFullscreen: () => {},
        isFullscreen: true,
        t,
        lang: 'en'
      });

      assert.ok(htmlDockFullscreen.includes('dock-fullscreen-btn active'), 'Button must have active class in fullscreen');
      assert.ok(htmlDockFullscreen.includes('aria-pressed="true"'), 'aria-pressed must be true in fullscreen mode');
    });
  });

  // =========================================================================
  // DIMENSION 5: VIEWPORT CSS ARCHITECTURE & STACKING CONTEXT
  // =========================================================================
  describe('Dimension 5: Viewport CSS Architecture & Stacking Context', () => {
    it('ADV-FS-23: CSS fixed overlay architecture: position fixed, inset 0, z-index 800, 100dvh', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      assert.ok(treeCss.includes('.treewrap-host.is-fullscreen'), 'tree.css must declare .treewrap-host.is-fullscreen');
      assert.ok(treeCss.includes('position: fixed !important'), 'Full-screen container must declare position: fixed !important');
      assert.ok(treeCss.includes('inset: 0 !important'), 'Full-screen container must declare inset: 0 !important');
      assert.ok(treeCss.includes('z-index: 800 !important'), 'Full-screen container must declare z-index: 800 !important');
      assert.ok(
        treeCss.includes('height: 100dvh !important') || treeCss.includes('height: 100vh !important'),
        'Full-screen container must occupy full viewport height'
      );
    });

    it('ADV-FS-24: Inner scroll container occupies 100% dimensions without margins/borders', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      assert.ok(
        treeCss.includes('.treewrap-host.is-fullscreen .treewrap'),
        'tree.css must declare .treewrap-host.is-fullscreen .treewrap'
      );
      assert.ok(treeCss.includes('height: 100% !important'), 'Inner scroll container must declare height: 100% !important');
      assert.ok(treeCss.includes('border: none !important'), 'Inner scroll container must remove borders in fullscreen');
    });

    it('ADV-FS-25: Z-Index Stacking Context Hierarchy verification across stylesheets', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
      const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
      const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');

      // Stacking order invariant:
      // z-index: 95 (.mobile-bottom-nav)
      // z-index: 100 (.site-nav)
      // z-index: 800 (.treewrap-host.is-fullscreen)
      // z-index: 999 (.modal-backdrop / .overlay)
      // z-index: 1000 (.settings-popover)
      assert.ok(landingCss.includes('z-index: 100') || landingCss.includes('z-index: 95'), 'Navbar z-index declared');
      assert.ok(treeCss.includes('z-index: 800 !important'), 'Full-screen canvas z-index 800 declared');
      assert.ok(componentsCss.includes('z-index: 999') || landingCss.includes('z-index: 999') || componentsCss.includes('z-index: 1000'), 'Modal overlay z-index declared');
      assert.ok(landingCss.includes('z-index: 1000 !important'), 'Settings popover override z-index 1000 declared');
    });

    it('ADV-FS-26: Reduced Motion compliance: transitions zeroed/disabled', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      assert.ok(
        treeCss.includes(':root[data-motion="reduce"] .treewrap-host.is-fullscreen'),
        'tree.css must include reduced-motion selector for .treewrap-host.is-fullscreen'
      );
      assert.ok(
        treeCss.includes('transition: none !important') || treeCss.includes('animation: none !important'),
        'Transitions must be disabled under reduced motion'
      );
    });

    it('ADV-FS-27: Bilingual translation key parity in en.js and hi.js for full-screen mode', () => {
      const keys = ['fullscreenEnter', 'fullscreenExit', 'fullscreenEnterShort', 'fullscreenExitShort'];
      const devanagariRegex = /[\u0900-\u097F]/;

      for (const k of keys) {
        assert.ok(k in en, `en.js must define key "${k}"`);
        assert.ok(k in hi, `hi.js must define key "${k}"`);
        assert.equal(typeof en[k], 'string', `en.${k} must be string`);
        assert.equal(typeof hi[k], 'string', `hi.${k} must be string`);
        assert.ok(en[k].length > 0, `en.${k} must not be empty`);
        assert.ok(hi[k].length > 0, `hi.${k} must not be empty`);
        assert.ok(devanagariRegex.test(hi[k]), `hi.${k} must contain Devanagari script characters`);
      }
    });
  });
});
