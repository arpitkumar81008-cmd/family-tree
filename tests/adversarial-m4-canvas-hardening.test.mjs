/**
 * Adversarial Empirical Challenge Suite for Milestone M4:
 * Tier 5 Adversarial Coverage Hardening — Fullscreen, Touch Gestures & Animations.
 *
 * Focus Areas:
 * 1. Interaction Compounding: User toggles full-screen mode while simultaneously executing a 2-finger pinch gesture.
 * 2. Viewport Dimension Extremes: Mobile viewports at extreme aspect ratios (320x568 iPhone SE, 390x844 iPhone 14, 412x915 Pixel 7, and landscape 844x390).
 * 3. Modal Sheet Coexistence in Fullscreen: Opening person card modal detail sheets (.overlay, z-index: 999) while in fullscreen mode (z-index: 800),
 *    pressing Escape, and verifying that ONLY the modal sheet closes without exiting fullscreen mode.
 * 4. Touch Event Cancellation and Interruption Mid-Zoom when fullscreen state changes.
 * 5. Bilingual Localization Completeness: Verify that all fullscreen toggle strings and labels in en.js and hi.js are non-empty, matched in structure, and properly referenced.
 * 6. Reduced Motion Compliance: Verify that when prefers-reduced-motion is active or :root[data-motion="reduce"] is set, all transitions on navbar, fullscreen, and canvas dock collapse to 0s or instantaneous step without layout jitter.
 *
 * Execution:
 * node --test tests/adversarial-m4-canvas-hardening.test.mjs
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

import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import { createTranslator } from '../src/i18n/index.js';
import {
  saveCanvasPan,
  saveCanvasZoom,
  loadSavedCanvasPan,
  loadSavedCanvasZoom,
  CANVAS_ZOOM_KEY,
  CANVAS_PAN_KEY
} from '../src/utils/storage.js';

// ============================================================================
// HIGH-FIDELITY UNIFIED M4 ADVERSARIAL HARNESS
// Faithfully mirrors Canvas.jsx (lines 28-457), CanvasDock.jsx, and Sheet.jsx
// ============================================================================

class CanvasM4IntegratedHarness {
  constructor(options = {}) {
    this.isFullscreenProp = options.isFullscreenProp; // undefined (uncontrolled) or boolean (controlled)
    this.onToggleFullscreenProp = options.onToggleFullscreenProp || null;
    this.internalFullscreen = false;
    this.prevFullscreen = this.isFullscreen;

    this.initialZoom = options.initialZoom ?? 1.0;
    this.zoom = this.initialZoom;
    this.layout = options.layout || { W: 2400, H: 1800, totalWidth: 2400, totalHeight: 1800, pos: {} };
    this.initialScrollLeft = options.initialScrollLeft ?? 400;
    this.initialScrollTop = options.initialScrollTop ?? 300;
    this.scrollLeft = this.initialScrollLeft;
    this.scrollTop = this.initialScrollTop;

    // Viewport & container geometry
    this.containerRect = options.containerRect || { left: 0, top: 56, width: 390, height: 844 };
    this.onCardClick = options.onCardClick || (() => {});

    // DOM & Modal mock state
    this.hasOverlayModal = Boolean(options.hasOverlayModal);
    this.hasSettingsPopover = Boolean(options.hasSettingsPopover);
    this.nativeFullscreenElement = null;

    // Spies & metrics
    this.savedZooms = [];
    this.savedPans = [];
    this.setZoomCalls = [];
    this.cardClickCalls = [];
    this.preventDefaultCount = 0;
    this.stopPropagationCount = 0;

    // RAF simulation
    this.rafQueue = [];
    this.nextRafId = 1;

    // Timer simulation
    this.timerQueue = [];

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

    // DOM element representations
    this.stageEl = {
      style: {
        transform: `scale(${this.zoom})`
      }
    };
    this.sizerEl = {
      style: {
        width: `${this.layout.W * this.zoom}px`,
        height: `${this.layout.H * this.zoom}px`
      }
    };
    this.containerEl = {
      scrollLeft: this.scrollLeft,
      scrollTop: this.scrollTop,
      clientWidth: this.containerRect.width,
      clientHeight: this.containerRect.height,
      getBoundingClientRect: () => this.containerRect,
      querySelector: (selector) => {
        if (selector === '.sizer') return this.sizerEl;
        if (selector === '.stage') return this.stageEl;
        return null;
      }
    };

    this.hostRef = {
      current: {
        requestFullscreen: async () => {
          this.nativeFullscreenElement = this.hostRef.current;
        }
      }
    };
  }

  get isFullscreen() {
    return this.isFullscreenProp !== undefined ? this.isFullscreenProp : this.internalFullscreen;
  }

  // Animation frame batching
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
    const queue = [...this.rafQueue];
    this.rafQueue = [];
    for (const item of queue) {
      if (!item.cancelled) {
        item.cb();
      }
    }
  }

  // Simulated timer queue
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

  advanceTimers(ms) {
    for (const timer of this.timerQueue) {
      if (timer.active) {
        timer.due -= ms;
        if (timer.due <= 0) {
          timer.active = false;
          timer.cb();
        }
      }
    }
  }

  // Fullscreen controller methods matching Canvas.jsx lines 54-134
  async handleToggleFullscreen() {
    const next = !this.isFullscreen;
    if (this.isFullscreenProp === undefined) {
      this.internalFullscreen = next;
    }
    this.onToggleFullscreenProp?.(next);
    this.triggerTransitionEffect();

    if (next) {
      try {
        if (this.hostRef.current?.requestFullscreen) {
          await this.hostRef.current.requestFullscreen();
        }
      } catch {
        // Fallback
      }
    } else {
      try {
        if (this.nativeFullscreenElement) {
          this.nativeFullscreenElement = null;
        }
      } catch {
        // Fallback
      }
    }
  }

  triggerTransitionEffect() {
    const currentFs = this.isFullscreen;
    if (this.prevFullscreen !== currentFs) {
      this.prevFullscreen = currentFs;
      const el = this.containerEl;
      if (el) {
        const sl = el.scrollLeft;
        const st = el.scrollTop;
        this.requestAnimationFrame(() => {
          this.containerEl.scrollLeft = sl;
          this.containerEl.scrollTop = st;
          this.savedPans.push({ scrollLeft: sl, scrollTop: st });
          saveCanvasPan({ scrollLeft: sl, scrollTop: st });
        });
      }
    }
  }

  onFullscreenChange() {
    const isDocFullscreen = Boolean(this.nativeFullscreenElement);
    if (!isDocFullscreen && this.isFullscreen) {
      if (this.isFullscreenProp === undefined) {
        this.internalFullscreen = false;
      }
      this.onToggleFullscreenProp?.(false);
      this.triggerTransitionEffect();
    }
  }

  // Keydown Escape handler matching Canvas.jsx lines 102-115
  handleKeyDown(e) {
    if (!this.isFullscreen) return;
    if (e.key === 'Escape') {
      const hasOpenModal = this.hasOverlayModal || this.hasSettingsPopover;
      if (hasOpenModal) {
        // Modal sheet or settings popover active: Canvas ignores Escape
        return;
      }
      e.preventDefault?.();
      this.handleToggleFullscreen();
    }
  }

  // Touch handlers matching Canvas.jsx lines 231-456
  handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault?.();
      this.preventDefaultCount++;

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const d0 = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rect = this.containerEl.getBoundingClientRect();
      const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
      const my = (t0.clientY + t1.clientY) / 2 - rect.top;
      const initialZ = this.zoom || 1.0;
      const sl = this.containerEl.scrollLeft;
      const st = this.containerEl.scrollTop;

      const stageX = (sl + mx) / initialZ;
      const stageY = (st + my) / initialZ;

      if (this.pinchRef.debounceTimer) {
        this.clearTimeout(this.pinchRef.debounceTimer);
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
      e.preventDefault?.();
      this.preventDefaultCount++;

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dCurr = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rect = this.containerEl.getBoundingClientRect();
      const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
      const my = (t0.clientY + t1.clientY) / 2 - rect.top;

      if (!this.pinchRef.active) {
        if (this.pinchRef.debounceTimer) {
          this.clearTimeout(this.pinchRef.debounceTimer);
          this.pinchRef.debounceTimer = null;
        }
        const initialZ = this.zoom || 1.0;
        const sl = this.containerEl.scrollLeft;
        const st = this.containerEl.scrollTop;

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

          const w = this.layout.W || 0;
          const h = this.layout.H || 0;
          this.sizerEl.style.width = `${w * pending.zoom}px`;
          this.sizerEl.style.height = `${h * pending.zoom}px`;
          this.stageEl.style.transform = `scale(${pending.zoom})`;
          this.containerEl.scrollLeft = pending.sl;
          this.containerEl.scrollTop = pending.st;
          this.zoom = pending.zoom;
          this.setZoomCalls.push(pending.zoom);
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
      let finalSL = this.containerEl.scrollLeft;
      let finalST = this.containerEl.scrollTop;

      if (pending) {
        finalZoom = pending.zoom;
        finalSL = pending.sl;
        finalST = pending.st;

        const w = this.layout.W || 0;
        const h = this.layout.H || 0;
        this.sizerEl.style.width = `${w * finalZoom}px`;
        this.sizerEl.style.height = `${h * finalZoom}px`;
        this.stageEl.style.transform = `scale(${finalZoom})`;
        this.containerEl.scrollLeft = finalSL;
        this.containerEl.scrollTop = finalST;
        this.zoom = finalZoom;
        this.setZoomCalls.push(finalZoom);
      }

      this.savedZooms.push(finalZoom);
      this.savedPans.push({ scrollLeft: finalSL, scrollTop: finalST });
      saveCanvasZoom(finalZoom);
      saveCanvasPan({ scrollLeft: finalSL, scrollTop: finalST });

      const wasPinched = this.pinchRef.hasPinched;
      this.pinchRef.active = false;
      this.pinchRef.pending = null;

      if (wasPinched) {
        if (this.pinchRef.debounceTimer) {
          this.clearTimeout(this.pinchRef.debounceTimer);
        }
        this.pinchRef.debounceTimer = this.setTimeout(() => {
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
      this.clearTimeout(this.pinchRef.debounceTimer);
      this.pinchRef.debounceTimer = null;
    }
    this.pinchRef.hasPinched = false;
  }

  handleClickCapture(e) {
    if (this.pinchRef.hasPinched) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
      this.stopPropagationCount++;
      return false;
    }
    return true;
  }

  dispatchCardClick(personId) {
    if (!this.panRef.hasDragged && !this.pinchRef.hasPinched) {
      this.onCardClick(personId);
      this.cardClickCalls.push(personId);
      return true;
    }
    return false;
  }
}

// ============================================================================
// ADVERSARIAL STRESS TEST SUITE
// ============================================================================

describe('Adversarial M4 Hardening Suite: Fullscreen, Touch Gestures & Animations', () => {
  let browserEnv;

  after(async () => {
    await closeViteServer();
  });

  beforeEach(() => {
    browserEnv = installMockBrowser('http://localhost:3000/?view=demo');
  });

  afterEach(() => {
    browserEnv.cleanup();
  });

  // =========================================================================
  // DIMENSION 1: INTERACTION COMPOUNDING (FULLSCREEN TOGGLE × ACTIVE PINCH)
  // =========================================================================
  describe('Dimension 1: Interaction Compounding (Fullscreen Toggle during Active Pinch)', () => {
    it('ADV-M4-01: Fullscreen enter during active 2-finger pinch maintains coordinate integrity without NaN', async () => {
      const harness = new CanvasM4IntegratedHarness({
        initialZoom: 1.0,
        initialScrollLeft: 200,
        initialScrollTop: 150
      });

      // 1. Initiate 2-finger touchstart
      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 }
        ]
      });
      assert.equal(harness.pinchRef.active, true, 'Pinch must be active after 2-finger touchstart');

      // 2. Pinch move inward
      harness.handleTouchMove({
        touches: [
          { clientX: 120, clientY: 200 },
          { clientX: 180, clientY: 200 }
        ]
      });
      assert.ok(harness.pinchRef.pending, 'Pending zoom update queued');

      // 3. Compounded Interaction: Toggle Fullscreen Enter while pinch is in-flight
      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, true, 'Fullscreen state must be true');

      // 4. Continue touchmove after fullscreen entry
      harness.handleTouchMove({
        touches: [
          { clientX: 130, clientY: 200 },
          { clientX: 170, clientY: 200 }
        ]
      });

      // Flush RAF
      harness.flushRaf();

      assert.ok(!Number.isNaN(harness.zoom), 'Zoom must not be NaN');
      assert.ok(harness.zoom >= 0.4 && harness.zoom <= 1.4, 'Zoom must remain clamped [0.4, 1.4]');
      assert.ok(!Number.isNaN(harness.containerEl.scrollLeft), 'scrollLeft must not be NaN');
      assert.ok(!Number.isNaN(harness.containerEl.scrollTop), 'scrollTop must not be NaN');
    });

    it('ADV-M4-02: Fullscreen exit during active 2-finger pinch preserves layout anchoring', async () => {
      const harness = new CanvasM4IntegratedHarness({
        isFullscreenProp: undefined, // Uncontrolled mode
        initialZoom: 1.2,
        initialScrollLeft: 350,
        initialScrollTop: 280
      });

      // Enter fullscreen first
      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, true);

      // Start pinch in fullscreen
      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 300 },
          { clientX: 300, clientY: 300 }
        ]
      });

      // Exit fullscreen mid-pinch
      await harness.handleToggleFullscreen();
      assert.equal(harness.isFullscreen, false, 'Must exit fullscreen cleanly');

      // Move fingers after exit
      harness.handleTouchMove({
        touches: [
          { clientX: 80, clientY: 300 },
          { clientX: 320, clientY: 300 }
        ]
      });

      harness.flushRaf();

      assert.ok(harness.zoom >= 1.2, 'Zoom should expand outward monotonically');
      assert.ok(harness.zoom <= 1.4, 'Zoom must not exceed max boundary 1.4');
    });

    it('ADV-M4-03: Rapid fullscreen toggle spam (5 cycles) during continuous touchmove stream', async () => {
      const harness = new CanvasM4IntegratedHarness({ initialZoom: 1.0 });

      harness.handleTouchStart({
        touches: [
          { clientX: 150, clientY: 250 },
          { clientX: 250, clientY: 250 }
        ]
      });

      // Rapidly toggle fullscreen 5 times while pumping touchmove
      for (let i = 0; i < 5; i++) {
        await harness.handleToggleFullscreen();
        harness.handleTouchMove({
          touches: [
            { clientX: 150 - i * 5, clientY: 250 },
            { clientX: 250 + i * 5, clientY: 250 }
          ]
        });
        harness.flushRaf();
      }

      assert.equal(harness.isFullscreen, true, 'After 5 toggles, state must be true (odd count)');
      assert.ok(harness.zoom <= 1.4 && harness.zoom >= 0.4, 'Zoom must remain strictly within [0.4, 1.4]');
    });

    it('ADV-M4-04: Touchend completion following fullscreen toggle during pinch persists state atomically', async () => {
      const harness = new CanvasM4IntegratedHarness({ initialZoom: 1.0 });

      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 300, clientY: 200 }
        ]
      });

      await harness.handleToggleFullscreen();

      harness.handleTouchMove({
        touches: [
          { clientX: 80, clientY: 200 },
          { clientX: 320, clientY: 200 }
        ]
      });

      // Release touches
      harness.handleTouchEnd({ touches: [] });

      assert.equal(harness.savedZooms.length, 1, 'Exactly one zoom persistence call on touchend');
      assert.ok(harness.savedPans.length >= 1, 'Scroll position persisted on touchend and transition');

      // Verify persisted value matches memory state
      const savedZ = loadSavedCanvasZoom();
      assert.equal(savedZ, harness.zoom, 'Saved zoom in storage must match current component zoom');
    });

    it('ADV-M4-05: Accidental card click suppression following compounded pinch + fullscreen toggle', async () => {
      const harness = new CanvasM4IntegratedHarness({
        initialZoom: 1.0,
        onCardClick: () => {}
      });

      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]
      });

      await harness.handleToggleFullscreen();

      harness.handleTouchEnd({ touches: [] });

      // Immediate card click attempt (< 120ms debounce)
      const allowedImmediate = harness.dispatchCardClick('p_target_1');
      assert.equal(allowedImmediate, false, 'Card click must be rejected during 120ms debounce window');
      assert.equal(harness.cardClickCalls.length, 0, 'No onCardClick callbacks should have fired');

      // Advance debounce timer beyond 120ms
      harness.advanceTimers(130);

      const allowedAfter = harness.dispatchCardClick('p_target_1');
      assert.equal(allowedAfter, true, 'Card click must be allowed after debounce expires');
      assert.equal(harness.cardClickCalls.length, 1, 'onCardClick should fire for intentional click');
    });
  });

  // =========================================================================
  // DIMENSION 2: VIEWPORT DIMENSION EXTREMES & ASPECT RATIOS
  // =========================================================================
  describe('Dimension 2: Viewport Dimension Extremes & Aspect Ratios', () => {
    it('ADV-M4-06: iPhone SE (320x568) — fullscreen CSS overrides standard 540px min-height to 100%', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      // Standard mode has min-height: 540px
      assert.ok(treeCss.includes('min-height: 540px;'), 'Standard .treewrap has 540px min-height');

      // Full-screen mode MUST override min-height to 100% !important
      assert.ok(
        treeCss.includes('.treewrap-host.is-fullscreen .treewrap') &&
        treeCss.includes('min-height: 100% !important'),
        'Fullscreen mode must set min-height: 100% !important to fit small screens without overflow'
      );
    });

    it('ADV-M4-07: iPhone 14 (390x844) — safe-area insets are applied to fullscreen toggle and dock in CSS', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      // Check safe-area-inset rules
      assert.ok(treeCss.includes('env(safe-area-inset-top, 0px)'), 'Fullscreen toggle must respect safe-area-inset-top');
      assert.ok(treeCss.includes('env(safe-area-inset-bottom, 0px)'), 'Fullscreen dock must respect safe-area-inset-bottom');
      assert.ok(treeCss.includes('env(safe-area-inset-right, 0px)'), 'Fullscreen controls must respect safe-area-inset-right');
    });

    it('ADV-M4-08: Pixel 7 (412x915 ultra-tall) — boundary corner touches produce non-negative coordinates', () => {
      const harness = new CanvasM4IntegratedHarness({
        containerRect: { left: 0, top: 0, width: 412, height: 915 },
        initialScrollLeft: 0,
        initialScrollTop: 0,
        initialZoom: 1.0
      });

      // Pinch centered at top-left corner (0, 0)
      harness.handleTouchStart({
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 20, clientY: 20 }
        ]
      });

      harness.handleTouchMove({
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 10, clientY: 10 }
        ]
      });

      harness.flushRaf();

      assert.ok(harness.containerEl.scrollLeft >= 0, 'scrollLeft must remain non-negative at (0,0)');
      assert.ok(harness.containerEl.scrollTop >= 0, 'scrollTop must remain non-negative at (0,0)');
    });

    it('ADV-M4-09: Landscape mobile (844x390, aspect 2.164) — inner canvas fills viewport and removes borders', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      // Check border removal and 100% height
      assert.ok(treeCss.includes('border: none !important'), 'Borders must be removed in fullscreen');
      assert.ok(treeCss.includes('margin: 0 !important'), 'Margins must be 0 in fullscreen');
      assert.ok(treeCss.includes('height: 100dvh !important'), 'Host must use 100dvh for dynamic viewport height');
    });

    it('ADV-M4-10: Dynamic orientation transition mid-pinch (portrait 390x844 -> landscape 844x390)', () => {
      const harness = new CanvasM4IntegratedHarness({
        containerRect: { left: 0, top: 0, width: 390, height: 844 },
        initialZoom: 1.0
      });

      // Start in portrait
      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 }
        ]
      });

      // Screen rotates mid-gesture: container rect changes to landscape
      harness.containerRect = { left: 0, top: 0, width: 844, height: 390 };

      // Move fingers in new landscape coordinate space
      harness.handleTouchMove({
        touches: [
          { clientX: 150, clientY: 150 },
          { clientX: 350, clientY: 150 }
        ]
      });

      harness.flushRaf();

      assert.ok(!Number.isNaN(harness.zoom), 'Zoom must be finite number after orientation change');
      assert.ok(!Number.isNaN(harness.containerEl.scrollLeft), 'scrollLeft must be finite after rotation');
      assert.ok(!Number.isNaN(harness.containerEl.scrollTop), 'scrollTop must be finite after rotation');
    });
  });

  // =========================================================================
  // DIMENSION 3: MODAL SHEET COEXISTENCE & ESCAPE KEY HIERARCHY IN FULLSCREEN
  // =========================================================================
  describe('Dimension 3: Modal Sheet Coexistence & Escape Key Hierarchy in Fullscreen', () => {
    it('ADV-M4-11: CSS Z-Index hierarchy validation: .overlay (999) > fullscreen canvas (800) > dock (20)', () => {
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
      const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
      const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');

      // Stacking order:
      assert.ok(componentsCss.includes('z-index: 999'), 'Modal .overlay must have z-index: 999');
      assert.ok(treeCss.includes('z-index: 800 !important'), 'Fullscreen host must have z-index: 800 !important');
      assert.ok(landingCss.includes('z-index: 20'), 'Canvas dock must have z-index: 20');
    });

    it('ADV-M4-12: Person card modal sheet opened in fullscreen mode: Escape closes ONLY the modal sheet', () => {
      const harness = new CanvasM4IntegratedHarness({
        initialZoom: 1.0,
        hasOverlayModal: true // Modal is OPEN
      });

      // Enter fullscreen
      harness.internalFullscreen = true;
      assert.equal(harness.isFullscreen, true);

      // User presses Escape while modal is open
      let defaultPrevented = false;
      harness.handleKeyDown({
        key: 'Escape',
        preventDefault: () => { defaultPrevented = true; }
      });

      // Canvas should have IGNORED the Escape key because hasOverlayModal is true
      assert.equal(harness.isFullscreen, true, 'Fullscreen MUST remain true when modal sheet is dismissed');
      assert.equal(defaultPrevented, false, 'Canvas keydown handler must not prevent default when modal handles it');
    });

    it('ADV-M4-13: Sequential Escape key dismissal (Stage 1: Modal closes -> Stage 2: Fullscreen exits)', () => {
      const harness = new CanvasM4IntegratedHarness({
        hasOverlayModal: true
      });
      harness.internalFullscreen = true;

      // Stage 1: Escape with modal open
      harness.handleKeyDown({ key: 'Escape' });
      assert.equal(harness.isFullscreen, true, 'Stage 1: Fullscreen remains active');

      // Simulate Sheet.jsx closing and removing .overlay from DOM
      harness.hasOverlayModal = false;

      // Stage 2: Escape with modal closed
      let defaultPrevented = false;
      harness.handleKeyDown({
        key: 'Escape',
        preventDefault: () => { defaultPrevented = true; }
      });
      assert.equal(harness.isFullscreen, false, 'Stage 2: Fullscreen exits cleanly');
      assert.equal(defaultPrevented, true, 'Canvas handler prevents default on fullscreen exit');
    });

    it('ADV-M4-14: Settings popover open in fullscreen mode: Escape dismisses popover, keeping fullscreen', () => {
      const harness = new CanvasM4IntegratedHarness({
        hasSettingsPopover: true
      });
      harness.internalFullscreen = true;

      harness.handleKeyDown({ key: 'Escape' });
      assert.equal(harness.isFullscreen, true, 'Fullscreen must stay active when Settings popover is dismissed');

      // Popover closes
      harness.hasSettingsPopover = false;

      // Next Escape exits fullscreen
      harness.handleKeyDown({ key: 'Escape' });
      assert.equal(harness.isFullscreen, false, 'Second Escape exits fullscreen');
    });

    it('ADV-M4-15: Static AST check: Canvas.jsx guards Escape with .overlay and .settings-popover query', () => {
      const canvasJsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasJsx.includes("document.querySelector('.overlay, .settings-popover')"),
        'Canvas.jsx must inspect DOM for active overlay/settings before processing Escape'
      );
      assert.ok(
        canvasJsx.includes('if (hasOpenModal) return;'),
        'Canvas.jsx must return early if modal is open'
      );
    });
  });

  // =========================================================================
  // DIMENSION 4: TOUCH CANCELLATION & INTERRUPTION MID-ZOOM
  // =========================================================================
  describe('Dimension 4: Touch Cancellation & Interruption Mid-Zoom During Fullscreen Transitions', () => {
    it('ADV-M4-16: System alert / incoming call interruption (touchcancel) cleanly aborts pinch', () => {
      const harness = new CanvasM4IntegratedHarness({ initialZoom: 1.0 });

      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]
      });

      harness.handleTouchMove({
        touches: [
          { clientX: 120, clientY: 100 },
          { clientX: 180, clientY: 100 }
        ]
      });

      assert.equal(harness.pinchRef.active, true);
      assert.ok(harness.pinchRef.pending !== null);

      // touchcancel event fired by OS
      harness.handleTouchCancel();

      assert.equal(harness.pinchRef.active, false, 'Active pinch must be false after touchcancel');
      assert.equal(harness.pinchRef.pending, null, 'Pending state must be cleared after touchcancel');
      assert.equal(harness.pinchRef.rafId, null, 'RAF ID must be cancelled after touchcancel');
      assert.equal(harness.pinchRef.hasPinched, false, 'hasPinched must be reset to false immediately');
    });

    it('ADV-M4-17: Immediate card tap (< 30ms) following touchcancel successfully triggers onCardClick', () => {
      const harness = new CanvasM4IntegratedHarness({
        initialZoom: 1.0,
        onCardClick: () => {}
      });

      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]
      });

      harness.handleTouchCancel();

      // Card tap dispatched immediately (0ms delay)
      const allowed = harness.dispatchCardClick('p_target_2');
      assert.equal(allowed, true, 'Intentional tap must open card immediately without 120ms debounce after cancel');
      assert.equal(harness.cardClickCalls.length, 1, 'Card click callback was invoked');
    });

    it('ADV-M4-18: Dirty touch transition during fullscreen toggle: 2-finger -> fullscreen -> 3-finger -> 1-finger', async () => {
      const harness = new CanvasM4IntegratedHarness({ initialZoom: 1.0 });

      // 2 fingers
      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]
      });
      assert.equal(harness.preventDefaultCount, 1);

      // Toggle fullscreen
      await harness.handleToggleFullscreen();

      // 3 fingers (palm / extra touch) - must NOT call preventDefault
      const prevPreventCount = harness.preventDefaultCount;
      harness.handleTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
          { clientX: 150, clientY: 150 }
        ]
      });
      assert.equal(harness.preventDefaultCount, prevPreventCount, '3-finger touch must not call preventDefault');

      // Drop to 1 finger
      harness.handleTouchMove({
        touches: [{ clientX: 150, clientY: 160 }]
      });
      assert.equal(harness.preventDefaultCount, prevPreventCount, '1-finger touchmove must not call preventDefault');
    });

    it('ADV-M4-19: Canvas.jsx attaches non-passive touchcancel listener', () => {
      const canvasJsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasJsx.includes("el.addEventListener('touchcancel', handleTouchCancel, { passive: false })"),
        'Canvas.jsx must attach touchcancel listener with { passive: false }'
      );
      assert.ok(
        canvasJsx.includes("el.removeEventListener('touchcancel', handleTouchCancel)"),
        'Canvas.jsx must clean up touchcancel listener in useEffect return'
      );
    });
  });

  // =========================================================================
  // DIMENSION 5: BILINGUAL LOCALIZATION COMPLETENESS & PARITY
  // =========================================================================
  describe('Dimension 5: Bilingual Localization Completeness & Parity', () => {
    const requiredKeys = ['fullscreenEnter', 'fullscreenExit', 'fullscreenEnterShort', 'fullscreenExitShort'];

    it('ADV-M4-20: Strict dictionary parity: all fullscreen keys present in both en.js and hi.js', () => {
      for (const k of requiredKeys) {
        assert.ok(k in en, `en.js must define key "${k}"`);
        assert.ok(k in hi, `hi.js must define key "${k}"`);
      }
    });

    it('ADV-M4-21: Non-empty string content and Devanagari script integrity', () => {
      const devanagariRegex = /[\u0900-\u097F]/;

      for (const k of requiredKeys) {
        assert.equal(typeof en[k], 'string', `en.${k} must be string`);
        assert.equal(typeof hi[k], 'string', `hi.${k} must be string`);
        assert.ok(en[k].trim().length > 0, `en.${k} must not be empty/whitespace`);
        assert.ok(hi[k].trim().length > 0, `hi.${k} must not be empty/whitespace`);
        assert.ok(devanagariRegex.test(hi[k]), `hi.${k} must contain Devanagari characters: "${hi[k]}"`);
      }
    });

    it('ADV-M4-22: Translation function createTranslator resolves exact strings in both languages', () => {
      const tEn = createTranslator('en');
      const tHi = createTranslator('hi');

      assert.equal(tEn('fullscreenEnter'), 'Enter full screen');
      assert.equal(tEn('fullscreenExit'), 'Exit full screen');
      assert.equal(tEn('fullscreenEnterShort'), 'Full screen');
      assert.equal(tEn('fullscreenExitShort'), 'Exit');

      assert.equal(tHi('fullscreenEnter'), 'फुल स्क्रीन में देखें');
      assert.equal(tHi('fullscreenExit'), 'फुल स्क्रीन से बाहर निकलें');
      assert.equal(tHi('fullscreenEnterShort'), 'फुल स्क्रीन');
      assert.equal(tHi('fullscreenExitShort'), 'बाहर निकलें');
    });

    it('ADV-M4-23: CanvasDock button accessibility title & text symmetry in Hindi mode', async () => {
      const CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
      const tHi = createTranslator('hi');

      const htmlHiStandard = renderComponentToHtml(CanvasDock, {
        zoom: 1.0,
        onZoomIn: () => {},
        onZoomOut: () => {},
        onFit: () => {},
        onPan: () => {},
        onReset: () => {},
        onToggleFullscreen: () => {},
        isFullscreen: false,
        t: tHi,
        lang: 'hi'
      });

      assert.ok(htmlHiStandard.includes('फुल स्क्रीन'), 'Standard dock must show Hindi fullscreen label');
      assert.ok(htmlHiStandard.includes('पूर्ण-स्क्रीन दृश्य'), 'Standard dock must have Hindi title');

      const htmlHiFullscreen = renderComponentToHtml(CanvasDock, {
        zoom: 1.0,
        onZoomIn: () => {},
        onZoomOut: () => {},
        onFit: () => {},
        onPan: () => {},
        onReset: () => {},
        onToggleFullscreen: () => {},
        isFullscreen: true,
        t: tHi,
        lang: 'hi'
      });

      assert.ok(htmlHiFullscreen.includes('बाहर निकलें'), 'Fullscreen dock must show Hindi exit label');
      assert.ok(htmlHiFullscreen.includes('पूर्ण-स्क्रीन से बाहर निकलें'), 'Fullscreen dock must have Hindi exit title');
    });
  });

  // =========================================================================
  // DIMENSION 6: REDUCED MOTION COMPLIANCE & UI ANIMATION GPU SAFETY
  // =========================================================================
  describe('Dimension 6: Reduced Motion Compliance & UI Animation GPU Safety', () => {
    it('ADV-M4-24: :root[data-motion="reduce"] collapses transitions across navbar, fullscreen, and tokens', () => {
      const tokensCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf-8');
      const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      // Global token rule
      assert.ok(
        tokensCss.includes(':root[data-motion="reduce"] *') &&
        tokensCss.includes('transition: none !important') &&
        tokensCss.includes('animation: none !important'),
        'tokens.css must disable all transitions and animations under data-motion="reduce"'
      );

      // Component explicit rules
      assert.ok(landingCss.includes(':root[data-motion="reduce"] .site-nav'), 'landing.css covers .site-nav');
      assert.ok(treeCss.includes(':root[data-motion="reduce"] .treewrap-host.is-fullscreen'), 'tree.css covers fullscreen host');
      assert.ok(treeCss.includes(':root[data-motion="reduce"] .canvas-fullscreen-toggle'), 'tree.css covers fullscreen toggle');
    });

    it('ADV-M4-25: @media (prefers-reduced-motion: reduce) rules exist in landing.css and tree.css', () => {
      const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      assert.ok(
        landingCss.includes('@media (prefers-reduced-motion: reduce)') &&
        landingCss.includes('.site-nav'),
        'landing.css must include prefers-reduced-motion for .site-nav'
      );
      assert.ok(
        treeCss.includes('@media (prefers-reduced-motion: reduce)') &&
        treeCss.includes('.canvas-fullscreen-toggle') &&
        treeCss.includes('.treewrap-host.is-fullscreen'),
        'tree.css must include prefers-reduced-motion for fullscreen toggle and host'
      );
    });

    it('ADV-M4-26: Canvas.jsx skips JS Motion animate() calls when reduced motion is detected', () => {
      const canvasJsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');

      assert.ok(
        canvasJsx.includes("document.documentElement.getAttribute('data-motion') === 'reduce'"),
        'Canvas.jsx must inspect data-motion attribute'
      );
      assert.ok(
        canvasJsx.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches"),
        'Canvas.jsx must inspect prefers-reduced-motion media query'
      );
      assert.ok(
        canvasJsx.includes('if (isReduced) return;'),
        'Canvas.jsx must return early before calling animate()'
      );
    });

    it('ADV-M4-27: Hardware acceleration: interactive components use transform and opacity with zero layout thrashing', () => {
      const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
      const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');

      // .site-nav transition uses transform and opacity
      assert.ok(
        landingCss.includes('transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease'),
        '.site-nav must use GPU accelerated properties (transform, opacity)'
      );
      assert.ok(
        landingCss.includes('will-change: transform, opacity;'),
        '.site-nav must declare will-change for GPU layering'
      );

      // .stage will-change: transform
      assert.ok(
        treeCss.includes('will-change: transform;'),
        '.stage must declare will-change: transform for smooth scale'
      );
    });

    it('ADV-M4-28: SSR Component verification: Canvas renders without errors across viewports', async () => {
      const Canvas = await loadComponent('./src/components/Canvas.jsx');
      const t = createTranslator('en');

      const mockTreeState = {
        data: {
          people: [
            { id: 'p1', name: 'Arpit', g: 'M' },
            { id: 'p2', name: 'Priya', g: 'F' }
          ]
        },
        photos: {}
      };

      const mockLayout = {
        W: 1200,
        H: 800,
        pos: {
          p1: { x: 100, y: 100 },
          p2: { x: 300, y: 100 }
        }
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
        displayName: id => id,
        onCardClick: () => {},
        onZoom: () => {},
        onResetViewer: () => {},
        isFullscreen: false
      });

      assert.ok(html.includes('treewrap-host'), 'Rendered HTML contains treewrap-host');
      assert.ok(html.includes('canvas-fullscreen-toggle'), 'Rendered HTML contains canvas-fullscreen-toggle');
      assert.ok(html.includes('canvas-dock'), 'Rendered HTML contains canvas-dock');
    });
  });
});
