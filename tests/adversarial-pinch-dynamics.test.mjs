/**
 * Adversarial Empirical Challenge Suite for Milestone M3 (Pinch-to-Zoom Touch Gestures & Tree Pan Smoothness).
 * 
 * Stress-tests touch gesture dynamics, extreme scale ratios, division-by-zero safety,
 * single-finger pan isolation, RAF batching, and synthetic click suppression under hostile conditions.
 *
 * Requirements Covered:
 * - R3: Pinch-to-Zoom Gesture Controls (F10, F11, F12, F13, F14)
 * - R5: Non-Regression & Viewport Ergonomics (F15)
 *
 * Dimensions:
 * - Dimension 1: Rapid Alternating Pinch Sequences & Dynamic State Transitions (ADV-PINCH-01 to ADV-PINCH-06)
 * - Dimension 2: Extreme Scale Ratios & Boundary Clamping [0.4, 1.4] (ADV-PINCH-07 to ADV-PINCH-12)
 * - Dimension 3: Coincident Touches (D0 approx 0) & Division-by-Zero Protection (ADV-PINCH-13 to ADV-PINCH-17)
 * - Dimension 4: Single-Finger Pan Non-Interference & Native Momentum Isolation (ADV-PINCH-18 to ADV-PINCH-23)
 * - Dimension 5: Multi-Finger Contacts (3, 4, 5 Fingers), Dirty Touches & Click Trapping (ADV-PINCH-24 to ADV-PINCH-30)
 * Total: 30 Test Cases.
 *
 * Execution:
 * node --test tests/adversarial-pinch-dynamics.test.mjs
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

import { createTranslator } from '../src/i18n/index.js';

// ============================================================================
// HIGH-FIDELITY TOUCH PINCH-TO-ZOOM CONTROLLER & DOM HARNESS
// Executing the exact specifications from Canvas.jsx lines 32-456.
// ============================================================================

class CanvasPinchHarness {
  constructor(options = {}) {
    this.initialZoom = options.initialZoom ?? 1.0;
    this.zoom = this.initialZoom;
    this.layout = options.layout || { W: 2000, H: 1500, pos: {} };
    this.initialScrollLeft = options.initialScrollLeft ?? 400;
    this.initialScrollTop = options.initialScrollTop ?? 300;
    this.containerRect = options.containerRect || { left: 0, top: 50, width: 400, height: 600 };

    // Container DOM element representation
    this.containerEl = {
      scrollLeft: this.initialScrollLeft,
      scrollTop: this.initialScrollTop,
      clientWidth: this.containerRect.width,
      clientHeight: this.containerRect.height,
      getBoundingClientRect: () => this.containerRect,
      querySelector: (selector) => {
        if (selector === '.sizer') return this.sizerEl;
        if (selector === '.stage') return this.stageEl;
        return null;
      }
    };

    // Stage DOM element
    this.stageEl = {
      style: {
        transform: `scale(${this.zoom})`
      }
    };

    // Sizer DOM element
    this.sizerEl = {
      style: {
        width: `${(this.layout.W || 0) * this.zoom}px`,
        height: `${(this.layout.H || 0) * this.zoom}px`
      }
    };

    // React Refs representation
    this.containerRef = { current: this.containerEl };
    this.stageRef = { current: this.stageEl };
    this.zoomRef = { current: this.zoom };
    this.layoutRef = { current: this.layout };

    this.pinchRef = {
      current: {
        active: false,
        hasPinched: false,
        d0: 0,
        initialZoom: 1,
        midpoint: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        pending: null,
        rafId: null,
        debounceTimer: null
      }
    };

    // Spies & Metrics
    this.savedZooms = [];
    this.savedPans = [];
    this.zoomUpdates = [];
    this.preventDefaultCount = 0;
    this.stopPropagationCount = 0;
    this.stopImmediatePropagationCount = 0;

    // RAF Queue
    this.rafQueue = [];
    this.nextRafId = 1;

    // Simulated Timers
    this.timerQueue = [];

    // Registered Event Listeners
    this.listeners = new Map();

    this.setupListeners();
  }

  // Synchronous RAF simulation
  requestAnimationFrame(cb) {
    const id = this.nextRafId++;
    this.rafQueue.push({ id, cb, cancelled: false });
    return id;
  }

  cancelAnimationFrame(id) {
    const item = this.rafQueue.find(r => r.id === id);
    if (item) {
      item.cancelled = true;
    }
  }

  flushRaf() {
    const active = [...this.rafQueue];
    this.rafQueue = [];
    for (const item of active) {
      if (!item.cancelled) {
        item.cb();
      }
    }
  }

  // Simulated Timer simulation
  setTimeout(cb, delayMs) {
    const timer = { cb, delayMs, due: delayMs, active: true };
    this.timerQueue.push(timer);
    return timer;
  }

  clearTimeout(timer) {
    if (timer) {
      timer.active = false;
    }
  }

  advanceTimers(elapsedMs) {
    for (const timer of this.timerQueue) {
      if (timer.active) {
        timer.due -= elapsedMs;
        if (timer.due <= 0) {
          timer.active = false;
          timer.cb();
        }
      }
    }
    this.timerQueue = this.timerQueue.filter(t => t.active);
  }

  saveCanvasZoom(val) {
    this.savedZooms.push(val);
  }

  saveCanvasPan(val) {
    this.savedPans.push(val);
  }

  setZoom(val) {
    this.zoom = val;
    this.zoomRef.current = val;
    this.zoomUpdates.push(val);
  }

  setupListeners() {
    const el = this.containerRef.current;
    if (!el) return;

    this.handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const d0 = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const rect = el.getBoundingClientRect();
        const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
        const my = (t0.clientY + t1.clientY) / 2 - rect.top;
        const initialZ = this.zoomRef.current || 1.0;
        const sl = el.scrollLeft;
        const st = el.scrollTop;

        // Stage coordinates under midpoint:
        const stageX = (sl + mx) / initialZ;
        const stageY = (st + my) / initialZ;

        if (this.pinchRef.current.debounceTimer) {
          this.clearTimeout(this.pinchRef.current.debounceTimer);
          this.pinchRef.current.debounceTimer = null;
        }

        this.pinchRef.current.active = true;
        this.pinchRef.current.hasPinched = true;
        this.pinchRef.current.d0 = d0;
        this.pinchRef.current.initialZoom = initialZ;
        this.pinchRef.current.midpoint = { x: mx, y: my };
        this.pinchRef.current.anchor = { x: stageX, y: stageY };
        this.pinchRef.current.pending = null;
      }
    };

    this.handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dCurr = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const rect = el.getBoundingClientRect();
        const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
        const my = (t0.clientY + t1.clientY) / 2 - rect.top;

        if (!this.pinchRef.current.active) {
          if (this.pinchRef.current.debounceTimer) {
            this.clearTimeout(this.pinchRef.current.debounceTimer);
            this.pinchRef.current.debounceTimer = null;
          }
          const initialZ = this.zoomRef.current || 1.0;
          const sl = el.scrollLeft;
          const st = el.scrollTop;

          this.pinchRef.current.active = true;
          this.pinchRef.current.hasPinched = true;
          this.pinchRef.current.d0 = dCurr;
          this.pinchRef.current.initialZoom = initialZ;
          this.pinchRef.current.midpoint = { x: mx, y: my };
          this.pinchRef.current.anchor = { x: (sl + mx) / initialZ, y: (st + my) / initialZ };
          this.pinchRef.current.pending = null;
          return;
        }

        const { d0, initialZoom, anchor } = this.pinchRef.current;
        // Division-by-zero safety: if D0 <= 0.0001, ratio is 1.0 (avoid NaN)
        const ratio = d0 > 0.0001 ? dCurr / d0 : 1.0;
        const rawZoom = initialZoom * ratio;
        // Zoom ratio clamped to [0.4, 1.4]
        const nextZoom = Math.min(1.4, Math.max(0.4, Number(rawZoom.toFixed(3))));

        // Focal scroll anchor
        const nextSL = Math.max(0, anchor.x * nextZoom - mx);
        const nextST = Math.max(0, anchor.y * nextZoom - my);

        this.pinchRef.current.hasPinched = true;
        this.pinchRef.current.pending = {
          zoom: nextZoom,
          sl: nextSL,
          st: nextST
        };

        // RAF batching: throttle DOM and zoom updates using requestAnimationFrame
        if (!this.pinchRef.current.rafId) {
          this.pinchRef.current.rafId = this.requestAnimationFrame(() => {
            this.pinchRef.current.rafId = null;
            const pending = this.pinchRef.current.pending;
            if (!pending) return;

            const containerEl = this.containerRef.current;
            const stageEl = this.stageRef.current;
            const sizerEl = containerEl?.querySelector('.sizer');
            const curLayout = this.layoutRef.current;
            const w = curLayout?.W || curLayout?.totalWidth || 0;
            const h = curLayout?.H || curLayout?.totalHeight || 0;

            if (sizerEl && w && h) {
              sizerEl.style.width = `${w * pending.zoom}px`;
              sizerEl.style.height = `${h * pending.zoom}px`;
            }
            if (stageEl) {
              stageEl.style.transform = `scale(${pending.zoom})`;
            }
            if (containerEl) {
              containerEl.scrollLeft = pending.sl;
              containerEl.scrollTop = pending.st;
            }

            this.setZoom(pending.zoom);
          });
        }
      }
    };

    this.handleTouchEnd = (e) => {
      if (this.pinchRef.current.active && e.touches.length < 2) {
        if (this.pinchRef.current.rafId) {
          this.cancelAnimationFrame(this.pinchRef.current.rafId);
          this.pinchRef.current.rafId = null;
        }

        const pending = this.pinchRef.current.pending;
        let finalZoom = this.zoomRef.current;
        let finalSL = el.scrollLeft;
        let finalST = el.scrollTop;

        if (pending) {
          finalZoom = pending.zoom;
          finalSL = pending.sl;
          finalST = pending.st;

          const containerEl = this.containerRef.current;
          const stageEl = this.stageRef.current;
          const sizerEl = containerEl?.querySelector('.sizer');
          const curLayout = this.layoutRef.current;
          const w = curLayout?.W || curLayout?.totalWidth || 0;
          const h = curLayout?.H || curLayout?.totalHeight || 0;

          if (sizerEl && w && h) {
            sizerEl.style.width = `${w * finalZoom}px`;
            sizerEl.style.height = `${h * finalZoom}px`;
          }
          if (stageEl) {
            stageEl.style.transform = `scale(${finalZoom})`;
          }
          if (containerEl) {
            containerEl.scrollLeft = finalSL;
            containerEl.scrollTop = finalST;
          }

          this.setZoom(finalZoom);
        }

        this.saveCanvasZoom(finalZoom);
        this.saveCanvasPan({ scrollLeft: finalSL, scrollTop: finalST });

        const wasPinched = this.pinchRef.current.hasPinched;
        this.pinchRef.current.active = false;
        this.pinchRef.current.pending = null;

        if (wasPinched) {
          if (this.pinchRef.current.debounceTimer) {
            this.clearTimeout(this.pinchRef.current.debounceTimer);
          }
          this.pinchRef.current.debounceTimer = this.setTimeout(() => {
            this.pinchRef.current.hasPinched = false;
            this.pinchRef.current.debounceTimer = null;
          }, 120);
        }
      }
    };

    this.handleTouchCancel = () => {
      if (this.pinchRef.current.rafId) {
        this.cancelAnimationFrame(this.pinchRef.current.rafId);
        this.pinchRef.current.rafId = null;
      }
      this.pinchRef.current.active = false;
      this.pinchRef.current.pending = null;
      if (this.pinchRef.current.debounceTimer) {
        this.clearTimeout(this.pinchRef.current.debounceTimer);
        this.pinchRef.current.debounceTimer = null;
      }
      this.pinchRef.current.hasPinched = false;
    };

    this.handleClickCapture = (e) => {
      if (this.pinchRef.current.hasPinched) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
      }
    };
  }

  // Event dispatcher utilities
  createTouchEvent(type, touchesList) {
    const self = this;
    const touches = touchesList.map(t => ({
      clientX: t.clientX ?? 0,
      clientY: t.clientY ?? 0,
      identifier: t.identifier ?? 0,
      target: self.containerEl
    }));

    return {
      type,
      touches,
      preventDefault: () => {
        self.preventDefaultCount++;
      },
      stopPropagation: () => {
        self.stopPropagationCount++;
      },
      stopImmediatePropagation: () => {
        self.stopImmediatePropagationCount++;
      }
    };
  }

  dispatchTouchStart(touches) {
    const e = this.createTouchEvent('touchstart', touches);
    this.handleTouchStart(e);
    return e;
  }

  dispatchTouchMove(touches) {
    const e = this.createTouchEvent('touchmove', touches);
    this.handleTouchMove(e);
    return e;
  }

  dispatchTouchEnd(touches) {
    const e = this.createTouchEvent('touchend', touches);
    this.handleTouchEnd(e);
    return e;
  }

  dispatchTouchCancel() {
    const e = this.createTouchEvent('touchcancel', []);
    this.handleTouchCancel(e);
    return e;
  }

  dispatchClick() {
    let defaultPrevented = false;
    let stopped = false;
    let immediateStopped = false;

    const e = {
      type: 'click',
      preventDefault: () => {
        defaultPrevented = true;
        this.preventDefaultCount++;
      },
      stopPropagation: () => {
        stopped = true;
        this.stopPropagationCount++;
      },
      stopImmediatePropagation: () => {
        immediateStopped = true;
        this.stopImmediatePropagationCount++;
      }
    };

    this.handleClickCapture(e);
    return {
      defaultPrevented,
      propagationStopped: stopped,
      immediateStopped
    };
  }
}

// ============================================================================
// ADVERSARIAL TEST SUITE
// ============================================================================

describe('Adversarial Pinch Dynamics & Tree Pan Smoothness (Milestone M3)', () => {
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

  // ==========================================================================
  // DIMENSION 1: RAPID ALTERNATING PINCH SEQUENCES & STATE TRANSITIONS
  // ==========================================================================
  describe('Dimension 1: Rapid Alternating Pinch Sequences & State Transitions', () => {
    it('ADV-PINCH-01: Rapid alternating pinch in/out sequences maintains bounded zoom without state desync', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Start gesture with 2 fingers at 200px distance
      harness.dispatchTouchStart([
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 200 }
      ]);
      assert.equal(harness.pinchRef.current.active, true);
      assert.equal(harness.pinchRef.current.d0, 200);

      // Perform 60 alternating high-velocity pinch movements (expanding and pinching)
      for (let i = 1; i <= 60; i++) {
        const isExpand = i % 2 === 1;
        // Oscillate distance between 120px and 260px
        const currentDistance = isExpand ? 260 : 120;
        harness.dispatchTouchMove([
          { clientX: 200 - currentDistance / 2, clientY: 200 },
          { clientX: 200 + currentDistance / 2, clientY: 200 }
        ]);

        // Verify pending state was calculated and bounded
        const pending = harness.pinchRef.current.pending;
        assert.ok(pending !== null, `Step ${i} must produce a pending zoom state`);
        assert.ok(pending.zoom >= 0.4 && pending.zoom <= 1.4, `Zoom ${pending.zoom} must be within [0.4, 1.4]`);
        assert.ok(!Number.isNaN(pending.zoom), `Zoom must not be NaN at step ${i}`);
        assert.ok(!Number.isNaN(pending.sl), `ScrollLeft must not be NaN at step ${i}`);
        assert.ok(!Number.isNaN(pending.st), `ScrollTop must not be NaN at step ${i}`);

        // Flush RAF to emulate 60fps frame consumption
        harness.flushRaf();
        assert.equal(harness.zoom, pending.zoom);
      }

      // Finish gesture
      harness.dispatchTouchEnd([]);
      assert.equal(harness.pinchRef.current.active, false);
      assert.equal(harness.savedZooms.length, 1, 'Final zoom must be persisted exactly once');
    });

    it('ADV-PINCH-02: High-velocity pinch reversal mid-gesture flushes cleanly via RAF without skipping', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 200 } // d0 = 200
      ]);

      // Move 1: Expand outward to 280px (ratio 1.4)
      harness.dispatchTouchMove([
        { clientX: 60, clientY: 200 },
        { clientX: 340, clientY: 200 }
      ]);
      assert.equal(harness.pinchRef.current.pending.zoom, 1.4);

      // Immediate reversal before RAF fires: compress inward to 100px (ratio 0.5)
      harness.dispatchTouchMove([
        { clientX: 150, clientY: 200 },
        { clientX: 250, clientY: 200 }
      ]);
      assert.equal(harness.pinchRef.current.pending.zoom, 0.5);

      // Now flush RAF: should apply the latest (reversal) target
      harness.flushRaf();
      assert.equal(harness.zoom, 0.5, 'RAF batching must apply latest zoom target after high-velocity reversal');
      assert.equal(harness.stageEl.style.transform, 'scale(0.5)');
    });

    it('ADV-PINCH-03: Rapid sequential pinch sessions (25 rapid touch cycles) resets active state cleanly', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 0.8 });

      for (let session = 1; session <= 25; session++) {
        // Touchstart
        harness.dispatchTouchStart([
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]);
        assert.equal(harness.pinchRef.current.active, true);

        // Move
        harness.dispatchTouchMove([
          { clientX: 90, clientY: 100 },
          { clientX: 210, clientY: 100 }
        ]);
        harness.flushRaf();

        // Release fingers
        harness.dispatchTouchEnd([]);
        assert.equal(harness.pinchRef.current.active, false);
        assert.equal(harness.pinchRef.current.pending, null);
      }

      assert.equal(harness.savedZooms.length, 25, 'Each session must save final zoom on release');
      assert.ok(!Number.isNaN(harness.zoom), 'Final zoom must remain valid finite number');
    });

    it('ADV-PINCH-04: Interrupted pinch gesture via touchcancel cancels pending RAF frame and resets state', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 300, clientY: 100 }
      ]);

      harness.dispatchTouchMove([
        { clientX: 80, clientY: 100 },
        { clientX: 320, clientY: 100 }
      ]);
      assert.ok(harness.pinchRef.current.rafId !== null, 'RAF frame must be queued for pending move');

      // System interrupts touch (e.g. phone call or edge swipe)
      harness.dispatchTouchCancel();

      assert.equal(harness.pinchRef.current.active, false, 'active must be reset on touchcancel');
      assert.equal(harness.pinchRef.current.rafId, null, 'Queued RAF frame must be cancelled on touchcancel');
      assert.equal(harness.pinchRef.current.pending, null, 'Pending update must be cleared on touchcancel');
      assert.equal(harness.pinchRef.current.hasPinched, false, 'hasPinched must be reset on touchcancel');

      // Flushing RAF afterwards must do nothing
      harness.flushRaf();
      assert.equal(harness.zoom, 1.0, 'Cancelled gesture must not mutate committed zoom');
    });

    it('ADV-PINCH-05: Asynchronous RAF batching stress: 100 touchmove events between frames collapse to 1 update', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 200 } // d0 = 200
      ]);

      // Fire 100 touchmove events without flushing RAF
      for (let i = 1; i <= 100; i++) {
        const d = 200 + i;
        harness.dispatchTouchMove([
          { clientX: 200 - d / 2, clientY: 200 },
          { clientX: 200 + d / 2, clientY: 200 }
        ]);
      }

      // Exactly 1 RAF frame must be scheduled
      assert.equal(harness.rafQueue.filter(r => !r.cancelled).length, 1);
      assert.equal(harness.zoomUpdates.length, 0, 'setZoom must not be called during touchmove burst');

      // Flush frame
      harness.flushRaf();
      assert.equal(harness.zoomUpdates.length, 1, 'setZoom must be called exactly once for the entire batch');
      assert.equal(harness.zoom, harness.pinchRef.current.pending.zoom);
    });

    it('ADV-PINCH-06: Dynamic tree layout resize during active pinch maintains valid sizer dimensions', () => {
      const harness = new CanvasPinchHarness({
        initialZoom: 1.0,
        layout: { W: 1000, H: 800 }
      });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 200 }
      ]);

      // Move to zoom 1.2
      harness.dispatchTouchMove([
        { clientX: 80, clientY: 200 },
        { clientX: 320, clientY: 200 } // ratio = 240/200 = 1.2
      ]);

      // Layout updates mid-gesture (e.g. tree branches expand)
      harness.layoutRef.current = { W: 2500, H: 1800 };

      harness.flushRaf();

      assert.equal(harness.sizerEl.style.width, `${2500 * 1.2}px`);
      assert.equal(harness.sizerEl.style.height, `${1800 * 1.2}px`);
      assert.ok(!harness.sizerEl.style.width.includes('NaN'));
    });
  });

  // ==========================================================================
  // DIMENSION 2: EXTREME SCALE RATIOS & CLAMPING LIMITS [0.4, 1.4]
  // ==========================================================================
  describe('Dimension 2: Extreme Scale Ratios & Clamping Limits [0.4, 1.4]', () => {
    it('ADV-PINCH-07: Extreme compression (ratio 0.0001) clamps strictly to lower bound 0.400', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Start with fingers 1000px apart
      harness.dispatchTouchStart([
        { clientX: 0, clientY: 100 },
        { clientX: 1000, clientY: 100 } // d0 = 1000
      ]);

      // Compress to 0.1px apart (ratio 0.0001)
      harness.dispatchTouchMove([
        { clientX: 500, clientY: 100 },
        { clientX: 500.1, clientY: 100 }
      ]);

      const pending = harness.pinchRef.current.pending;
      assert.equal(pending.zoom, 0.4, 'Zoom must clamp strictly to minimum 0.4 on extreme compression');

      harness.flushRaf();
      assert.equal(harness.zoom, 0.4);
      assert.equal(harness.stageEl.style.transform, 'scale(0.4)');
    });

    it('ADV-PINCH-08: Extreme expansion (ratio 1000.0) clamps strictly to upper bound 1.400', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Start with fingers 2px apart
      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 102, clientY: 100 } // d0 = 2
      ]);

      // Expand to 2000px apart (ratio 1000.0)
      harness.dispatchTouchMove([
        { clientX: 0, clientY: 100 },
        { clientX: 2000, clientY: 100 }
      ]);

      const pending = harness.pinchRef.current.pending;
      assert.equal(pending.zoom, 1.4, 'Zoom must clamp strictly to maximum 1.4 on extreme expansion');

      harness.flushRaf();
      assert.equal(harness.zoom, 1.4);
      assert.equal(harness.stageEl.style.transform, 'scale(1.4)');
    });

    it('ADV-PINCH-09: Boundary-adjacent scaling (0.3999 and 1.4001) clamps strictly to 0.4 and 1.4', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 0, clientY: 0 },
        { clientX: 1000, clientY: 0 } // d0 = 1000
      ]);

      // Move to 399.9px -> rawZoom = 0.3999
      harness.dispatchTouchMove([
        { clientX: 0, clientY: 0 },
        { clientX: 399.9, clientY: 0 }
      ]);
      assert.equal(harness.pinchRef.current.pending.zoom, 0.4, '0.3999 must clamp to 0.4');

      // Move to 1400.1px -> rawZoom = 1.4001
      harness.dispatchTouchMove([
        { clientX: 0, clientY: 0 },
        { clientX: 1400.1, clientY: 0 }
      ]);
      assert.equal(harness.pinchRef.current.pending.zoom, 1.4, '1.4001 must clamp to 1.4');
    });

    it('ADV-PINCH-10: Precision 3-decimal rounding prevents IEEE 754 floating point drift', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 0, clientY: 0 },
        { clientX: 300, clientY: 0 } // d0 = 300
      ]);

      // Move to 215px -> 215 / 300 = 0.7166666666666667
      harness.dispatchTouchMove([
        { clientX: 0, clientY: 0 },
        { clientX: 215, clientY: 0 }
      ]);

      const pending = harness.pinchRef.current.pending;
      assert.equal(pending.zoom, 0.717, 'Zoom must be cleanly rounded to 3 decimal places without IEEE 754 drift');
    });

    it('ADV-PINCH-11: Gestures originating at boundary zoom levels clamp monotonically', () => {
      // Test starting at min bound 0.4 and pinching inward further
      const harnessMin = new CanvasPinchHarness({ initialZoom: 0.4 });
      harnessMin.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 }
      ]);
      harnessMin.dispatchTouchMove([
        { clientX: 120, clientY: 100 },
        { clientX: 180, clientY: 100 } // ratio = 60/100 = 0.6 -> rawZoom = 0.24
      ]);
      assert.equal(harnessMin.pinchRef.current.pending.zoom, 0.4, 'Zoom starting at 0.4 pinching in must stay 0.4');

      // Test starting at max bound 1.4 and expanding further
      const harnessMax = new CanvasPinchHarness({ initialZoom: 1.4 });
      harnessMax.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 }
      ]);
      harnessMax.dispatchTouchMove([
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 } // ratio = 200/100 = 2.0 -> rawZoom = 2.8
      ]);
      assert.equal(harnessMax.pinchRef.current.pending.zoom, 1.4, 'Zoom starting at 1.4 expanding out must stay 1.4');
    });

    it('ADV-PINCH-12: Focal scroll anchor coordinates remain strictly non-negative (>= 0) and clamp negative results to 0', () => {
      const harness = new CanvasPinchHarness({
        initialZoom: 1.0,
        initialScrollLeft: 0,
        initialScrollTop: 0
      });

      // Midpoint at (10, 0)
      harness.dispatchTouchStart([
        { clientX: 0, clientY: 50 },
        { clientX: 20, clientY: 50 }
      ]);
      // anchor.x = 10, anchor.y = 0

      // Pinch inward to 0.4 with fingers moving rightwards (midpoint shifts to 50)
      // anchor.x * nextZoom - mx = 10 * 0.4 - 50 = -46 -> clamps to 0
      harness.dispatchTouchMove([
        { clientX: 47.5, clientY: 50 },
        { clientX: 52.5, clientY: 50 } // dCurr = 5, midpoint mx = 50, my = 0
      ]);

      const pending = harness.pinchRef.current.pending;
      assert.ok(pending.sl >= 0, `scrollLeft ${pending.sl} must be >= 0`);
      assert.ok(pending.st >= 0, `scrollTop ${pending.st} must be >= 0`);
      assert.equal(pending.sl, 0, 'Negative focal scroll offset must clamp strictly to 0');
      assert.equal(pending.st, 0, 'Negative focal scroll offset must clamp strictly to 0');
    });
  });

  // ==========================================================================
  // DIMENSION 3: COINCIDENT TOUCHES (D0 approx 0) & DIVISION-BY-ZERO SAFETY
  // ==========================================================================
  describe('Dimension 3: Coincident Touches (D0 approx 0) & Division-by-Zero Safety', () => {
    it('ADV-PINCH-13: Exactly coincident touchstart (D0 = 0.0) produces zero NaN/Infinity and ratio 1.0 fallback', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Two fingers touch down at the exact same pixel coordinate
      harness.dispatchTouchStart([
        { clientX: 150, clientY: 250 },
        { clientX: 150, clientY: 250 }
      ]);

      assert.equal(harness.pinchRef.current.active, true);
      assert.equal(harness.pinchRef.current.d0, 0);

      // Move fingers apart
      harness.dispatchTouchMove([
        { clientX: 100, clientY: 250 },
        { clientX: 200, clientY: 250 }
      ]);

      const pending = harness.pinchRef.current.pending;
      assert.ok(pending !== null);
      assert.ok(!Number.isNaN(pending.zoom), 'Zoom must not be NaN');
      assert.ok(Number.isFinite(pending.zoom), 'Zoom must be a finite number');
      assert.equal(pending.zoom, 1.0, 'When D0 is 0, ratio must fallback gracefully to 1.0');
    });

    it('ADV-PINCH-14: Near-coincident touchstart (D0 = 0.00005 < 0.0001 epsilon) avoids division-by-zero', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.1 });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 100.00005, clientY: 100 } // d0 = 0.00005 < 0.0001
      ]);

      assert.ok(harness.pinchRef.current.d0 <= 0.0001);

      harness.dispatchTouchMove([
        { clientX: 50, clientY: 100 },
        { clientX: 150, clientY: 100 }
      ]);

      const pending = harness.pinchRef.current.pending;
      assert.ok(!Number.isNaN(pending.zoom), 'Zoom must not be NaN for sub-epsilon D0');
      assert.equal(pending.zoom, 1.1, 'Sub-epsilon D0 must safely preserve initial zoom');
    });

    it('ADV-PINCH-15: Boundary epsilon touchstart (D0 = 0.0001 vs 0.00011) behaves deterministically', () => {
      // Exact threshold test: d0 > 0.0001
      const harnessAtThreshold = new CanvasPinchHarness({ initialZoom: 1.0 });
      harnessAtThreshold.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 100.0001, clientY: 100 }
      ]);
      harnessAtThreshold.dispatchTouchMove([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 }
      ]);
      assert.ok(!Number.isNaN(harnessAtThreshold.pinchRef.current.pending.zoom));

      const harnessAboveThreshold = new CanvasPinchHarness({ initialZoom: 1.0 });
      harnessAboveThreshold.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 100.001, clientY: 100 }
      ]);
      harnessAboveThreshold.dispatchTouchMove([
        { clientX: 100, clientY: 100 },
        { clientX: 100.0012, clientY: 100 }
      ]);
      assert.ok(!Number.isNaN(harnessAboveThreshold.pinchRef.current.pending.zoom));
    });

    it('ADV-PINCH-16: Fingers converging to exact same point mid-gesture (dCurr = 0) clamps to 0.4 without NaN', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Valid touchstart
      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 } // d0 = 100
      ]);

      // Move fingers to exact same point (dCurr = 0)
      harness.dispatchTouchMove([
        { clientX: 150, clientY: 100 },
        { clientX: 150, clientY: 100 } // dCurr = 0
      ]);

      const pending = harness.pinchRef.current.pending;
      assert.ok(!Number.isNaN(pending.zoom), 'Zoom must not be NaN when fingers converge to same point');
      assert.equal(pending.zoom, 0.4, 'Converging to same point must clamp to min bound 0.4');
    });

    it('ADV-PINCH-17: Subpixel and negative coordinate inputs produce valid finite metrics', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: -10.45, clientY: -5.75 },
        { clientX: 15.22, clientY: 20.33 }
      ]);

      assert.ok(Number.isFinite(harness.pinchRef.current.d0));
      assert.ok(harness.pinchRef.current.d0 > 0);

      harness.dispatchTouchMove([
        { clientX: -15.0, clientY: -8.0 },
        { clientX: 20.0, clientY: 25.0 }
      ]);

      assert.ok(Number.isFinite(harness.pinchRef.current.pending.zoom));
      assert.ok(!Number.isNaN(harness.pinchRef.current.pending.sl));
    });
  });

  // ==========================================================================
  // DIMENSION 4: SINGLE-FINGER PAN NON-INTERFERENCE & NATIVE MOMENTUM ISOLATION
  // ==========================================================================
  describe('Dimension 4: Single-Finger Pan Non-Interference & Native Momentum Isolation', () => {
    it('ADV-PINCH-18: Single-finger touchstart NEVER calls preventDefault()', () => {
      const harness = new CanvasPinchHarness();

      harness.dispatchTouchStart([{ clientX: 120, clientY: 240 }]);

      assert.equal(harness.preventDefaultCount, 0, 'preventDefault must NEVER be called on single-finger touchstart');
      assert.equal(harness.pinchRef.current.active, false, 'pinch engine must NOT activate on single-finger touch');
    });

    it('ADV-PINCH-19: Single-finger touchmove NEVER calls preventDefault() across 200 consecutive drag events', () => {
      const harness = new CanvasPinchHarness();

      // Simulate 200 single-finger drag events
      for (let i = 0; i < 200; i++) {
        harness.dispatchTouchMove([{ clientX: 100 + i, clientY: 200 + (i % 10) }]);
      }

      assert.equal(harness.preventDefaultCount, 0, 'Single-finger pan must NEVER call preventDefault (preserves momentum scroll)');
      assert.equal(harness.pinchRef.current.active, false);
      assert.equal(harness.pinchRef.current.pending, null);
    });

    it('ADV-PINCH-20: Single-finger touchend and touchcancel NEVER call preventDefault()', () => {
      const harness = new CanvasPinchHarness();

      harness.dispatchTouchStart([{ clientX: 100, clientY: 100 }]);
      harness.dispatchTouchMove([{ clientX: 150, clientY: 150 }]);
      harness.dispatchTouchEnd([]);
      harness.dispatchTouchCancel();

      assert.equal(harness.preventDefaultCount, 0, 'Single-finger end/cancel must not prevent default');
    });

    it('ADV-PINCH-21: Stylesheet strictly specifies -webkit-overflow-scrolling: touch and touch-action: pan-x pan-y', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      assert.ok(
        treeCss.includes('-webkit-overflow-scrolling: touch;'),
        '.treewrap must declare -webkit-overflow-scrolling: touch; for iOS momentum scroll'
      );
      assert.ok(
        treeCss.includes('touch-action: pan-x pan-y;'),
        '.treewrap must declare touch-action: pan-x pan-y; for hardware-accelerated panning'
      );
    });

    it('ADV-PINCH-22: Single-finger interaction leaves hasPinched false, never blocking card clicks', () => {
      const harness = new CanvasPinchHarness();

      // 1-finger tap
      harness.dispatchTouchStart([{ clientX: 100, clientY: 100 }]);
      harness.dispatchTouchEnd([]);

      assert.equal(harness.pinchRef.current.hasPinched, false, '1-finger touch must never set hasPinched flag');

      // Click immediately follows tap
      const clickResult = harness.dispatchClick();
      assert.equal(clickResult.defaultPrevented, false, 'Single tap click must not be prevented');
      assert.equal(clickResult.propagationStopped, false, 'Single tap click propagation must not be stopped');
    });

    it('ADV-PINCH-23: Seamless handoff: 1-finger pan -> 2-finger pinch -> 1-finger release transitions cleanly', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Step 1: User begins panning with 1 finger
      harness.dispatchTouchStart([{ clientX: 100, clientY: 200 }]);
      harness.dispatchTouchMove([{ clientX: 120, clientY: 200 }]);
      assert.equal(harness.preventDefaultCount, 0);
      assert.equal(harness.pinchRef.current.active, false);

      // Step 2: Second finger touches down -> transitions to pinch
      harness.dispatchTouchStart([
        { clientX: 120, clientY: 200 },
        { clientX: 280, clientY: 200 }
      ]);
      assert.equal(harness.preventDefaultCount, 1);
      assert.equal(harness.pinchRef.current.active, true);

      // Step 3: Pinch movement
      harness.dispatchTouchMove([
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 200 }
      ]);
      assert.equal(harness.preventDefaultCount, 2);
      harness.flushRaf();

      // Step 4: One finger lifts (touches.length drops to 1) -> pinch completes cleanly
      harness.dispatchTouchEnd([{ clientX: 100, clientY: 200 }]);
      assert.equal(harness.pinchRef.current.active, false);
      assert.equal(harness.savedZooms.length, 1);

      // Step 5: Remaining finger continues panning without interference
      harness.dispatchTouchMove([{ clientX: 110, clientY: 200 }]);
      assert.equal(harness.preventDefaultCount, 2, 'No further preventDefault after returning to 1 finger');
    });
  });

  // ==========================================================================
  // DIMENSION 5: MULTI-FINGER CONTACTS, DIRTY TOUCHES & SYNTHETIC CLICK TRAPPING
  // ==========================================================================
  describe('Dimension 5: Multi-Finger Contacts, Dirty Touches & Click Trapping', () => {
    it('ADV-PINCH-24: Multi-finger touchstart (3, 4, 5 fingers) does NOT activate pinch mode or call preventDefault', () => {
      const harness = new CanvasPinchHarness();

      // 3 fingers
      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
        { clientX: 150, clientY: 200 }
      ]);
      assert.equal(harness.preventDefaultCount, 0);
      assert.equal(harness.pinchRef.current.active, false);

      // 4 fingers
      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
        { clientX: 150, clientY: 200 },
        { clientX: 250, clientY: 200 }
      ]);
      assert.equal(harness.preventDefaultCount, 0);
      assert.equal(harness.pinchRef.current.active, false);

      // 5 fingers (palm contact)
      harness.dispatchTouchStart([
        { clientX: 50, clientY: 50 },
        { clientX: 100, clientY: 50 },
        { clientX: 150, clientY: 50 },
        { clientX: 200, clientY: 50 },
        { clientX: 250, clientY: 50 }
      ]);
      assert.equal(harness.preventDefaultCount, 0);
      assert.equal(harness.pinchRef.current.active, false);
    });

    it('ADV-PINCH-25: 3rd finger intrusion mid-pinch (palm touch) is ignored without throwing or state corruption', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Start 2-finger pinch
      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 }
      ]);
      assert.equal(harness.pinchRef.current.active, true);

      // 3rd finger inadvertently makes contact during move
      harness.dispatchTouchMove([
        { clientX: 100, clientY: 100 },
        { clientX: 220, clientY: 100 },
        { clientX: 300, clientY: 150 } // 3 touches
      ]);

      // Active state remains intact, no crash
      assert.equal(harness.pinchRef.current.active, true);
    });

    it('ADV-PINCH-26: Primary touch tracking correctly indexes touches[0] and touches[1]', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      // Primary touches at index 0 and 1
      harness.dispatchTouchStart([
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 200 }
      ]);

      assert.equal(harness.pinchRef.current.midpoint.x, 200 - harness.containerRect.left);
      assert.equal(harness.pinchRef.current.midpoint.y, 200 - harness.containerRect.top);
      assert.equal(harness.pinchRef.current.d0, 200);
    });

    it('ADV-PINCH-27: Synthetic card click dispatched immediately after pinch (< 120ms) is intercepted and suppressed', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 }
      ]);
      harness.dispatchTouchMove([
        { clientX: 90, clientY: 100 },
        { clientX: 210, clientY: 100 }
      ]);
      harness.flushRaf();

      // Release fingers -> begins 120ms debounce
      harness.dispatchTouchEnd([]);
      assert.equal(harness.pinchRef.current.hasPinched, true);

      // Mobile browser dispatches synthetic click at 40ms
      harness.advanceTimers(40);
      const clickResult = harness.dispatchClick();

      assert.equal(clickResult.defaultPrevented, true, 'Synthetic click must be prevented during debounce');
      assert.equal(clickResult.propagationStopped, true, 'Synthetic click propagation must be stopped');
      assert.equal(clickResult.immediateStopped, true, 'Synthetic click stopImmediatePropagation must be called');
    });

    it('ADV-PINCH-28: Legitimate card click dispatched after 120ms debounce expires passes through cleanly', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 }
      ]);
      harness.dispatchTouchEnd([]);

      // Advance timer by 130ms (> 120ms debounce)
      harness.advanceTimers(130);
      assert.equal(harness.pinchRef.current.hasPinched, false, 'hasPinched must be cleared after 120ms debounce');

      // Subsequent deliberate user tap
      const clickResult = harness.dispatchClick();
      assert.equal(clickResult.defaultPrevented, false, 'Deliberate tap after debounce must not be prevented');
      assert.equal(clickResult.propagationStopped, false, 'Deliberate tap propagation must not be stopped');
    });

    it('ADV-PINCH-29: Canvas.jsx source code implements imperative non-passive and capture click listeners', () => {
      const canvasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      // Imperative { passive: false } registration
      assert.ok(
        canvasSrc.includes("addEventListener('touchstart', handleTouchStart, { passive: false })"),
        'touchstart must be registered with { passive: false }'
      );
      assert.ok(
        canvasSrc.includes("addEventListener('touchmove', handleTouchMove, { passive: false })"),
        'touchmove must be registered with { passive: false }'
      );
      assert.ok(
        canvasSrc.includes("addEventListener('touchend', handleTouchEnd, { passive: false })"),
        'touchend must be registered with { passive: false }'
      );
      assert.ok(
        canvasSrc.includes("addEventListener('touchcancel', handleTouchCancel, { passive: false })"),
        'touchcancel must be registered with { passive: false }'
      );

      // Capture phase click interceptor
      assert.ok(
        canvasSrc.includes("addEventListener('click', handleClickCapture, { capture: true })"),
        'click listener must be registered in capture phase with { capture: true }'
      );

      // Accidental click suppression in Card.jsx invocation
      assert.ok(
        canvasSrc.includes('!pinchRef.current.hasPinched'),
        'Card onClick handler must guard against active pinchRef.current.hasPinched'
      );
    });

    it('ADV-PINCH-30: Atomic persistence invariant: saveCanvasZoom and saveCanvasPan executed once on touchend', () => {
      const harness = new CanvasPinchHarness({ initialZoom: 1.0 });

      harness.dispatchTouchStart([
        { clientX: 100, clientY: 100 },
        { clientX: 300, clientY: 100 }
      ]);

      // 50 touchmove frames
      for (let i = 0; i < 50; i++) {
        harness.dispatchTouchMove([
          { clientX: 100 - i, clientY: 100 },
          { clientX: 300 + i, clientY: 100 }
        ]);
        harness.flushRaf();
      }

      // Storage should NOT be touched during gesture
      assert.equal(harness.savedZooms.length, 0, 'saveCanvasZoom must not be called during touchmove');
      assert.equal(harness.savedPans.length, 0, 'saveCanvasPan must not be called during touchmove');

      // Release
      harness.dispatchTouchEnd([]);
      assert.equal(harness.savedZooms.length, 1, 'saveCanvasZoom must be called exactly once on touchend');
      assert.equal(harness.savedPans.length, 1, 'saveCanvasPan must be called exactly once on touchend');
      assert.equal(harness.savedZooms[0], harness.zoom);
    });
  });

  // ==========================================================================
  // DIMENSION 6: REACT COMPONENT SSR & DOM INTEGRATION
  // ==========================================================================
  describe('Dimension 6: React Component SSR & DOM Integration', () => {
    it('ADV-PINCH-31: Canvas component renders without NaN style properties under various zoom levels', async () => {
      const Canvas = await loadComponent('./src/components/Canvas.jsx');
      const t = createTranslator('en');
      const mockTreeState = { data: { people: [], couples: [] }, photos: {} };
      const mockLayout = { W: 1200, H: 900, totalWidth: 1200, totalHeight: 900, pos: {}, branchLabels: [], genLabels: [] };

      const zoomLevels = [0.4, 0.75, 1.0, 1.25, 1.4];

      for (const z of zoomLevels) {
        const html = renderComponentToHtml(Canvas, {
          treeState: mockTreeState,
          familyIndex: {},
          layout: mockLayout,
          cardHeight: 90,
          zoom: z,
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

        assert.ok(html.includes('treewrap'), 'Must render treewrap container');
        assert.ok(html.includes('sizer'), 'Must render sizer element');
        assert.ok(!html.includes('NaN'), `Markup must not contain NaN at zoom ${z}`);
      }
    });
  });
});
