# Handoff Report: Explorer M2-1 (Component State & Controls)

## 1. Observation

### 1.1 Existing Component Structure & State
- **File**: `src/components/Canvas.jsx`
  - Lines 8-25: Currently accepts props: `treeState`, `familyIndex`, `layout`, `cardHeight`, `zoom`, `setZoom`, `fitView`, `searchQuery`, `searchMatches`, `viewer`, `lang`, `t`, `displayName`, `onCardClick`, `onZoom`, `onResetViewer`. It does NOT accept `isFullscreen` or `onToggleFullscreen`.
  - Line 199: Root element is `<div className="treewrap-host">` without any dynamic conditional class.
  - Line 201: Native scrolling container `<div ref={containerRef} className="treewrap" tabIndex={0} role="region" ...>`.
  - Lines 320-330: Mounts `<CanvasDock>` without passing full-screen state or toggle callbacks.
- **File**: `src/components/CanvasDock.jsx`
  - Lines 3-13: Accepts props: `zoom`, `onZoomIn`, `onZoomOut`, `onFit`, `onPan`, `viewerName`, `onReset`, `t`, `lang`.
  - Lines 28-121: Contains `.dock-controls-tray` with buttons for reset/mode, pan directional controls, zoom out, zoom display, zoom in, and fit (`⛶ {t('fit')}`). No full-screen toggle button exists.
- **File**: `src/App.jsx`
  - Lines 1026-1043: Renders `<Canvas>` without `isFullscreen` or `onToggleFullscreen` props.
  - Lines 1083-1128: Renders modal overlays: `<Sheet>` (line 1084), `<AddModal>` (line 1109), `<HelpModal>` (line 1123).
  - Lines 1175-1184: Renders `<MobileBottomNav>`.
- **File**: `src/styles/tree.css`
  - Lines 3-20: `.treewrap` has `height: calc(100vh - 210px); min-height: 540px; margin-block: 16px;`.
  - No `.treewrap-host.is-fullscreen` or `.is-fullscreen` rules exist in the stylesheet.
- **File**: `src/styles/components.css`
  - Line 324: `.settings-popover` declares `z-index: 1000;`.
  - Line 401: `.overlay` (sheet/modal backdrop) declares `z-index: 999;`.
- **File**: `src/i18n/en.js` & `src/i18n/hi.js`
  - Search for `fullscreenEnter` returns 0 results in both files.

### 1.2 Test Failures on Master Test Suite
Executing `node --test tests/*.test.mjs` yields 206 passing tests and 4 failing tests in `tests/e2e-mobile-ux.test.mjs`:
1. `T1-R2-01: Full-Screen mode toggle enters .is-fullscreen on root container`
   `AssertionError [ERR_ASSERTION]: Canvas container must include "is-fullscreen" class when isFullscreen prop is true`
2. `T1-R2-03: Full-screen sizing: .treewrap-host.is-fullscreen occupies full viewport dimensions in CSS`
   `AssertionError [ERR_ASSERTION]: Stylesheet must define .is-fullscreen rule`
3. `T1-R2-07: Bilingual translation key parity for full-screen mode in en.js and hi.js`
   `AssertionError [ERR_ASSERTION]: en.js must define key "fullscreenEnter"`
4. `T3-PAIR-06 [R2 + Bilingual]: Fullscreen toggle button displays correct bilingual labels in English and Hindi`
   `AssertionError [ERR_ASSERTION]: Expected "actual" to be strictly unequal to: 'fullscreenEnter'`

---

## 2. Logic Chain

1. **State Placement (Canvas vs App)**:
   - `PROJECT.md § Milestones / Boundaries` explicitly assigns `Canvas.jsx` to M2 and does NOT list `App.jsx` under M2 ownership.
   - `tests/e2e-mobile-ux.test.mjs` test `T1-R2-01` renders `Canvas` directly with `{ isFullscreen: true }`.
   - By implementing a dual controlled/uncontrolled state pattern in `Canvas.jsx`:
     ```javascript
     const [internalFullscreen, setInternalFullscreen] = useState(false);
     const isFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : internalFullscreen;
     ```
     `Canvas.jsx` can operate fully self-contained in production (when mounted by `App.jsx` without extra props), while seamlessly conforming to tests that pass `isFullscreen` as a prop.
   - Root element conditionally receives the class: `<div ref={hostRef} className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}>`.

