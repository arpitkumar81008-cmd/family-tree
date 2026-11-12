# Handoff Report: Touch Event Lifecycle, Non-Passive Listeners & Click Suppression

**Agent**: Explorer M3-1  
**Milestone**: M3 — Pinch-to-Zoom Touch Gestures & Tree Pan Smoothness  
**Working Directory**: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m3_1`  
**Target File**: `src/components/Canvas.jsx`

---

## 1. Observation

### 1.1 Existing Event Handling in `src/components/Canvas.jsx`
- **Mouse Drag Handling**: Lines 149–188 in `src/components/Canvas.jsx` establish mouse pan interactions:
  ```javascript
  // Lines 31, 150-180
  const panRef = useRef({ active: false, hasDragged: false, sx: 0, sy: 0, sl: 0, st: 0 });
  // window mousemove and mouseup listeners manipulate containerRef.current.scrollLeft and scrollTop
  ```
- **Absence of Touch Listeners**: `Canvas.jsx` currently declares **zero** touch listeners (`touchstart`, `touchmove`, `touchend`, `touchcancel`). Mobile panning operates solely through default HTML/CSS overflow scrolling on `.treewrap` (defined in `src/styles/tree.css` line 12: `overflow: auto; touch-action: pan-x pan-y;`).
- **Card Click Invocation**: Lines 397–401 in `src/components/Canvas.jsx` attach the card click callback:
  ```javascript
  onClick={() => {
    if (!panRef.current.hasDragged) {
      onCardClick(person.id);
    }
  }}
  ```
  `panRef.current.hasDragged` only becomes `true` during mouse drag interactions (> 4px movement in `handleMouseMove`). During touch pinch gestures, `panRef.current.hasDragged` remains `false`.
- **Layout Sizing Dimension Guard**: Lines 311–322 currently use:
  ```javascript
  width: layout.W * zoom,
  height: layout.H * zoom
  ```
  When test fixtures supply `{ totalWidth: 1000, totalHeight: 800 }` instead of `layout.W`, `undefined * zoom` yields `NaN`, triggering a React warning: `Warning: NaN is an invalid value for the width css style property`.

### 1.2 Test Suite Contracts in `tests/e2e-mobile-ux.test.mjs`
- **T1-R3-06 (Single-Finger Pan Isolation)**: Lines 536–550 explicitly test:
  ```javascript
  const mockTouchMove = (touches) => {
    if (touches.length === 2) {
      preventDefaultCalled = true;
    }
  };
  mockTouchMove([{ clientX: 10, clientY: 20 }]);
  assert.equal(preventDefaultCalled, false, 'Single-finger touch must NOT call preventDefault (preserves native pan)');
  mockTouchMove([{ clientX: 10, clientY: 20 }, { clientX: 50, clientY: 60 }]);
  assert.equal(preventDefaultCalled, true, 'Two-finger pinch MUST call preventDefault');
  ```
- **T1-R3-07 & T3-PAIR-08 (Card Click Suppression)**: Lines 552–571 & 1038–1052 specify:
  Finishing a pinch gesture sets `hasPinched = true` debounced for ~120ms. Clicks arriving before debounce expiration must be suppressed; clicks after expiration must proceed.
- **T2-R3-06 (Touch Cancel Resilience)**: Lines 881–891 mandate that `touchcancel` immediately clears pinch tracking and resets flags without stuck state.
- **T2-R3-03 & T4-SCEN-05 (Multi-Finger and Dirty Touch Resilience)**: 3 or more touches or rapid taps must not corrupt zoom or panic.

---

## 2. Logic Chain

1. **Passive Event Listener Conflict**:
   - Modern browsers (Chrome 56+, iOS Safari 11.3+) treat `touchstart` and `touchmove` listeners on scrollable containers as `passive: true` by default.
   - Calling `e.preventDefault()` inside a passive listener throws a console warning and does not prevent default browser gesture actions (such as full-page viewport zoom or swipe-to-navigate).
   - Therefore, listeners MUST be attached imperatively to `containerRef.current` using `el.addEventListener(type, handler, { passive: false })`.
   - `touchcancel` does not cancel browser action, so `{ passive: true }` is optimal.

2. **Strict Gesture Isolation (`e.touches.length === 2` vs `=== 1`)**:
   - When a user navigates the tree with a single finger, `e.touches.length === 1`. Calling `preventDefault()` would kill native hardware-accelerated momentum scrolling (`-webkit-overflow-scrolling: touch`).
   - By asserting `if (e.touches.length === 2) { e.preventDefault(); ... }`, single-finger panning is 100% untracked and native, while two-finger pinch gestures are captured and intercepted exclusively by the canvas stage zoom engine.
   - If `e.touches.length > 2`, no pinch update is triggered, preventing coordinate corruption from palm contacts or edge swipes.

3. **Mechanism of Synthetic Click Generation & Dual-Layer Suppression**:
   - In mobile browsers (WebKit and Blink), when two fingers lift off the screen after a pinch, the browser dispatches synthetic `pointerdown` / `pointerup` / `mousedown` / `mouseup` / `click` events targeted at `document.elementFromPoint(lastTouchX, lastTouchY)`.
   - Because the pinch focal point often rests directly on or near family member cards (`.card`), these synthetic clicks trigger modal card openings.
   - To defeat this, we implement a **dual-layer suppression architecture**:
     - **Layer 1 (Native DOM Capture Interceptor)**: Attach `containerRef.current.addEventListener('click', handleClickCapture, { capture: true })`. During the capturing phase (before reaching `.card`), if `pinchRef.current.hasPinched === true`, `e.preventDefault()`, `e.stopPropagation()`, and `e.stopImmediatePropagation()` are called, instantly terminating the synthetic click event.
     - **Layer 2 (Component Callback Guard)**: In `<Card onClick={...}>`, guard with `if (!panRef.current.hasDragged && !pinchRef.current.hasPinched) onCardClick(person.id);`.
   - **Debounce Window**: `pinchRef.current.hasPinched` is held `true` during the pinch and for 120ms after `touchend`. Synthetic clicks arrive within 0–80ms, so 120ms cleanly swallows the burst while allowing subsequent intentional taps (> 150ms) to register smoothly.

4. **Listener Stability via `zoomRef`**:
   - If the `useEffect` attaching touch listeners had `[zoom]` in its dependency array, every pinch frame (up to 60–120Hz) would tear down and re-register DOM event listeners, causing dropped touch events and frame stutter.
   - By creating `zoomRef = useRef(zoom)` and updating `zoomRef.current = zoom` on each render, the touch listener effect depends only on `[setZoom]` (or `[]`), remaining permanently attached and glitch-free.

---

## 3. Caveats

- **No Caveats on Implementation Feasibility**: The solution is completely self-contained within `src/components/Canvas.jsx` and does not require modifications to `App.jsx`, `Card.jsx`, or CSS stylesheets.
- **Scope Boundary**: Math equations for focal anchoring and RAF batching are co-designed with Explorer M3-2. The blueprint below integrates these seamlessly.

---

## 4. Conclusion & Concrete Implementation Blueprint

### 4.1 State & Ref Structure
In `src/components/Canvas.jsx`:
```javascript
const pinchRef = useRef({
  isPinching: false,
  hasPinched: false,
  pinchTimeout: null,
  rafId: null,
  rafScheduled: false,
  pendingEvent: null,
  startDist: 0,
  startZoom: 1,
  startScrollLeft: 0,
  startScrollTop: 0,
  startMidX: 0,
  startMidY: 0
});

