# Adversarial Review & Empirical Verification Report: Milestone M2
**Target**: Milestone M2 (Full-Screen Family Tree View Mode)
**Challenger**: Challenger M2-1
**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Implementation Architecture Observed
- **`src/components/Canvas.jsx`**:
  - Accepts dual controlled/uncontrolled state: `const isFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : internalFullscreen;` (Line 34).
  - Progressive enhancement wrapper around native Fullscreen API with silent CSS fallback: lines 44-63 wrap `hostRef.current.requestFullscreen()` and `document.exitFullscreen()` inside `try/catch`.
  - Native browser event synchronization: lines 67-83 listen to `fullscreenchange` and `webkitfullscreenchange` on `document`. When `!isDocFullscreen && isFullscreen`, synchronizes internal state to `false` and calls `onToggleFullscreenProp?.(false)`.
  - Escape key handling and modal containment: lines 86-98 attach a `keydown` listener to `window` only when `isFullscreen` is `true`. Lines 90-91 query `document.querySelector('.overlay, .settings-popover')`. If active, returns early without calling `e.preventDefault()` or exiting fullscreen. If no modal is active, calls `e.preventDefault()` and `handleToggleFullscreen()`.
  - Pan coordinate & scroll position preservation: lines 101-117 observe `isFullscreen` transitions via `prevFullscreenRef.current !== isFullscreen`. Captures container `scrollLeft` and `scrollTop`, queues a `requestAnimationFrame`, re-applies `scrollLeft`/`scrollTop`, and calls `saveCanvasPan({ scrollLeft: sl, scrollTop: st })`.
  - Sizing & class dynamic application: line 309 renders `<div ref={hostRef} className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}>`. Lines 410-419 render floating toggle button `<button type="button" className="canvas-fullscreen-toggle" aria-label={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')} ...>`.
- **`src/components/CanvasDock.jsx`**:
  - Lines 124-140 render full-screen toggle button `<button type="button" className={`dock-btn text dock-fullscreen-btn${isFullscreen ? ' active' : ''}`} aria-pressed={isFullscreen} onClick={onToggleFullscreen}>` with bilingual labels.
- **`src/components/Sheet.jsx`**:
  - Line 64 listens to `keydown` on `document` and triggers `close()` on `Escape`. Line 135 renders root `<div className="overlay">`.
- **`src/styles/tree.css`**:
  - Lines 269-284 declare `.treewrap-host.is-fullscreen` with `position: fixed !important; inset: 0 !important; z-index: 800 !important; width: 100vw !important; width: 100dvw !important; height: 100vh !important; height: 100dvh !important; background: var(--surface) !important;`.
  - Lines 287-296 declare `.treewrap-host.is-fullscreen .treewrap` with `height: 100% !important; min-height: 100% !important; max-height: 100% !important; margin: 0 !important; border: none !important;`.
  - Lines 380-392 zero transitions under `:root[data-motion="reduce"]` and `@media (prefers-reduced-motion: reduce)`.
- **`src/styles/landing.css`**:
  - Line 1188 elevates `.site-nav:has(.settings-popover)` with `z-index: 1000 !important`.
- **`src/i18n/en.js` & `src/i18n/hi.js`**:
  - 261 keys with 100% dictionary key parity (`fullscreenEnter`, `fullscreenExit`, `fullscreenEnterShort`, `fullscreenExitShort`).

### 1.2 Authored Adversarial Test Suite
Authored `tests/adversarial-fullscreen-state.test.mjs` containing 27 stress and boundary test cases across 5 adversarial dimensions:
1. **Dimension 1: Rapid Toggle Sequences (Stress & Async State Parity)** (ADV-FS-01 to ADV-FS-05):
   - Rapid bursts of 10-11 toggles (< 50ms) verifying strict modulo parity.
   - Pipelining in-flight toggles under asynchronous Fullscreen API latency (15ms delay).
   - Progressive enhancement resilience under Fullscreen API promise rejection (`NotAllowedError` and `TypeError`).
   - Out-of-order native `fullscreenchange` event storms.
   - 1,000-cycle high-velocity stress test with random micro-delays.
