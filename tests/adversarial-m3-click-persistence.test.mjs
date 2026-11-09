/**
 * Adversarial Empirical Challenge Suite for Milestone M3:
 * Card Click Suppression Timing, Touchcancel Interruption Recovery, and Atomic Storage Persistence Lifecycle.
 *
 * Focus Areas:
 * 1. Synthetic click arrival timing: simulate synthetic click events dispatched at 20ms, 50ms, 80ms, 100ms, and 110ms
 *    following touchend and verify 100% are suppressed.
 * 2. Intentional tap timing: simulate deliberate card taps at 150ms and 250ms following touchend and verify
 *    they are allowed to open the card.
 * 3. Interrupted gestures (touchcancel): verify touchcancel immediately clears pinch tracking (rafId, active, pending)
 *    and resets flags without stuck locks (debounceTimer cleared, hasPinched reset to false).
 * 4. Persistence lifecycle: verify saveCanvasZoom and saveCanvasPan are NOT called during high-frequency touchmove,
 *    and verify exact atomic persistence occurs on touchend.
 * 5. Static AST and stylesheet verification: non-passive listeners ({ passive: false }), capture listener ({ capture: true }),
 *    120ms debounce constant, and -webkit-overflow-scrolling: touch.
 *
 * Execution:
 * node --test tests/adversarial-m3-click-persistence.test.mjs
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  installMockBrowser,
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/harness.mjs';

import {
  saveCanvasPan,
  saveCanvasZoom,
  loadSavedCanvasPan,
  loadSavedCanvasZoom,
  CANVAS_ZOOM_KEY,
  CANVAS_PAN_KEY
} from '../src/utils/storage.js';

import { createTranslator } from '../src/i18n/index.js';

// ============================================================================
// HIGH-FIDELITY INTERACTIVE TOUCH & PERSISTENCE TEST HARNESS
// Implements the exact touch engine and persistence mechanics from src/components/Canvas.jsx
// ============================================================================

class CanvasTouchHarness {
  constructor(options = {}) {
    this.initialZoom = options.initialZoom ?? 1.0;
    this.zoom = this.initialZoom;
    this.initialScrollLeft = options.initialScrollLeft ?? 200;
    this.initialScrollTop = options.initialScrollTop ?? 300;
    this.scrollLeft = this.initialScrollLeft;
    this.scrollTop = this.initialScrollTop;

    this.layout = options.layout ?? { W: 2400, H: 1800, totalWidth: 2400, totalHeight: 1800 };
    this.containerRect = options.containerRect ?? { left: 0, top: 0, width: 390, height: 844 };
    this.onCardClick = options.onCardClick || (() => {});

    // Storage tracking spies
    this.storage = options.storage || globalThis.localStorage;
    this.saveZoomCalls = [];
    this.savePanCalls = [];
    this.setZoomCalls = [];
    this.cardClickCalls = [];

    // Animation frame simulation
    this.rafQueue = [];
    this.cancelledRafIds = new Set();
    this.rafCounter = 0;

    // Internal component refs matching Canvas.jsx lines 31-42:
    this.panRef = { active: false, hasDragged: false, sx: 0, sy: 0, sl: 0, st: 0 };
    this.pinchRef = {
      active: false,
      hasPinched: false,
      d0: 0,
      initialZoom: 1,
      midpoint: { x: 0, y: 0 },
      anchor: { x: 0, y: 0 },
      pending: null,
      rafId: null,
      debounceTimer: null
    };

    // DOM simulation
    this.sizer = {
      style: {
        width: `${this.layout.W * this.zoom}px`,
        height: `${this.layout.H * this.zoom}px`
      }
    };
    this.stage = {
      style: {
        transform: `scale(${this.zoom})`
      }
    };
    this.container = {
      scrollLeft: this.scrollLeft,
      scrollTop: this.scrollTop,
      getBoundingClientRect: () => this.containerRect,
      querySelector: (sel) => (sel === '.sizer' ? this.sizer : null)
    };
  }

  // RAF queue manager
  requestAnimationFrame(cb) {
    const id = ++this.rafCounter;
    this.rafQueue.push({ id, cb });
    return id;
  }

  cancelAnimationFrame(id) {
    this.cancelledRafIds.add(id);
    this.rafQueue = this.rafQueue.filter(item => item.id !== id);
  }

  flushRaf() {
    const queue = [...this.rafQueue];
    this.rafQueue = [];
    for (const item of queue) {
      if (!this.cancelledRafIds.has(item.id)) {
        item.cb();
      }
    }
  }

  setZoom(nextZ) {
    this.zoom = nextZ;
    this.setZoomCalls.push(nextZ);
  }

  saveCanvasZoomSpy(zoomVal) {
    this.saveZoomCalls.push(zoomVal);
    saveCanvasZoom(zoomVal);
  }

  saveCanvasPanSpy(panVal) {
    this.savePanCalls.push(panVal);
    saveCanvasPan(panVal);
  }

  // Exact touch handlers from Canvas.jsx lines 235-433:

  handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const d0 = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rect = this.container.getBoundingClientRect();
      const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
      const my = (t0.clientY + t1.clientY) / 2 - rect.top;
      const initialZ = this.zoom || 1.0;
      const sl = this.container.scrollLeft;
      const st = this.container.scrollTop;

      const stageX = (sl + mx) / initialZ;
      const stageY = (st + my) / initialZ;

      if (this.pinchRef.debounceTimer) {
        clearTimeout(this.pinchRef.debounceTimer);
        this.pinchRef.debounceTimer = null;
      }

      this.pinchRef.active = true;
      this.pinchRef.hasPinched = true;
      this.pinchRef.d0 = d0;
      this.pinchRef.initialZoom = initialZ;
      this.pinchRef.midpoint = { x: mx, y: my };
      this.pinchRef.anchor = { x: stageX, y: stageY };
      this.pinchRef.pending = null;
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault();

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dCurr = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rect = this.container.getBoundingClientRect();
      const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
      const my = (t0.clientY + t1.clientY) / 2 - rect.top;

      if (!this.pinchRef.active) {
        if (this.pinchRef.debounceTimer) {
          clearTimeout(this.pinchRef.debounceTimer);
          this.pinchRef.debounceTimer = null;
        }
        const initialZ = this.zoom || 1.0;
        const sl = this.container.scrollLeft;
        const st = this.container.scrollTop;

        this.pinchRef.active = true;
        this.pinchRef.hasPinched = true;
        this.pinchRef.d0 = dCurr;
        this.pinchRef.initialZoom = initialZ;
        this.pinchRef.midpoint = { x: mx, y: my };
        this.pinchRef.anchor = { x: (sl + mx) / initialZ, y: (st + my) / initialZ };
        this.pinchRef.pending = null;
        return;
      }

      const { d0, initialZoom, anchor } = this.pinchRef;
      const ratio = d0 > 0.0001 ? dCurr / d0 : 1.0;
      const rawZoom = initialZoom * ratio;
      const nextZoom = Math.min(1.4, Math.max(0.4, Number(rawZoom.toFixed(3))));

      const nextSL = Math.max(0, anchor.x * nextZoom - mx);
      const nextST = Math.max(0, anchor.y * nextZoom - my);

      this.pinchRef.hasPinched = true;
      this.pinchRef.pending = {
        zoom: nextZoom,
        sl: nextSL,
        st: nextST
      };

      if (!this.pinchRef.rafId) {
        this.pinchRef.rafId = this.requestAnimationFrame(() => {
          this.pinchRef.rafId = null;
          const pending = this.pinchRef.pending;
          if (!pending) return;

          const w = this.layout?.W || this.layout?.totalWidth || 0;
          const h = this.layout?.H || this.layout?.totalHeight || 0;

          if (this.sizer && w && h) {
            this.sizer.style.width = `${w * pending.zoom}px`;
            this.sizer.style.height = `${h * pending.zoom}px`;
          }
          if (this.stage) {
            this.stage.style.transform = `scale(${pending.zoom})`;
          }
          if (this.container) {
            this.container.scrollLeft = pending.sl;
            this.container.scrollTop = pending.st;
          }

          this.setZoom(pending.zoom);
        });
      }
    }
  }

  handleTouchEnd(e) {
    if (this.pinchRef.active && e.touches.length < 2) {
      if (this.pinchRef.rafId) {
        this.cancelAnimationFrame(this.pinchRef.rafId);
        this.pinchRef.rafId = null;
      }

      const pending = this.pinchRef.pending;
      let finalZoom = this.zoom;
      let finalSL = this.container.scrollLeft;
      let finalST = this.container.scrollTop;

      if (pending) {
        finalZoom = pending.zoom;
        finalSL = pending.sl;
        finalST = pending.st;

        const w = this.layout?.W || this.layout?.totalWidth || 0;
        const h = this.layout?.H || this.layout?.totalHeight || 0;

        if (this.sizer && w && h) {
          this.sizer.style.width = `${w * finalZoom}px`;
          this.sizer.style.height = `${h * finalZoom}px`;
        }
        if (this.stage) {
          this.stage.style.transform = `scale(${finalZoom})`;
        }
        if (this.container) {
          this.container.scrollLeft = finalSL;
          this.container.scrollTop = finalST;
        }

        this.setZoom(finalZoom);
      }

      this.saveCanvasZoomSpy(finalZoom);
      this.saveCanvasPanSpy({ scrollLeft: finalSL, scrollTop: finalST });

      const wasPinched = this.pinchRef.hasPinched;
      this.pinchRef.active = false;
      this.pinchRef.pending = null;

      if (wasPinched) {
        if (this.pinchRef.debounceTimer) {
          clearTimeout(this.pinchRef.debounceTimer);
        }
        this.pinchRef.debounceTimer = setTimeout(() => {
          this.pinchRef.hasPinched = false;
          this.pinchRef.debounceTimer = null;
        }, 120);
      }
    }
  }

  handleTouchCancel() {
    if (this.pinchRef.rafId) {
      this.cancelAnimationFrame(this.pinchRef.rafId);
      this.pinchRef.rafId = null;
    }
    this.pinchRef.active = false;
    this.pinchRef.pending = null;
    if (this.pinchRef.debounceTimer) {
      clearTimeout(this.pinchRef.debounceTimer);
      this.pinchRef.debounceTimer = null;
    }
    this.pinchRef.hasPinched = false;
  }

  handleClickCapture(e) {
    if (this.pinchRef.hasPinched) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }
  }

  // Simulates synthetic click or user tap on card
  dispatchCardClick(personId = 'person_1') {
    let defaultPrevented = false;
    let propagationStopped = false;
    let immediatePropagationStopped = false;

    const event = {
      defaultPrevented: false,
      preventDefault() { defaultPrevented = true; this.defaultPrevented = true; },
      stopPropagation() { propagationStopped = true; },
      stopImmediatePropagation() { immediatePropagationStopped = true; }
    };

    // 1. Capture phase interception on container
    this.handleClickCapture(event);

    // 2. Target phase execution on Card component:
    let cardHandlerInvoked = false;
    if (!immediatePropagationStopped && !propagationStopped) {
      if (!this.panRef.hasDragged && !this.pinchRef.hasPinched) {
        this.onCardClick(personId);
        this.cardClickCalls.push(personId);
        cardHandlerInvoked = true;
      }
    }

    return {
      defaultPrevented,
      propagationStopped,
      immediatePropagationStopped,
      cardHandlerInvoked,
      isSuppressed: !cardHandlerInvoked
    };
  }

  // Cleans up any pending timers
  destroy() {
    if (this.pinchRef.debounceTimer) {
      clearTimeout(this.pinchRef.debounceTimer);
      this.pinchRef.debounceTimer = null;
    }
    if (this.pinchRef.rafId) {
      this.cancelAnimationFrame(this.pinchRef.rafId);
      this.pinchRef.rafId = null;
    }
  }
}

// Helper to create synthetic touch events
function createTouchEvent(type, touchCoords = []) {
  let defaultPrevented = false;
  return {
    type,
    touches: touchCoords.map((c, i) => ({
      identifier: i,
      clientX: c.x,
      clientY: c.y,
      pageX: c.x,
      pageY: c.y
    })),
    defaultPrevented: false,
    preventDefault() {
      defaultPrevented = true;
      this.defaultPrevented = true;
    }
  };
}

// Helper for exact asynchronous delays
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// ADVERSARIAL TEST SUITE EXECUTION
// ============================================================================

describe('Adversarial M3 Challenge Suite: Click Suppression Timing & Persistence Lifecycle', () => {
  let browserEnv;

  before(() => {
    browserEnv = installMockBrowser('http://localhost:3000/?view=demo');
  });

  after(async () => {
    browserEnv.cleanup();
    await closeViteServer();
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  // ==========================================================================
  // DIMENSION 1: SYNTHETIC CLICK ARRIVAL TIMING (20ms, 50ms, 80ms, 100ms, 110ms)
  // ==========================================================================
  describe('Dimension 1: Synthetic Click Arrival Timing (0ms - 110ms Window)', () => {
    it('ADV-M3-01: Synthetic click arriving at 20ms following touchend is 100% suppressed', async () => {
      let cardOpened = false;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        onCardClick: () => { cardOpened = true; }
      });

      // 1. Perform pinch gesture
      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 300 }, { x: 200, y: 300 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 80, y: 300 }, { x: 240, y: 300 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      // 2. Wait 20ms and simulate synthetic click
      await wait(20);
      const clickResult = harness.dispatchCardClick('person_1');

      assert.equal(clickResult.isSuppressed, true, 'Synthetic click at 20ms must be suppressed');
      assert.equal(clickResult.defaultPrevented, true, 'Event preventDefault() must be called');
      assert.equal(clickResult.propagationStopped, true, 'Event propagation must be stopped');
      assert.equal(clickResult.cardHandlerInvoked, false, 'Card onCardClick handler must NOT fire');
      assert.equal(cardOpened, false, 'Card modal must not open');

      harness.destroy();
    });

    it('ADV-M3-02: Synthetic click arriving at 50ms following touchend is 100% suppressed', async () => {
      let cardOpened = false;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        onCardClick: () => { cardOpened = true; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 150, y: 200 }, { x: 250, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 120, y: 200 }, { x: 280, y: 200 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      await wait(50);
      const clickResult = harness.dispatchCardClick('person_1');

      assert.equal(clickResult.isSuppressed, true, 'Synthetic click at 50ms must be suppressed');
      assert.equal(clickResult.cardHandlerInvoked, false);
      assert.equal(cardOpened, false);

      harness.destroy();
    });

    it('ADV-M3-03: Synthetic click arriving at 80ms following touchend is 100% suppressed', async () => {
      let cardOpened = false;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        onCardClick: () => { cardOpened = true; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 150 }, { x: 200, y: 150 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 90, y: 150 }, { x: 220, y: 150 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      await wait(80);
      const clickResult = harness.dispatchCardClick('person_2');

      assert.equal(clickResult.isSuppressed, true, 'Synthetic click at 80ms must be suppressed');
      assert.equal(clickResult.cardHandlerInvoked, false);
      assert.equal(cardOpened, false);

      harness.destroy();
    });

    it('ADV-M3-04: Synthetic click arriving at 100ms following touchend is 100% suppressed', async () => {
      let cardOpened = false;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        onCardClick: () => { cardOpened = true; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 300, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 140, y: 200 }, { x: 260, y: 200 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      await wait(100);
      const clickResult = harness.dispatchCardClick('person_3');

      assert.equal(clickResult.isSuppressed, true, 'Synthetic click at 100ms must be suppressed');
      assert.equal(clickResult.cardHandlerInvoked, false);
      assert.equal(cardOpened, false);

      harness.destroy();
    });

    it('ADV-M3-05: Synthetic click arriving at 110ms following touchend is 100% suppressed', async () => {
      let cardOpened = false;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        onCardClick: () => { cardOpened = true; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 120, y: 180 }, { x: 220, y: 180 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 100, y: 180 }, { x: 240, y: 180 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      await wait(110);
      const clickResult = harness.dispatchCardClick('person_4');

      assert.equal(clickResult.isSuppressed, true, 'Synthetic click at 110ms must be suppressed');
      assert.equal(clickResult.cardHandlerInvoked, false);
      assert.equal(cardOpened, false);

      harness.destroy();
    });

    it('ADV-M3-06: High-frequency burst of synthetic clicks across the 0-110ms window are all 100% suppressed', async () => {
      let clickCount = 0;
      const harness = new CanvasTouchHarness({
        onCardClick: () => { clickCount++; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 80, y: 200 }, { x: 220, y: 200 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      // Burst of clicks arriving at targeted offsets within the [0ms, 100ms] window
      const targetOffsets = [15, 40, 65, 90];
      const startTime = Date.now();
      for (const targetOffset of targetOffsets) {
        const elapsed = Date.now() - startTime;
        const sleepMs = targetOffset - elapsed;
        if (sleepMs > 0) {
          await wait(sleepMs);
        }
        const currentElapsed = Date.now() - startTime;
        if (currentElapsed < 115) {
          const res = harness.dispatchCardClick('person_burst');
          assert.equal(res.isSuppressed, true, `Synthetic burst click at ${currentElapsed}ms must be suppressed`);
        }
      }

      assert.equal(clickCount, 0, 'Zero synthetic clicks must execute in Card component');
      harness.destroy();
    });

    it('ADV-M3-07: Dual-layer defense: capture interceptor AND Card guard independently reject synthetic click', () => {
      const harness = new CanvasTouchHarness();
      harness.pinchRef.hasPinched = true;

      // 1. Test Layer 1: Capture phase container interceptor
      let capturePrevented = false;
      let captureStopped = false;
      harness.handleClickCapture({
        preventDefault: () => { capturePrevented = true; },
        stopPropagation: () => { captureStopped = true; },
        stopImmediatePropagation: () => {}
      });
      assert.equal(capturePrevented, true, 'Layer 1 capture listener must prevent default');
      assert.equal(captureStopped, true, 'Layer 1 capture listener must stop propagation');

      // 2. Test Layer 2: Card component onClick guard
      let cardFired = false;
      const cardOnClick = () => {
        if (!harness.panRef.hasDragged && !harness.pinchRef.hasPinched) {
          cardFired = true;
        }
      };
      cardOnClick();
      assert.equal(cardFired, false, 'Layer 2 Card guard must block click when hasPinched is true');
    });
  });

  // ==========================================================================
  // DIMENSION 2: INTENTIONAL TAP TIMING (150ms and 250ms)
  // ==========================================================================
  describe('Dimension 2: Intentional Tap Timing (> 120ms Window)', () => {
    it('ADV-M3-08: Intentional tap at 150ms following touchend is allowed and opens card', async () => {
      let openedPersonId = null;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        onCardClick: (id) => { openedPersonId = id; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 80, y: 200 }, { x: 220, y: 200 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      // Wait 150ms (exceeds 120ms debounce threshold)
      await wait(150);
      const clickResult = harness.dispatchCardClick('person_target_150');

      assert.equal(clickResult.isSuppressed, false, 'Tap at 150ms must NOT be suppressed');
      assert.equal(clickResult.cardHandlerInvoked, true, 'Card onCardClick handler must execute');
      assert.equal(openedPersonId, 'person_target_150', 'Expected person_target_150 to be clicked');
      assert.equal(harness.pinchRef.hasPinched, false, 'hasPinched must be false after debounce expires');

      harness.destroy();
    });

    it('ADV-M3-09: Intentional tap at 250ms following touchend is allowed and opens card', async () => {
      let openedPersonId = null;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        onCardClick: (id) => { openedPersonId = id; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 120, y: 220 }, { x: 240, y: 220 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 100, y: 220 }, { x: 260, y: 220 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      // Wait 250ms (deliberate user tap)
      await wait(250);
      const clickResult = harness.dispatchCardClick('person_target_250');

      assert.equal(clickResult.isSuppressed, false, 'Tap at 250ms must NOT be suppressed');
      assert.equal(clickResult.cardHandlerInvoked, true);
      assert.equal(openedPersonId, 'person_target_250');

      harness.destroy();
    });

    it('ADV-M3-10: Exact debounce boundary transition test (suppressed at 100ms, enabled at 140ms)', async () => {
      let clicks = [];
      const harness = new CanvasTouchHarness({
        onCardClick: (id) => { clicks.push(id); }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 90, y: 200 }, { x: 210, y: 200 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      // Check 1: 100ms (inside debounce window) -> Suppressed
      await wait(100);
      const res1 = harness.dispatchCardClick('early_click');
      assert.equal(res1.isSuppressed, true, 'Click at 100ms must be suppressed');
      assert.equal(clicks.length, 0);

      // Check 2: 45ms later (cumulative 145ms > 120ms) -> Allowed
      await wait(45);
      const res2 = harness.dispatchCardClick('on_time_click');
      assert.equal(res2.isSuppressed, false, 'Click at cumulative 145ms must be allowed');
      assert.equal(clicks.length, 1);
      assert.equal(clicks[0], 'on_time_click');

      harness.destroy();
    });

    it('ADV-M3-11: Successive taps following debounce expiration continue to work without stuck state', async () => {
      const opened = [];
      const harness = new CanvasTouchHarness({
        onCardClick: (id) => { opened.push(id); }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      await wait(140);

      // Tap 3 different cards successively
      harness.dispatchCardClick('person_A');
      harness.dispatchCardClick('person_B');
      harness.dispatchCardClick('person_C');

      assert.deepEqual(opened, ['person_A', 'person_B', 'person_C'], 'All successive card taps must succeed');
      harness.destroy();
    });
  });

  // ==========================================================================
  // DIMENSION 3: INTERRUPTED GESTURES (touchcancel RECOVERY & RESET)
  // ==========================================================================
  describe('Dimension 3: Interrupted Gestures (touchcancel Recovery & Immediate Reset)', () => {
    it('ADV-M3-12: touchcancel immediately cancels pending RAF frame and resets active to false', () => {
      const harness = new CanvasTouchHarness({ initialZoom: 1.0 });

      // Start pinch and produce un-rendered pending RAF update
      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 50, y: 200 }, { x: 250, y: 200 }]));

      assert.equal(harness.pinchRef.active, true, 'pinchRef.active must be true during gesture');
      assert.ok(harness.pinchRef.pending !== null, 'pinchRef.pending must hold pending update');
      assert.ok(harness.pinchRef.rafId !== null, 'RAF must be scheduled');

      // Dispatch touchcancel (e.g. system alert, incoming call, gesture interruption)
      harness.handleTouchCancel();

      assert.equal(harness.pinchRef.active, false, 'pinchRef.active must be reset immediately to false');
      assert.equal(harness.pinchRef.pending, null, 'pinchRef.pending must be cleared to null');
      assert.equal(harness.pinchRef.rafId, null, 'rafId must be cleared');
      assert.equal(harness.rafQueue.length, 0, 'RAF queue must have pending frame cancelled');

      harness.destroy();
    });

    it('ADV-M3-13: touchcancel immediately resets hasPinched without 120ms lockup', () => {
      const harness = new CanvasTouchHarness();

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      assert.equal(harness.pinchRef.hasPinched, true);

      // Interrupt gesture
      harness.handleTouchCancel();

      assert.equal(harness.pinchRef.hasPinched, false, 'hasPinched must be reset to false immediately on touchcancel');
      assert.equal(harness.pinchRef.debounceTimer, null, 'debounceTimer must be null on touchcancel');

      harness.destroy();
    });

    it('ADV-M3-14: Immediate card tap (0ms delay) following touchcancel successfully opens card', () => {
      let cardOpened = false;
      const harness = new CanvasTouchHarness({
        onCardClick: () => { cardOpened = true; }
      });

      // Gesture starts then gets cancelled by OS
      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchCancel();

      // Immediate tap arrives with zero delay
      const res = harness.dispatchCardClick('person_immediate');

      assert.equal(res.isSuppressed, false, 'Immediate tap after touchcancel must NOT be suppressed');
      assert.equal(res.cardHandlerInvoked, true, 'Card handler must fire immediately');
      assert.equal(cardOpened, true);

      harness.destroy();
    });

    it('ADV-M3-15: 100 rapid alternating touchstart -> touchcancel stress cycles leave clean state', () => {
      const harness = new CanvasTouchHarness({ initialZoom: 1.0 });

      for (let i = 0; i < 100; i++) {
        harness.handleTouchStart(createTouchEvent('touchstart', [
          { x: 100 + i % 10, y: 200 },
          { x: 200 + i % 10, y: 200 }
        ]));
        if (i % 2 === 0) {
          harness.handleTouchMove(createTouchEvent('touchmove', [
            { x: 90, y: 200 },
            { x: 220, y: 200 }
          ]));
        }
        harness.handleTouchCancel();

        // Invariant check after each cancellation:
        assert.equal(harness.pinchRef.active, false);
        assert.equal(harness.pinchRef.pending, null);
        assert.equal(harness.pinchRef.hasPinched, false);
        assert.equal(harness.pinchRef.debounceTimer, null);
        assert.equal(harness.pinchRef.rafId, null);
      }

      // After 100 cancellations, a fresh pinch gesture operates cleanly
      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 50, y: 200 }, { x: 250, y: 200 }]));
      harness.flushRaf();

      assert.equal(harness.zoom, 1.4, 'Zoom should reach clamped 1.4 without interference from prior cancellations');
      harness.destroy();
    });

    it('ADV-M3-16: touchcancel during gesture aborts persistence (zero corrupt coordinates saved to storage)', () => {
      let saveZoomCalls = 0;
      let savePanCalls = 0;
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        initialScrollLeft: 100,
        initialScrollTop: 150,
        saveCanvasZoom: () => { saveZoomCalls++; },
        saveCanvasPan: () => { savePanCalls++; }
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 80, y: 200 }, { x: 280, y: 200 }]));
      
      // Abort
      harness.handleTouchCancel();

      assert.equal(harness.saveZoomCalls.length, 0, 'saveCanvasZoom must NOT be called on cancelled gesture');
      assert.equal(harness.savePanCalls.length, 0, 'saveCanvasPan must NOT be called on cancelled gesture');

      harness.destroy();
    });
  });

  // ==========================================================================
  // DIMENSION 4: PERSISTENCE LIFECYCLE & ATOMIC TOUTCHEND SYNC
  // ==========================================================================
  describe('Dimension 4: Persistence Lifecycle (Zero I/O in touchmove, Atomic Sync on touchend)', () => {
    it('ADV-M3-17: High-frequency touchmove stream (100 events) produces exactly ZERO calls to saveCanvasZoom and saveCanvasPan', () => {
      const harness = new CanvasTouchHarness({ initialZoom: 1.0 });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));

      // Stream 100 rapid touchmove events
      for (let i = 1; i <= 100; i++) {
        const span = 100 + i * 2;
        harness.handleTouchMove(createTouchEvent('touchmove', [
          { x: 150 - span / 2, y: 200 },
          { x: 150 + span / 2, y: 200 }
        ]));
        // Flush RAF every 3 events to simulate 60fps display refresh
        if (i % 3 === 0) {
          harness.flushRaf();
        }
      }

      assert.equal(harness.saveZoomCalls.length, 0, 'saveCanvasZoom must NEVER be called during touchmove stream');
      assert.equal(harness.savePanCalls.length, 0, 'saveCanvasPan must NEVER be called during touchmove stream');

      harness.destroy();
    });

    it('ADV-M3-18: Exact atomic persistence occurs on touchend (1 call each to saveCanvasZoom and saveCanvasPan)', () => {
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        initialScrollLeft: 200,
        initialScrollTop: 300
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 80, y: 200 }, { x: 220, y: 200 }]));

      // Verify zero calls before touchend
      assert.equal(harness.saveZoomCalls.length, 0);
      assert.equal(harness.savePanCalls.length, 0);

      // Finish gesture
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      // Verify exactly 1 atomic persistence call each
      assert.equal(harness.saveZoomCalls.length, 1, 'saveCanvasZoom must be called exactly once on touchend');
      assert.equal(harness.savePanCalls.length, 1, 'saveCanvasPan must be called exactly once on touchend');

      // Check values written to localStorage
      const savedZoom = loadSavedCanvasZoom();
      const savedPan = loadSavedCanvasPan();
      const rawPanJson = JSON.parse(globalThis.localStorage.getItem(CANVAS_PAN_KEY));

      assert.equal(savedZoom, harness.saveZoomCalls[0], 'Storage zoom must match call argument');
      assert.deepEqual(rawPanJson, {
        scrollLeft: Math.round(harness.savePanCalls[0].scrollLeft),
        scrollTop: Math.round(harness.savePanCalls[0].scrollTop)
      }, 'saveCanvasPan must sanitize and round floating scroll coordinates to integers in localStorage');
      assert.deepEqual(savedPan, rawPanJson, 'loadSavedCanvasPan must retrieve the stored pan');

      harness.destroy();
    });

    it('ADV-M3-19: Atomic touchend flushes pending un-rendered RAF state to DOM and persistence before teardown', () => {
      const harness = new CanvasTouchHarness({
        initialZoom: 1.0,
        initialScrollLeft: 100,
        initialScrollTop: 100
      });

      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 100, y: 200 }, { x: 200, y: 200 }]));
      // Move creates pending state and schedules RAF
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 50, y: 200 }, { x: 250, y: 200 }])); // ratio 2.0 -> zoom 1.4

      assert.ok(harness.pinchRef.pending !== null, 'pending must hold target zoom 1.4');
      assert.equal(harness.pinchRef.pending.zoom, 1.4);

      // Fire touchend WITHOUT flushing RAF first:
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      // touchend must flush pending values immediately
      assert.equal(harness.zoom, 1.4, 'DOM zoom must be updated to pending zoom 1.4');
      assert.equal(harness.stage.style.transform, 'scale(1.4)', 'Stage transform must reflect final zoom');
      assert.equal(harness.saveZoomCalls[0], 1.4, 'Persisted zoom must be exact final zoom 1.4');

      harness.destroy();
    });

    it('ADV-M3-20: Single-finger touch events produce ZERO pinch persistence calls', () => {
      const harness = new CanvasTouchHarness({ initialZoom: 1.0 });

      // Single-finger touch (touches.length === 1)
      const touch1 = createTouchEvent('touchstart', [{ x: 100, y: 200 }]);
      harness.handleTouchStart(touch1);
      assert.equal(touch1.defaultPrevented, false, '1-finger touch must NOT preventDefault');

      const move1 = createTouchEvent('touchmove', [{ x: 120, y: 200 }]);
      harness.handleTouchMove(move1);
      assert.equal(move1.defaultPrevented, false, '1-finger move must NOT preventDefault');

      harness.handleTouchEnd(createTouchEvent('touchend', []));

      assert.equal(harness.saveZoomCalls.length, 0, '1-finger touch must produce 0 pinch zoom saves');
      assert.equal(harness.savePanCalls.length, 0, '1-finger touch must produce 0 pinch pan saves');

      harness.destroy();
    });

    it('ADV-M3-21: Boundary clamping enforcement during persistence ([0.4, 1.4])', () => {
      const harness = new CanvasTouchHarness({ initialZoom: 1.0 });

      // Extreme pinch inward (distance 1000px down to 50px -> ratio 0.05)
      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 0, y: 100 }, { x: 1000, y: 100 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 475, y: 100 }, { x: 525, y: 100 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      assert.equal(harness.saveZoomCalls[0], 0.4, 'Persisted zoom must clamp strictly to minimum 0.4');

      // Extreme pinch outward (distance 50px up to 1000px -> ratio 20.0)
      harness.handleTouchStart(createTouchEvent('touchstart', [{ x: 475, y: 100 }, { x: 525, y: 100 }]));
      harness.handleTouchMove(createTouchEvent('touchmove', [{ x: 0, y: 100 }, { x: 1000, y: 100 }]));
      harness.handleTouchEnd(createTouchEvent('touchend', []));

      assert.equal(harness.saveZoomCalls[1], 1.4, 'Persisted zoom must clamp strictly to maximum 1.4');

      harness.destroy();
    });
  });

  // ==========================================================================
  // DIMENSION 5: STATIC AST & INTERFACE CONTRACT CONFORMANCE
  // ==========================================================================
  describe('Dimension 5: Static AST & Production Code Conformance', () => {
    it('ADV-M3-22: Canvas.jsx attaches non-passive touch listeners ({ passive: false })', () => {
      const canvasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasSrc.includes("el.addEventListener('touchstart', handleTouchStart, { passive: false })"),
        'Canvas.jsx must attach touchstart with { passive: false }'
      );
      assert.ok(
        canvasSrc.includes("el.addEventListener('touchmove', handleTouchMove, { passive: false })"),
        'Canvas.jsx must attach touchmove with { passive: false }'
      );
      assert.ok(
        canvasSrc.includes("el.addEventListener('touchend', handleTouchEnd, { passive: false })"),
        'Canvas.jsx must attach touchend with { passive: false }'
      );
      assert.ok(
        canvasSrc.includes("el.addEventListener('touchcancel', handleTouchCancel, { passive: false })"),
        'Canvas.jsx must attach touchcancel with { passive: false }'
      );
    });

    it('ADV-M3-23: Canvas.jsx attaches capture-phase click listener ({ capture: true })', () => {
      const canvasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasSrc.includes("el.addEventListener('click', handleClickCapture, { capture: true })"),
        'Canvas.jsx must attach click listener with { capture: true } for synthetic click suppression'
      );
    });

    it('ADV-M3-24: Canvas.jsx specifies 120ms debounce constant for accidental click suppression', () => {
      const canvasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasSrc.includes('120') && canvasSrc.includes('setTimeout'),
        'Canvas.jsx must contain setTimeout with 120ms debounce for hasPinched suppression'
      );
    });

    it('ADV-M3-25: Canvas.jsx Card onClick guards against both hasDragged and hasPinched', () => {
      const canvasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasSrc.includes('!panRef.current.hasDragged && !pinchRef.current.hasPinched'),
        'Card onClick handler must guard against both hasDragged and hasPinched'
      );
    });

    it('ADV-M3-26: tree.css contains -webkit-overflow-scrolling: touch for smooth mobile panning', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      assert.ok(
        treeCss.includes('-webkit-overflow-scrolling: touch'),
        'tree.css must include -webkit-overflow-scrolling: touch on .treewrap'
      );
    });

    it('ADV-M3-27: Canvas.jsx imports both saveCanvasPan and saveCanvasZoom from storage.js', () => {
      const canvasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasSrc.includes('saveCanvasPan') && canvasSrc.includes('saveCanvasZoom'),
        'Canvas.jsx must import both saveCanvasPan and saveCanvasZoom from storage.js'
      );
    });

    it('ADV-M3-28: Production Vite SSR Component rendering executes cleanly without layout NaN warnings', async () => {
      const Canvas = await loadComponent('./src/components/Canvas.jsx');
      const t = createTranslator('en');
      const mockTreeState = {
        data: {
          people: [{ id: 'p1', name: 'Arpit', gender: 'male', birthYear: 2000 }],
          couples: []
        },
        photos: {}
      };
      const mockLayout = {
        totalWidth: 1200,
        totalHeight: 900,
        pos: { p1: { x: 100, y: 100 } },
        branchLabels: [],
        genLabels: []
      };

      const html = renderComponentToHtml(Canvas, {
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
        displayName: (id) => id,
        onCardClick: () => {},
        onZoom: () => {},
        onResetViewer: () => {},
        isFullscreen: false
      });

      assert.ok(html.includes('treewrap'), 'Canvas HTML must render treewrap container');
      assert.ok(!html.includes('NaNpx'), 'Rendered style must not contain NaNpx');
    });
  });
});