2. **Toggle Controls**:
   - In `CanvasDock.jsx`: Adding `<button type="button" className="dock-btn text dock-fullscreen-btn" tabIndex={isExpanded ? 0 : -1} onClick={onToggleFullscreen} ...>` inside `.dock-controls-tray` satisfies `T1-R2-05` (`htmlDock.includes('fullscreen') || htmlDock.includes('Full') || htmlDock.includes('dock-btn')`).
   - In `Canvas.jsx`: A floating `<button type="button" className="canvas-fullscreen-toggle" ...>` mounted directly inside `.treewrap-host` ensures instant one-tap access on mobile devices without requiring the user to expand the collapsible dock first.
   - Keyboard listener: When `isFullscreen` is active, a `window.addEventListener('keydown', handleKeyDown)` captures `e.key === 'Escape'`. If no modal backdrop is active (`!document.querySelector('.overlay, .settings-popover')`), it cleanly exits full-screen mode, satisfying `T1-R2-04`.

3. **Native HTML5 Fullscreen API Progressive Enhancement**:
   - On iOS Safari, `element.requestFullscreen()` is unsupported on non-video elements.
   - Calling `setIsFullscreen(next)` first guarantees that the CSS fixed viewport overlay (`position: fixed; inset: 0; z-index: 800; width: 100dvw; height: 100dvh;`) immediately activates across 100% of mobile and desktop browsers.
   - The method then attempts `hostRef.current?.requestFullscreen?.()` or `document.documentElement?.requestFullscreen?.()` inside a `try/catch` block. If rejected or unsupported, the error is safely swallowed and the CSS fallback remains active (satisfying `T2-R2-02`).
   - Adding document listeners for `fullscreenchange` and `webkitfullscreenchange` synchronizes the React state to `false` when the user exits browser fullscreen via hardware gesture, browser chrome button, or Escape key (satisfying `T2-R2-03`).

4. **Coordinate & State Preservation**:
   - `Canvas.jsx` does not unmount when entering or exiting full-screen mode; the same `.treewrap` DOM node persists.
   - To prevent scroll jumping or zeroing when dimensions resize from `calc(100vh - 210px)` to `100dvh`, the current `scrollLeft` and `scrollTop` are captured in a ref and restored in `requestAnimationFrame`, followed by calling `saveCanvasPan()` to keep `localStorage` (`gupta_canvas_pan`) in sync (satisfying `T2-R2-04`).
   - `viewer` perspective is unchanged because `Canvas` receives `viewer` as a prop from `App.jsx`, satisfying `T2-R2-06`.

5. **Z-Index Hierarchy**:
   - `.treewrap-host.is-fullscreen` with `z-index: 800` renders above `.site-nav` (`z-index: 100`) and `.mobile-bottom-nav` (`z-index: 95`), cleanly occluding distracting bars in full-screen mode.
   - Modals and slide-out sheets (`.overlay` with `z-index: 999`) and `.settings-popover` (`z-index: 1000`) sit strictly above the full-screen canvas (satisfying `T1-R2-06` and `T3-PAIR-07`).

---

## 3. Caveats

- **No Caveats on Implementation Paths**: The design strictly adheres to the M2 boundary contract without leaking changes into M1 (`Navbar.jsx`) or M3 (`Canvas.jsx` touch listeners).
- **iOS Safari Status Bar**: In CSS fixed overlay mode on iOS Safari, `height: 100dvh` and `env(safe-area-inset-top)` prevent clipping under dynamic browser chrome.
- **Controlled Prop Precedence**: If a parent component or test passes `isFullscreen: true`, the prop takes precedence over local state. In production with `App.jsx`, the prop is undefined, so internal state operates smoothly.

---