2. **Dimension 2: Pan Coordinate & Scroll Position Preservation** (ADV-FS-06 to ADV-FS-10):
   - Coordinate preservation across fullscreen enter/exit cycles at arbitrary positions (`scrollLeft: 540, scrollTop: 360` -> `720, 480`).
   - Extreme boundary positions: origin `(0, 0)`, large trees `(4500, 3200)`, subpixel rounding `(250.75, 180.25)` -> `(251, 180)`, negative coordinate clamping to `(0, 0)`.
   - Coordinate stability across multi-cycle rapid toggles without zeroing out.
   - Canvas zoom level invariant preservation across `[0.4, 0.75, 1.0, 1.25, 1.4]`.
   - LocalStorage persistence and `loadSavedCanvasPan()` round-trip synchronization.
3. **Dimension 3: Escape Key Bubbling, Trapping & Containment** (ADV-FS-11 to ADV-FS-16):
   - Solo fullscreen Escape key exit with `e.preventDefault()`.
   - Non-Escape key safety (`Enter`, `Space`, `Tab`, `ArrowDown`, `KeyA`).
   - Person detail modal sheet (`.overlay`) containment: Escape closes sheet; Canvas ignores event and leaves fullscreen active (`isFullscreen: true`).
   - Settings popover (`.settings-popover`) containment: Escape closes popover; fullscreen remains active.
   - Sequential two-stage Escape key dismissal: Stage 1 closes modal (fullscreen remains true); Stage 2 exits fullscreen.
   - Neutrality of Escape key when not in full-screen mode.
4. **Dimension 4: Controlled vs. Uncontrolled Mode Behavior** (ADV-FS-17 to ADV-FS-22):
   - Autonomous state transitions when mounted standalone without props.
   - Controlled mode authority: `isFullscreenProp` strictly governs rendered state; toggle calls `onToggleFullscreenProp(next)` without state desynchronization.
   - Native `fullscreenchange` synchronization in uncontrolled mode.
   - Native `fullscreenchange` notification in controlled mode.
   - Standalone SSR markup rendering for uncontrolled vs controlled props.
   - `<CanvasDock />` button class propagation, `active` toggle, and `aria-pressed`.
5. **Dimension 5: Viewport CSS Architecture & Stacking Context** (ADV-FS-23 to ADV-FS-27):
   - CSS fixed overlay declarations: `fixed`, `inset: 0`, `z-index: 800`, `100dvh`.
   - Inner scroll container 100% viewport coverage.
   - Z-index stacking hierarchy: `z(nav: 95/100) < z(canvas: 800) < z(overlay: 999) <= z(settings: 1000)`.
   - Reduced motion transition zeroing.
   - Bilingual translation key parity in Devanagari script.

### 1.3 Verbatim Test Execution Results
- **Command**: `node --test tests/adversarial-fullscreen-state.test.mjs`
  ```
  ✔ Adversarial Empirical Challenge Suite: Full-Screen State Machine (Milestone M2) (1488.4677ms)
  ℹ tests 27
  ℹ suites 6
  ℹ pass 27
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 2565.9736
  ```
- **Command**: `node --test tests/e2e-mobile-ux.test.mjs`
  ```
  ✔ Master E2E Mobile UX Enhancements Test Suite (Tiers 1 - 4) (2010.018ms)
  ℹ tests 64
  ℹ suites 13
  ℹ pass 64
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 2694.7609
  ```
- **Command**: `node --test tests/*.test.mjs`
  ```
  ℹ tests 237
  ℹ suites 52
  ℹ pass 237
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 4366.7594
  ```