const zoomRef = useRef(zoom);
zoomRef.current = zoom;
```

### 4.2 Non-Passive Touch & Click Capture `useEffect`
```javascript
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  const onPinchFrame = () => {
    pinchRef.current.rafScheduled = false;
    if (!pinchRef.current.pendingEvent || !containerRef.current) return;

    const { dist, midX, midY } = pinchRef.current.pendingEvent;
    const { startDist, startZoom, startScrollLeft, startScrollTop, startMidX, startMidY } = pinchRef.current;

    if (startDist <= 0.0001) return;

    const ratio = dist / startDist;
    const rawZoom = startZoom * ratio;
    const clampedZoom = Math.min(1.4, Math.max(0.4, Number(rawZoom.toFixed(3))));

    const stageX = (startMidX + startScrollLeft) / startZoom;
    const stageY = (startMidY + startScrollTop) / startZoom;

    const nextScrollX = Math.max(0, stageX * clampedZoom - midX);
    const nextScrollY = Math.max(0, stageY * clampedZoom - midY);

    containerRef.current.scrollLeft = nextScrollX;
    containerRef.current.scrollTop = nextScrollY;

    setZoom(clampedZoom);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rect = el.getBoundingClientRect();
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top;

      if (pinchRef.current.pinchTimeout) {
        clearTimeout(pinchRef.current.pinchTimeout);
        pinchRef.current.pinchTimeout = null;
      }

      pinchRef.current.isPinching = true;
      pinchRef.current.hasPinched = true;
      pinchRef.current.startDist = dist;
      pinchRef.current.startZoom = zoomRef.current;
      pinchRef.current.startScrollLeft = el.scrollLeft;
      pinchRef.current.startScrollTop = el.scrollTop;
      pinchRef.current.startMidX = midX;
      pinchRef.current.startMidY = midY;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rect = el.getBoundingClientRect();
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top;

      if (!pinchRef.current.isPinching) {
        if (pinchRef.current.pinchTimeout) {
          clearTimeout(pinchRef.current.pinchTimeout);
          pinchRef.current.pinchTimeout = null;
        }
        pinchRef.current.isPinching = true;
        pinchRef.current.hasPinched = true;
        pinchRef.current.startDist = dist;
        pinchRef.current.startZoom = zoomRef.current;
        pinchRef.current.startScrollLeft = el.scrollLeft;
        pinchRef.current.startScrollTop = el.scrollTop;
        pinchRef.current.startMidX = midX;
        pinchRef.current.startMidY = midY;
        return;
      }

      pinchRef.current.pendingEvent = { dist, midX, midY };

      if (!pinchRef.current.rafScheduled) {
        pinchRef.current.rafScheduled = true;
        pinchRef.current.rafId = requestAnimationFrame(onPinchFrame);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (pinchRef.current.isPinching && e.touches.length < 2) {
      pinchRef.current.isPinching = false;
      if (pinchRef.current.rafId) {
        cancelAnimationFrame(pinchRef.current.rafId);
        pinchRef.current.rafId = null;
        pinchRef.current.rafScheduled = false;
      }
      if (containerRef.current) {
        saveCanvasPan({
          scrollLeft: containerRef.current.scrollLeft,
          scrollTop: containerRef.current.scrollTop
        });
      }
      if (pinchRef.current.pinchTimeout) {
        clearTimeout(pinchRef.current.pinchTimeout);
      }
      pinchRef.current.pinchTimeout = setTimeout(() => {
        pinchRef.current.hasPinched = false;
        pinchRef.current.pinchTimeout = null;
      }, 120);
    }
  };

  const handleTouchCancel = () => {
    if (pinchRef.current.isPinching) {
      pinchRef.current.isPinching = false;
      if (pinchRef.current.rafId) {
        cancelAnimationFrame(pinchRef.current.rafId);
        pinchRef.current.rafId = null;
        pinchRef.current.rafScheduled = false;
      }
      if (pinchRef.current.pinchTimeout) {
        clearTimeout(pinchRef.current.pinchTimeout);
        pinchRef.current.pinchTimeout = null;
      }
      pinchRef.current.hasPinched = false;
    }
  };

  const handleClickCapture = (e) => {
    if (pinchRef.current.hasPinched) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }
  };

  el.addEventListener('touchstart', handleTouchStart, { passive: false });
  el.addEventListener('touchmove', handleTouchMove, { passive: false });
  el.addEventListener('touchend', handleTouchEnd, { passive: false });
  el.addEventListener('touchcancel', handleTouchCancel, { passive: true });
  el.addEventListener('click', handleClickCapture, { capture: true });

  return () => {
    el.removeEventListener('touchstart', handleTouchStart);
    el.removeEventListener('touchmove', handleTouchMove);
    el.removeEventListener('touchend', handleTouchEnd);
    el.removeEventListener('touchcancel', handleTouchCancel);
    el.removeEventListener('click', handleClickCapture, { capture: true });

    if (pinchRef.current.rafId) {
      cancelAnimationFrame(pinchRef.current.rafId);
    }
    if (pinchRef.current.pinchTimeout) {
      clearTimeout(pinchRef.current.pinchTimeout);
    }
  };
}, [setZoom]);
```

### 4.3 Card Click Guard
In the `treeState.data.people.map` render loop inside `Canvas.jsx`:
```jsx
onClick={() => {
  if (!panRef.current.hasDragged && !pinchRef.current.hasPinched) {
    onCardClick(person.id);
  }
}}
```

### 4.4 Sizer & Stage Layout Guard
Replace `layout.W * zoom` with safe fallback:
```jsx
const stageWidth = layout.W || layout.totalWidth || 0;
const stageHeight = layout.H || layout.totalHeight || 0;

<div
  className="sizer"
  style={{
    width: stageWidth * zoom,
    height: stageHeight * zoom
  }}
>
  <div
    ref={stageRef}
    className="stage"
    style={{
      width: stageWidth,
      height: stageHeight,
      transform: `scale(${zoom})`
    }}
  >
```

---

## 5. Verification Method

1. **E2E Mobile Test Suite**:
   ```bash
   node --test tests/e2e-mobile-ux.test.mjs
   ```
   Must pass 64/64 tests with zero failures or warnings.
2. **Existing Regression Test Suite**:
   ```bash
   npm test
   ```
   Must pass 109/109 tests.
3. **Invalidation Conditions**:
   - If `mockTouchMove([{ clientX: 10, clientY: 20 }])` ever invokes `preventDefault()`, `T1-R3-06` fails.
   - If a card opens within 120ms of a pinch release, `T1-R3-07` and `T3-PAIR-08` fail.
   - If `touchcancel` does not reset `isPinching` to `false`, `T2-R3-06` fails.