## 4. Conclusion & Actionable Blueprint for Worker M2

### 4.1 Changes in `src/components/Canvas.jsx`
1. **Props**: Add `isFullscreen: isFullscreenProp`, `onToggleFullscreen: onToggleFullscreenProp`.
2. **State & Ref**:
   ```javascript
   const [internalFullscreen, setInternalFullscreen] = useState(false);
   const isFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : internalFullscreen;
   const hostRef = useRef(null);
   const prevFullscreenRef = useRef(isFullscreen);
   ```
3. **Toggle Handler with Progressive Enhancement**:
   ```javascript
   const handleToggleFullscreen = useCallback(async () => {
     const next = !isFullscreen;
     if (isFullscreenProp === undefined) {
       setInternalFullscreen(next);
     }
     onToggleFullscreenProp?.(next);

     if (next) {
       try {
         const el = hostRef.current;
         if (el?.requestFullscreen) {
           await el.requestFullscreen();
         } else if (document.documentElement?.requestFullscreen) {
           await document.documentElement.requestFullscreen();
         }
       } catch {
         // Progressive enhancement fallback to CSS overlay
       }
     } else {
       try {
         if (document.fullscreenElement && document.exitFullscreen) {
           await document.exitFullscreen();
         }
       } catch {
         // Progressive enhancement fallback to CSS
       }
     }
   }, [isFullscreen, isFullscreenProp, onToggleFullscreenProp]);
   ```
4. **Listeners**:
   - `fullscreenchange`:
     ```javascript
     useEffect(() => {
       const onFullscreenChange = () => {
         const isDocFullscreen = Boolean(document.fullscreenElement);
         if (!isDocFullscreen && isFullscreen) {
           if (isFullscreenProp === undefined) {
             setInternalFullscreen(false);
           }
           onToggleFullscreenProp?.(false);
         }
       };
       document.addEventListener('fullscreenchange', onFullscreenChange);
       document.addEventListener('webkitfullscreenchange', onFullscreenChange);
       return () => {
         document.removeEventListener('fullscreenchange', onFullscreenChange);
         document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
       };
     }, [isFullscreen, isFullscreenProp, onToggleFullscreenProp]);
     ```
   - `Escape` key handler:
     ```javascript
     useEffect(() => {
       if (!isFullscreen) return;
       const handleKeyDown = (e) => {
         if (e.key === 'Escape') {
           const hasOpenModal = document.querySelector('.overlay, .settings-popover');
           if (hasOpenModal) return;
           e.preventDefault();
           handleToggleFullscreen();
         }
       };
       window.addEventListener('keydown', handleKeyDown);
       return () => window.removeEventListener('keydown', handleKeyDown);
     }, [isFullscreen, handleToggleFullscreen]);
     ```
   - Coordinate preservation effect:
     ```javascript
     useEffect(() => {
       if (prevFullscreenRef.current !== isFullscreen) {
         prevFullscreenRef.current = isFullscreen;
         const el = containerRef.current;
         if (el) {
           const sl = el.scrollLeft;
           const st = el.scrollTop;
           requestAnimationFrame(() => {
             if (containerRef.current) {
               containerRef.current.scrollLeft = sl;
               containerRef.current.scrollTop = st;
               saveCanvasPan({ scrollLeft: sl, scrollTop: st });
             }
           });
         }
       }
     }, [isFullscreen]);
     ```
5. **Render Root & Floating Button**:
   ```jsx
   return (
     <div ref={hostRef} className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}>
       <div ref={containerRef} className="treewrap" ...>
         ...
       </div>
       <button
         type="button"
         className="canvas-fullscreen-toggle"
         aria-label={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
         title={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
         onClick={handleToggleFullscreen}
       >
         <span aria-hidden="true">{isFullscreen ? '✕' : '⛶'}</span>
         <span>{isFullscreen ? t('fullscreenExitShort') : t('fullscreenEnterShort')}</span>
       </button>
       <CanvasDock
         zoom={zoom}
         onZoomIn={() => onZoom(0.1)}
         onZoomOut={() => onZoom(-0.1)}
         onFit={fitView}
         onPan={handlePanBy}
         viewerName={viewer ? displayName(viewer) : ""}
         onReset={onResetViewer}
         isFullscreen={isFullscreen}
         onToggleFullscreen={handleToggleFullscreen}
         t={t}
         lang={lang}
       />
     </div>
   );
   ```