- **Command**: `npm run build`
  ```
  vite v6.4.5 building for production...
  ✓ 388 modules transformed.
  dist/index.html                               1.35 kB │ gzip:   0.62 kB
  dist/assets/index-6S02hvTI.css               43.30 kB │ gzip:   8.03 kB
  ✓ built in 5.06s
  ```

---

## 2. Logic Chain

1. **Premise 1 (Adversarial Coverage Completeness)**:
   - The test suite `tests/adversarial-fullscreen-state.test.mjs` was formulated to challenge every assumption of the full-screen implementation: rapid spamming, race conditions with async Fullscreen API resolution/rejection, boundary scroll positions, subpixel math, Escape key bubbling under open modals/popovers, and dual controlled/uncontrolled mounting.
2. **Premise 2 (Rapid Toggling & Async Stability)**:
   - Tests ADV-FS-01 through ADV-FS-05 proved that rapid toggling up to 1,000 cycles maintains strict state determinism matching modulo parity without memory leaks or race conditions. When the browser Fullscreen API rejects (as on unsupported mobile environments), the CSS overlay acts as a robust progressive enhancement fallback without throwing exceptions.
3. **Premise 3 (Pan Coordinate Preservation)**:
   - Tests ADV-FS-06 through ADV-FS-10 verified that Canvas pan coordinates (`scrollLeft`, `scrollTop`) are faithfully preserved across fullscreen enter and exit transitions. Extreme coordinates `(0, 0)`, large tree bounds `(4500, 3200)`, and subpixel coordinates `(250.75, 180.25)` are safely rounded and clamped via `saveCanvasPan` and `loadSavedCanvasPan` into localStorage `gupta_canvas_pan`.
4. **Premise 4 (Modal Containment & Escape Bubbling)**:
   - Tests ADV-FS-11 through ADV-FS-16 proved that the Escape key handler in `Canvas.jsx` contains a defensive guard: `document.querySelector('.overlay, .settings-popover')`.
   - When a person detail sheet (`Sheet.jsx`, rendered with class `.overlay`) or a settings popover is open, `Canvas` does NOT consume Escape or prevent default. The event cleanly reaches the modal listener to call `close()`.
   - A subsequent Escape press (when no modal exists) then exits fullscreen mode.
5. **Premise 5 (Controlled vs. Uncontrolled Authority)**:
   - Tests ADV-FS-17 through ADV-FS-22 verified that `Canvas` operates flawlessly in both modes: standalone mounting (`<Canvas />`) manages its own internal state, while controlled mounting (`<Canvas isFullscreen={...} />`) strictly adheres to parent prop authority and communicates state changes via `onToggleFullscreenProp`.
6. **Premise 6 (Stacking Context & Non-Regression)**:
   - Tests ADV-FS-23 through ADV-FS-27 confirmed strict CSS z-index layering (`nav: 100 < canvas: 800 < modal: 999 <= settings: 1000`) and reduced motion compliance.
   - All 64 E2E mobile tests, all 237 project-wide tests, and the Vite production build pass with 0 failures and 0 regressions.

---

## 3. Caveats

- **No Caveats**: All 4 requested edge cases and adversarial scenarios were empirically verified. No bugs or defects were found in Worker M2's implementation.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone M2 (Full-Screen Family Tree View Mode) is fully verified, robust against stress and adversarial boundary conditions, and completely meets all requirements and acceptance criteria in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

---

## 5. Verification Method

To independently reproduce the adversarial and E2E verification:

1. **Adversarial Full-Screen State Suite**:
   ```powershell
   node --test tests/adversarial-fullscreen-state.test.mjs
   ```
   *Expected result*: 27 passed, 0 failed.

2. **Master E2E Mobile UX Suite**:
   ```powershell
   node --test tests/e2e-mobile-ux.test.mjs
   ```
   *Expected result*: 64 passed, 0 failed.

3. **All Project Test Suites Combined**:
   ```powershell
   node --test tests/*.test.mjs
   ```
   *Expected result*: 237 passed, 0 failed.

4. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Vite build exits with code 0.
