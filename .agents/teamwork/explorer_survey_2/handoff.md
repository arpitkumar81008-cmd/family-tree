# Technical Investigation Report: Tree Rendering, Pan, Zoom, Pinch-to-Zoom (R3), and Full-Screen Mode (R2)

**Explorer**: `explorer_survey_2`  
**Role**: Technical Explorer (Tree Interaction, Pan & Zoom)  
**Date**: 2026-11-09T13:21:00Z  
**Target Milestone**: Survey & Architectural Recommendation  
**Working Directory**: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_survey_2`

---

## 1. Observation

### 1.1 Technology Stack & Rendering Architecture
Direct inspection of `package.json`, `src/App.jsx`, `src/components/Canvas.jsx`, `src/components/Card.jsx`, `src/layout/engine.js`, and `src/styles/tree.css` reveals that the tree is rendered using a **Hybrid HTML DOM + SVG coordinate system inside a native scrollable container**:
- **SVG Layer (`<svg className="lines">`)**: Draws bezier/orthogonal lineage connector lines (`layout.mainPath`, `layout.otherPath`, `layout.bridgePath`, `layout.guideLines`).
- **HTML DOM Layer (`<Card />`, `.branch-pill`, `.gen-rail`)**: Renders interactive person cards, generation labels, and branch badges as absolutely positioned `div` elements.
- **Motion (`motion@14.10.1`)**: Used in `Canvas.jsx:42-56` for staggered opacity entrance animations on cards and SVG paths upon perspective switch or tree load.

### 1.2 Viewport DOM Hierarchy & Container Sizing
From `src/components/Canvas.jsx` (lines 198–258):
```jsx
<div className="treewrap-host">
  <div
    ref={containerRef}
    className="treewrap"
    tabIndex={0}
    role="region"
    aria-label={t("treeRegion")}
    onMouseDown={...}
  >
    <div
      className="sizer"
      style={{
        width: layout.W * zoom,
        height: layout.H * zoom
      }}
    >
      <div
        ref={stageRef}
        className="stage"
        style={{
          width: layout.W,
          height: layout.H,
          transform: `scale(${zoom})`
        }}
      >
        <svg
          className="lines"
          width={layout.W}
          height={layout.H}
          viewBox={`0 0 ${layout.W} ${layout.H}`}
          aria-hidden="true"
        >
          ...
        </svg>
        ...