### 4.2 Changes in `src/components/CanvasDock.jsx`
1. Accept `isFullscreen` and `onToggleFullscreen` props.
2. Inside `.dock-controls-tray`, add dedicated button:
   ```jsx
   <button
     type="button"
     className="dock-btn text dock-fullscreen-btn"
     tabIndex={isExpanded ? 0 : -1}
     aria-label={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
     title={
       isFullscreen
         ? (isHi ? 'पूर्ण-स्क्रीन से बाहर निकलें' : 'Exit Full-Screen')
         : (isHi ? 'पूर्ण-स्क्रीन दृश्य' : 'Full-Screen View')
     }
     onClick={onToggleFullscreen}
   >
     {isFullscreen
       ? `✕ ${t('fullscreenExitShort') || 'Exit'}`
       : `⛶ ${t('fullscreenEnterShort') || 'Full'}`}
   </button>
   ```

### 4.3 Changes in `src/styles/tree.css`
Add full-screen fixed overlay rules and floating button styling:
```css
/* Full-Screen Family Tree View Mode */
.treewrap-host.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 800;
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  background: var(--surface);
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.treewrap-host.is-fullscreen .treewrap {
  width: 100%;
  height: 100% !important;
  min-height: 100% !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  flex: 1;
}

/* Floating Fullscreen Toggle Button */
.canvas-fullscreen-toggle {
  position: absolute;
  top: max(14px, env(safe-area-inset-top, 14px));
  right: 14px;
  z-index: 25;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--ink);
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.canvas-fullscreen-toggle:hover {
  background: var(--accent-light, #f5f3ef);
  transform: translateY(-1px);
}

.canvas-fullscreen-toggle:active {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .canvas-fullscreen-toggle {
    transition: none;
  }
}
```

### 4.4 Changes in `src/i18n/en.js` & `src/i18n/hi.js`
- In `src/i18n/en.js`:
  ```javascript
  fullscreenEnter: "Full-screen mode",
  fullscreenExit: "Exit full-screen",
  fullscreenEnterShort: "Full-screen",
  fullscreenExitShort: "Exit",
  ```
- In `src/i18n/hi.js`:
  ```javascript
  fullscreenEnter: "पूर्ण-स्क्रीन दृश्य",
  fullscreenExit: "पूर्ण-स्क्रीन से बाहर निकलें",
  fullscreenEnterShort: "पूर्ण-स्क्रीन",
  fullscreenExitShort: "बाहर निकलें",
  ```

---

## 5. Verification Method

1. **Unit & E2E Test Execution**:
   Run the master test suite:
   ```powershell
   node --test tests/*.test.mjs
   ```
   **Expected Outcome**: 210/210 passing tests (100% pass rate). All 4 failing tests (`T1-R2-01`, `T1-R2-03`, `T1-R2-07`, `T3-PAIR-06`) will pass immediately.

2. **DOM & CSS Class Verification**:
   - Inspect that `.treewrap-host` contains `.is-fullscreen` when full-screen is activated.
   - Inspect that `tree.css` contains `.treewrap-host.is-fullscreen` with `position: fixed`, `inset: 0`, and dynamic viewport units (`100dvh`, `100dvw`).

3. **Key Parity Verification**:
   - Inspect that keys `fullscreenEnter`, `fullscreenExit`, `fullscreenEnterShort`, `fullscreenExitShort` exist in both `src/i18n/en.js` and `src/i18n/hi.js` with non-empty string values.

4. **Invalidation Conditions**:
   - If `App.jsx` requires manual passing of `isFullscreen`, internal state won't be self-contained.
   - If `saveCanvasPan` is not invoked on full-screen exit, scroll position could drift on mobile devices upon orientation change.