```

Styling rules from `src/styles/tree.css` and `src/styles/landing.css`:
- `src/styles/tree.css:3-20`:
  ```css
  .treewrap {
    position: relative;
    width: 100%;
    background: var(--surface);
    overflow: auto;
    scrollbar-width: thin;
    height: calc(100vh - 210px);
    min-height: 540px;
    margin-block: 16px;
    user-select: none;
    touch-action: pan-x pan-y;
  }
  ```
- `src/styles/tree.css:48-58`:
  ```css
  .stage {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
  .sizer {
    position: relative;
  }
  ```
- `src/styles/landing.css:1100-1103`:
  ```css
  :root[data-viewport="mobile"] .treewrap {
    height: 64vh;
    min-height: 400px;
  }
  ```
- `src/styles/landing.css:1138-1141`:
  ```css
  @media (max-width: 768px) {
    :root:not([data-viewport="laptop"]) .treewrap {
      height: 66vh;
      min-height: 420px;
    }
  }
  ```

### 1.3 Coordinate Mapping Mechanism
The spatial layout engine (`src/layout/engine.js`) computes absolute unscaled coordinates:
- Each person card has position `pos[person.id] = { x, y }`. Card size is fixed: `CARD_W = 96px`, `cardHeight = 138px`.
- Overall canvas layout bounds: `layout.W` (min 800px) and `layout.H` (min 600px).
- `.stage` is fixed at unscaled dimensions `width: layout.W, height: layout.H`, but scaled via CSS: `transform: scale(${zoom})` with `transform-origin: 0 0`.
- `.sizer` provides the physical scrollable area to the browser: `width: layout.W * zoom, height: layout.H * zoom`.
- Therefore, panning is implemented entirely by scrolling the container (`containerRef.current.scrollLeft` and `scrollTop`).
- Coordinate transformation between Viewport / Client coordinates $(S_x, S_y)$ and Stage coordinates $(P_{stage\_x}, P_{stage\_y})$:
  $$V_x = S_x - \text{rect.left}$$
  $$V_y = S_y - \text{rect.top}$$
  $$P_{stage\_x} = \frac{V_x + \text{scrollLeft}}{\text{zoom}}$$
  $$P_{stage\_y} = \frac{V_y + \text{scrollTop}}{\text{zoom}}$$

### 1.4 Existing Zoom and Pan Implementation
1. **Pan Implementation**:
   - **Desktop (Mouse Drag)** in `Canvas.jsx` (lines 60–99, 206–217):
     - Uses `panRef = useRef({ active: false, hasDragged: false, sx: 0, sy: 0, sl: 0, st: 0 })`.
     - `onMouseDown`: Captures `sx = e.clientX, sy = e.clientY, sl = scrollLeft, st = scrollTop`.
     - `mousemove` on `window`: If moved $> 4\text{px}$, sets `hasDragged = true`, adds `.is-panning` class, and adjusts `scrollLeft = sl - dx`, `scrollTop = st - dy`.
     - `mouseup` on `window`: Clears `.is-panning`, saves pan to storage (`saveCanvasPan`), and clears `hasDragged` after 60ms.
     - Card click suppression (`Canvas.jsx:309`):
       ```javascript
       onClick={() => {
         if (!panRef.current.hasDragged) {
           onCardClick(person.id);
         }
       }}
       ```
   - **Mobile (Native Touch Pan)**:
     - Handled natively by browser overflow scrolling due to `overflow: auto` and `touch-action: pan-x pan-y` on `.treewrap`.
     - Debounced scroll listener in `Canvas.jsx:101-122` saves scroll position to `localStorage["gupta_canvas_pan"]` after 150ms of idle.
   - **Directional Pan Buttons**:
     - `CanvasDock.jsx` has directional buttons (`← ↑ ↓ →`) calling `handlePanBy(dx, dy)` in `Canvas.jsx:137-147`, invoking `el.scrollBy({ left: dx, top: dy, behavior: "smooth" })`.

2. **Zoom Implementation**:
   - State managed in `App.jsx:130`: `const [zoom, setZoom] = useState(() => loadSavedCanvasZoom(1));`.
   - Bounds defined in `src/utils/storage.js:41-48`:
     `MIN_CANVAS_ZOOM = 0.4`, `MAX_CANVAS_ZOOM = 1.4`.
     `clampCanvasZoom(z, delta = 0)` clamps between 0.4 and 1.4 with 2 decimal precision.
   - Step buttons in `CanvasDock.jsx`:
     - Zoom In (`+`): `onZoom(0.1)`
     - Zoom Out (`−`): `onZoom(-0.1)`
     - Indicator: `{Math.round(zoom * 100)}%`
     - Auto-fit (`⛶ Fit`): calls `fitView()` in `App.jsx:426-439`:
       ```javascript
       const nextZoom = Math.max(0.6, Math.min(1, (el.clientWidth - 2) / layout.W));
       setZoom(nextZoom);
       ```
3. **Existing Touch Support Gap**:
   - `grep_search` across `src/` for `touch` yielded **only 1 result**: `src/styles/tree.css:19: touch-action: pan-x pan-y;`.
   - **Zero touch listeners** exist in `Canvas.jsx` or any other React component.
   - There is no pinch-to-zoom handling; two-finger pinch on mobile currently either attempts native page zoom or is blocked, failing R3.

4. **Baseline Verification**:
   - Existing E2E test suite (`node --test tests/e2e-navigation.test.mjs`) passes 109/109 tests (0 failures).

---

## 2. Logic Chain

### 2.1 Why the Sizer/Stage Architecture Dictates Midpoint Focal Zoom
- **Observation**: `.stage` uses CSS `transform: scale(${zoom})` with `transform-origin: 0 0`, and `.sizer` has `width: layout.W * zoom, height: layout.H * zoom`.
- **Reasoning**: If `zoom` changes from $Z_{old}$ to $Z_{new}$ without updating `scrollLeft` and `scrollTop`, the visual origin remains pinned to $(0, 0)$ (the top-left corner). On a mobile screen, the user pinches around their two fingers' midpoint $(V_x, V_y)$. If the scroll position is not compensated, the tree jumps away from the fingers, causing severe visual disorientation.
- **Mathematical Deduction**: To keep the stage coordinate under the pinch midpoint fixed in viewport coordinates during scale change:
  $$P_{stage\_x} = \frac{V_x + SL_{old}}{Z_{old}} = \frac{V_x + SL_{new}}{Z_{new}}$$
  Solving for $SL_{new}$:
  $$SL_{new} = (SL_{old} + V_x) \cdot \frac{Z_{new}}{Z_{old}} - V_x$$
  $$ST_{new} = (ST_{old} + V_y) \cdot \frac{Z_{new}}{Z_{old}} - V_y$$
  Furthermore, if the user moves both fingers together while pinching (simultaneous pinch + pan), the midpoint shifts from $V_{old}$ to $V_{curr}$. The complete 2D transformation formula is:
  $$SL_{new} = (SL_{old} + V_{old\_x}) \cdot \frac{Z_{new}}{Z_{old}} - V_{curr\_x}$$
  $$ST_{new} = (ST_{old} + V_{old\_y}) \cdot \frac{Z_{new}}{Z_{old}} - V_{curr\_y}$$
  This simultaneously handles pinch scaling and 2-finger translation in a single continuous transform without jitter.

### 2.2 Why Passive Touch Listeners Cannot Be Used For Pinch
- **Observation**: By default, modern mobile browsers (iOS Safari and Android Chrome) register touch event listeners as `passive: true`. In passive listeners, `e.preventDefault()` throws a console warning and has no effect.
- **Reasoning**: If two fingers touch the screen and pinch, unless `e.preventDefault()` is called on `touchmove`, mobile Safari and Chrome will trigger the native full-page viewport zoom (zooming the URL bar, text, and overall webpage instead of the tree canvas).
- **Deduction**: The touch event listener on `.treewrap` must be attached via `addEventListener('touchmove', handleTouchMove, { passive: false })`. When `e.touches.length === 2`, `e.preventDefault()` must be called to intercept native page zooming.

### 2.3 Guaranteeing Zero Interference with Single-Finger Pan and Card Clicks
- **Observation**: Single-finger pan works smoothly today via native browser scrolling on `.treewrap` (`overflow: auto`, `touch-action: pan-x pan-y`).
- **Reasoning**:
  1. **Single-finger pan**: When `e.touches.length === 1`, the touch handler must do **nothing** and must **not** call `e.preventDefault()`. This preserves 100% of the browser's hardware-accelerated momentum/inertial scrolling for 1-finger navigation.
  2. **Card click protection**: When a user pinches, fingers land on cards (`<div className="card">`). When lifting fingers, the browser fires `touchend` and synthetic `click`. In `Canvas.jsx:309`, click checks `if (!panRef.current.hasDragged)`. We must introduce `pinchRef.current.hasPinched` flag, set to `true` whenever a 2-finger gesture occurs, and cleared with a 120ms debounce after touches end. The card click handler will check `if (!panRef.current.hasDragged && !pinchRef.current.hasPinched)`, preventing accidental card opens.

### 2.4 Rendering Performance & 60fps Animation Frame Batching
- **Observation**: `touchmove` events fire up to 120 times/second on ProMotion / high-refresh mobile screens.
- **Reasoning**: Calling React's `setZoom` on every raw `touchmove` causes rapid React component re-renders.
- **Deduction**: Pinch calculations should cache the latest touch distance and midpoint in a mutable ref (`pinchRef.current`), scheduling DOM and state updates inside `requestAnimationFrame`. This guarantees 60fps/120fps synchronization, eliminates layout thrashing, and prevents input stutter.

### 2.5 Hybrid Full-Screen Architecture (R2)
- **Observation**: On mobile Safari (iOS), `element.requestFullscreen()` is unsupported on generic `<div>` elements (only supported on iPadOS / macOS or `<video>` elements).
- **Reasoning**: Relying solely on the HTML5 Fullscreen API will fail on iPhone mobile users.
- **Deduction**: Full-screen mode must be implemented as a **CSS Fixed-Viewport overlay mode** on `.treewrap-host` (or `.page`), augmented by the HTML5 Fullscreen API where available:
  - When active: `.treewrap-host.is-fullscreen` takes `position: fixed; inset: 0; width: 100vw; width: 100dvw; height: 100vh; height: 100dvh; z-index: 800;`.
  - `.treewrap` inside expands to `height: 100%; min-height: 100%; margin: 0; border: none;`.
  - `z-index: 800` ensures it sits above the top nav (`z-index: 100`) and bottom nav (`z-index: 95`), but **strictly below** `.overlay` modal sheets (`z-index: 999`), settings (`z-index: 1000`), and toasts (`z-index: 2000`). This ensures that card details sheets (`Sheet.jsx`) continue to display properly in full-screen mode!
  - Full-screen toggle button should be placed in `CanvasDock.jsx` (already the canvas controls hub) and/or as a dedicated floating control in `.treewrap-host` header, with keyboard `Escape` key listener for accessibility.

---

## 3. Caveats

1. **iOS Dynamic Viewport Units (`100dvh` vs `100vh`)**: On iOS Safari, the browser address bar shrinks/expands dynamically. Full-screen CSS must use `height: 100dvh; height: 100vh;` with fallback, ensuring no bottom clipping behind the mobile home indicator.
2. **Device Orientation Change & Resize**: When the user rotates their mobile device (portrait ↔ landscape), the available width and height change dramatically. Adding a `ResizeObserver` on `containerRef.current` ensures that auto-fit calculations or viewport bounds adjustments run smoothly.
3. **Transition from 2 Fingers to 1 Finger**: If a user pinches with 2 fingers and lifts 1 finger while the remaining finger continues dragging, the touch handler must reset the drag reference position to prevent a sudden spatial scroll jump.
4. **Desktop Trackpad Pinch**: Some modern laptop trackpads emit synthetic `wheel` events with `e.ctrlKey === true` during pinch gestures. While R3 focuses on mobile touch devices, supporting trackpad wheel pinch is a low-effort bonus enhancement.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Component Responsibility & Touch Event Lifecycle

```
User Touch Interaction on .treewrap
│
├── e.touches.length === 1 (Single-finger drag)
│   ├── Do NOT preventDefault()
│   ├── Native browser overflow scroll takes over
│   └── Debounced onScroll persists pan coordinates to localStorage["gupta_canvas_pan"]
│
├── e.touches.length === 2 (Pinch-to-zoom gesture)
│   ├── Call e.preventDefault() ({ passive: false })
│   ├── On touchstart (2 fingers):
│   │   ├── Record D0 = Euclidean distance between touch 1 and 2
│   │   ├── Record Z0 = current zoom
│   │   ├── Record M0 = midpoint client (x, y)
│   │   ├── Compute Pstage = stage coordinate under M0
│   │   └── Set pinchRef.current.hasPinched = true
│   │
│   ├── On touchmove (2 fingers):
│   │   ├── Calculate Dcurr, ratio r = Dcurr / D0
│   │   ├── Znext = clamp(Z0 * r, 0.4, 1.4)
│   │   ├── Calculate new midpoint Mcurr
│   │   ├── Schedule requestAnimationFrame:
│   │   │   ├── setZoom(Znext)
│   │   │   └── el.scrollLeft = Pstage_x * Znext - (Mcurr_x - rect.left)
│   │   │   └── el.scrollTop = Pstage_y * Znext - (Mcurr_y - rect.top)
│   │
│   └── On touchend / touchcancel:
│       ├── If e.touches.length < 2:
│       │   ├── Save final zoom: saveCanvasZoom(Znext)
│       │   ├── Save final pan: saveCanvasPan({ scrollLeft, scrollTop })
│       │   └── Keep hasPinched = true for 120ms to suppress accidental card click
```

### 4.2 Proposed Implementation Code: `Canvas.jsx`
Below is the concrete implementation block to be integrated into `src/components/Canvas.jsx`:

```jsx
// --- Pinch-to-Zoom & Touch Handler Ref ---
const pinchRef = useRef({
  isPinching: false,
  hasPinched: false,
  startDistance: 0,
  startZoom: 1,
  startScroll: { left: 0, top: 0 },
  startMidpoint: { x: 0, y: 0 },
  stagePoint: { x: 0, y: 0 },
  rafId: null
});

useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const getDistance = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getMidpoint = (t1, t2) => ({
    clientX: (t1.clientX + t2.clientX) / 2,
    clientY: (t1.clientY + t2.clientY) / 2
  });

  const handleTouchStart = e => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = getDistance(t1, t2);
      const mid = getMidpoint(t1, t2);
      const rect = container.getBoundingClientRect();

      const viewportX = mid.clientX - rect.left;
      const viewportY = mid.clientY - rect.top;

      // Coordinate on the unscaled stage directly beneath the pinch midpoint
      const stageX = (viewportX + container.scrollLeft) / zoom;
      const stageY = (viewportY + container.scrollTop) / zoom;

      pinchRef.current = {
        isPinching: true,
        hasPinched: true,
        startDistance: dist,
        startZoom: zoom,
        startScroll: { left: container.scrollLeft, top: container.scrollTop },
        startMidpoint: mid,
        stagePoint: { x: stageX, y: stageY },
        rafId: null
      };

      // Cancel any pending mouse pan
      panRef.current.active = false;
      container.classList.remove('is-panning');
    }
  };

  const handleTouchMove = e => {
    if (e.touches.length === 2 && pinchRef.current.isPinching) {
      e.preventDefault(); // Prevent native mobile full-page zoom

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = getDistance(t1, t2);
      const currentMid = getMidpoint(t1, t2);

      if (pinchRef.current.rafId) {
        cancelAnimationFrame(pinchRef.current.rafId);
      }

      pinchRef.current.rafId = requestAnimationFrame(() => {
        const { startDistance, startZoom, stagePoint } = pinchRef.current;
        if (!startDistance) return;

        const scaleRatio = currentDist / startDistance;
        const targetZoom = startZoom * scaleRatio;
        // Clamp to allowed range (0.4 to 1.4)
        const nextZoom = Math.max(0.4, Math.min(1.4, +targetZoom.toFixed(2)));

        const rect = container.getBoundingClientRect();
        const currentViewportX = currentMid.clientX - rect.left;
        const currentViewportY = currentMid.clientY - rect.top;

        // Keep stagePoint anchored under current midpoint
        const nextScrollLeft = Math.max(0, stagePoint.x * nextZoom - currentViewportX);
        const nextScrollTop = Math.max(0, stagePoint.y * nextZoom - currentViewportY);

        setZoom(nextZoom);
        container.scrollLeft = nextScrollLeft;
        container.scrollTop = nextScrollTop;
      });
    }
  };

  const handleTouchEnd = e => {
    if (pinchRef.current.isPinching && e.touches.length < 2) {
      pinchRef.current.isPinching = false;
      if (pinchRef.current.rafId) {
        cancelAnimationFrame(pinchRef.current.rafId);
      }
      // Persist final zoom and pan coordinates
      saveCanvasZoom(zoom);
      saveCanvasPan({
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop
      });

      // Maintain hasPinched for 120ms to prevent synthetic card click
      setTimeout(() => {
        pinchRef.current.hasPinched = false;
      }, 120);
    }
  };

  // Must be non-passive to allow e.preventDefault() during 2-finger gesture
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
    container.removeEventListener('touchcancel', handleTouchEnd);
  };
}, [zoom, setZoom]);
```

Card click suppression in `Canvas.jsx:309`:
```jsx
onClick={() => {
  if (!panRef.current.hasDragged && !pinchRef.current.hasPinched) {
    onCardClick(person.id);
  }
}}
```

### 4.3 Proposed Full-Screen Mode Implementation Strategy (R2)
1. **State Management**:
   Add `isFullscreen` state in `App.jsx` or in `Canvas.jsx` (`const [isFullscreen, setIsFullscreen] = useState(false);`).
   Because full-screen view mode specifically maximizes screen real estate for exploring the family tree (as specified in R2), hosting `isFullscreen` in `Canvas.jsx` (or passing it from `App.jsx` if breadcrumbs/header need to adapt) is clean and localized.

2. **Full-Screen CSS Styling in `src/styles/tree.css`**:
   ```css
   /* Full-Screen Mode for Mobile Family Tree (R2) */
   .treewrap-host.is-fullscreen {
     position: fixed !important;
     inset: 0 !important;
     width: 100vw !important;
     width: 100dvw !important;
     height: 100vh !important;
     height: 100dvh !important;
     z-index: 800 !important;
     background: var(--surface) !important;
     margin: 0 !important;
     padding: 0 !important;
   }

   .treewrap-host.is-fullscreen .treewrap {
     height: 100% !important;
     min-height: 100% !important;
     margin: 0 !important;
     border: none !important;
     border-radius: 0 !important;
   }

   .fullscreen-exit-btn {
     position: absolute;
     top: 14px;
     right: 14px;
     z-index: 850;
     height: 38px;
     padding: 0 14px;
     background: var(--surface);
     color: var(--ink);
     border: 1px solid var(--ink);
     border-radius: 999px;
     font-family: inherit;
     font-size: 13px;
     font-weight: 700;
     box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
     cursor: pointer;
     display: inline-flex;
     align-items: center;
     gap: 6px;
   }

   .fullscreen-exit-btn:hover,
   .fullscreen-exit-btn:focus-visible {
     background: var(--bg);
     color: var(--accent);
     border-color: var(--accent);
   }
   ```

3. **Dedicated Full-Screen Toggle Controls**:
   - In `CanvasDock.jsx`: Add a dedicated Full-Screen toggle button in `dock-controls-tray`:
     ```jsx
     <button
       type="button"
       className="dock-btn text"
       tabIndex={isExpanded ? 0 : -1}
       aria-label={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
       title={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
       onClick={onToggleFullscreen}
     >
       {isFullscreen ? `⤡ ${t('fullscreenExitShort')}` : `⤢ ${t('fullscreenEnterShort')}`}
     </button>
     ```
   - In `Canvas.jsx`: When `isFullscreen === true`, render `<button className="fullscreen-exit-btn" onClick={toggleFullscreen}>✕ {t('exitFullscreen')}</button>`.
   - Keyboard listener: Listen for `Escape` key on `window` to cleanly exit full-screen mode.
   - Native Fullscreen API integration:
     ```javascript
     const toggleFullscreen = () => {
       const hostEl = hostRef.current;
       if (!isFullscreen) {
         setIsFullscreen(true);
         if (hostEl?.requestFullscreen && document.fullscreenEnabled) {
           hostEl.requestFullscreen().catch(() => {});
         }
       } else {
         setIsFullscreen(false);
         if (document.fullscreenElement && document.exitFullscreen) {
           document.exitFullscreen().catch(() => {});
         }
       }
     };
     ```

4. **Bilingual Strings to Add in `src/i18n/en.js` & `src/i18n/hi.js`**:
   - English (`src/i18n/en.js`):
     ```javascript
     fullscreenEnter: "Enter full-screen mode",
     fullscreenExit: "Exit full-screen mode",
     fullscreenEnterShort: "Full",
     fullscreenExitShort: "Exit",
     ```
   - Hindi (`src/i18n/hi.js`):
     ```javascript
     fullscreenEnter: "पूर्ण स्क्रीन मोड चालू करें",
     fullscreenExit: "पूर्ण स्क्रीन से बाहर निकलें",
     fullscreenEnterShort: "पूर्ण",
     fullscreenExitShort: "बंद",
     ```

---

## 5. Verification Method

### 5.1 Independent Test Commands
1. **Existing Test Suite Baseline**:
   ```bash
   npm test
   ```
   Must pass all 109 tests without regression.

2. **Build Compilation Integrity**:
   ```bash
   npm run build
   ```
   Must compile cleanly with Vite without any bundling or syntax errors.

### 5.2 Verification Scenarios for Implementation Phase
1. **Pinch-to-Zoom (R3)**:
   - Emulate mobile touch device in Chrome DevTools (or real iOS/Android device).
   - Pinch inward with 2 fingers: verify `zoom` decreases smoothly down to `0.4`, centered on touch midpoint.
   - Spread outward with 2 fingers: verify `zoom` increases smoothly up to `1.4`, centered on touch midpoint.
   - Single-finger drag: verify tree pans with native inertia and does not trigger zoom.
   - Tap on card during or immediately following pinch: verify details modal is NOT accidentally triggered.
2. **Full-Screen Mode (R2)**:
   - Tap Full-Screen toggle button on mobile viewport.
   - Verify tree expands to 100% of viewport width and height (`100dvw` / `100dvh`), covering the navigation bar and footer.
   - Verify CanvasDock and exit button remain accessible.
   - Tap exit button or press `Escape`: verify clean restoration of previous layout, scroll position, and zoom level.
   - In full-screen mode, click a member card: verify person details sheet opens above the tree (`z-index: 999` > `z-index: 800`).

### 5.3 Invalidation Conditions
- Any degradation in single-finger touch pan fluidity.
- Accidental card click opening during pinch-to-zoom gestures.
- Fullscreen mode hiding person details sheet or settings modal.
- Zoom exceeding minimum (0.4) or maximum (1.4) bounds.
- Breakage of any of the 109 existing navigation E2E tests.
