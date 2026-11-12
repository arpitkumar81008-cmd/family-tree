# Handoff Report: Worker M1 (Collapsible Mobile Navigation Bar)

**Milestone**: M1 — Collapsible Mobile Navigation Bar  
**Worker**: Worker M1  
**Exclusively Owned Files**:
- `src/components/Navbar.jsx`
- `src/styles/landing.css`

---

## 1. Observation

1. **Initial Test Suite Failures (`tests/e2e-mobile-ux.test.mjs`)**:
   - Prior to implementation, running `node --test tests/e2e-mobile-ux.test.mjs` resulted in:
     ```
     ✖ T1-R1-01: Top bar collapses when scrolling upwards into page content on mobile (4.0387ms)
       AssertionError [ERR_ASSERTION]: Stylesheets must define collapsible state rules for .site-nav (e.g. translateY(-100%))
     ```
   - This failure was caused by the absence of `.site-nav.is-collapsed` and `translateY(-100%)` in `src/styles/landing.css`.

2. **Source Code Modifications**:
   - In `src/styles/landing.css` (lines 4–54):
     - Added base GPU properties: `transform: translateY(0); opacity: 1; transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease; will-change: transform, opacity;`
     - Added collapsible rules: `.site-nav.is-collapsed, :root[data-viewport="mobile"] .site-nav.is-collapsed { transform: translateY(-100%); opacity: 0; pointer-events: none; }`
     - Added focus protection: `.site-nav:focus-within, :root[data-viewport="mobile"] .site-nav:focus-within { transform: translateY(0) !important; opacity: 1 !important; pointer-events: auto !important; }`
     - Added laptop override: `:root[data-viewport="laptop"] .site-nav.is-collapsed { transform: translateY(0) !important; opacity: 1 !important; pointer-events: auto !important; }`
     - Added reduced-motion support: `:root[data-motion="reduce"] .site-nav { transition: none !important; }` and `@media (prefers-reduced-motion: reduce) { .site-nav { transition: none !important; } }`
     - Preserved mobile simulation lines 1072–1099 (formerly 1034–1061) completely untouched.
   - In `src/components/Navbar.jsx`:
     - Added `useEffect` and `useRef` imports.
     - Added `isCollapsed` state, `lastScrollYRef`, `tickingRef`, `rafIdRef`, `navRef`, `isCollapsedRef`, `isSettingsOpenRef`, `viewportModeRef`.
     - Synchronized refs on each render.
     - Implemented `checkIsMobile()` checking `data-viewport` attributes, `viewportModeRef.current`, and `window.innerWidth <= 768`.
     - Implemented view change, settings open, and viewport change reset effects.
     - Implemented mobile scroll listener with 12px hysteresis deadzone, 10px top boundary guard, settings open guard, focus guard, requestAnimationFrame throttling, and fallback timeout for Node test environments.
     - Bound `ref={navRef}`, `className={...${isCollapsed ? ' is-collapsed' : ''}}`, `aria-hidden={isCollapsed}`, and `onFocus={handleFocus}` to `<nav className="site-nav">`.

3. **Post-Implementation Verification Results**:
   - `node --test tests/e2e-mobile-ux.test.mjs`:
     ```
     ▶ R1: Collapsible Top Navigation Bar on Mobile Viewports
       ✔ T1-R1-01: Top bar collapses when scrolling upwards into page content on mobile (3.3296ms)
       ✔ T1-R1-02: Top bar reveals (removes collapsed state) when scrolling down toward top (0.6136ms)
       ✔ T1-R1-03: Scroll hysteresis deadzone threshold (12px) prevents accidental collapse on micro-scrolls (0.6398ms)
       ✔ T1-R1-04: Top boundary guard: top bar remains permanently visible when scroll position is at/near top (<= 10px) (0.7573ms)
       ✔ T1-R1-05: Settings popover open guard: top bar stays visible when isSettingsOpen is true or focus is within (0.4521ms)
       ✔ T1-R1-06: Interactive elements preservation: top bar controls remain intact and fully functional when visible (798.5212ms)
     ✔ R1: Collapsible Top Navigation Bar on Mobile Viewports (806.3667ms)
     ```
     All 6 tests in R1 pass.
   - Master Navigation Test Suite (`npm test`):
     ```
     ✔ Family Tree Navigation E2E Master Test Suite (Tiers 1 - 4) (2747.6712ms)
     ℹ tests 109
     ℹ suites 21
     ℹ pass 109
     ℹ fail 0
     ```
     All 109 tests pass with zero regressions.
   - Vite Production Build (`npm run build`):
     ```
     ✓ 388 modules transformed.
     ✓ built in 4.96s
     Exit code: 0
     ```

---

## 2. Logic Chain

1. **Root Cause Resolution (Observation 1)**:
   - Test `T1-R1-01` asserted that stylesheets declare `.site-nav.is-collapsed` and `translateY(-100%)`.
   - By adding the dedicated rules in `src/styles/landing.css`, `T1-R1-01` passed immediately (Observation 3).

2. **GPU Compositor Performance & Interaction Budget (Observation 2)**:
   - Rather than mutating `height`, `top`, or `margin-top` which trigger browser reflow, animating `transform: translateY(...)` and `opacity` confines recalculations to the GPU compositor thread.
   - Setting `transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;` satisfies the 300ms mobile interaction budget (`T2-R4-05`) while avoiding layout thrashing (`T1-R4-06`).

3. **Accidental Tap Prevention & Accessibility (Observation 2)**:
   - Setting `pointer-events: none` on `.site-nav.is-collapsed` prevents phantom clicks on hidden links while viewing the tree.
   - Setting `:focus-within` with `!important` guarantees immediate keyboard visibility when tabbing into navigation elements, preventing keyboard accessibility traps.

4. **Micro-Scroll Hysteresis & Edge Guards (Observation 2)**:
   - A 12px deadzone threshold prevents finger jitter or micro-scrolls from causing navbar flutter (`T1-R1-03`, `T2-R1-02`).
   - Checking `currentScrollY <= 10px` ensures that the user can always see the top bar when at the top of the page (`T1-R1-04`, `T2-R1-04`).
   - Guarding against `isSettingsOpen` ensures modal configuration remains accessible (`T1-R1-05`, `T4-SCEN-04`).

5. **Test Invariant Preservation (Observation 2 & 3)**:
   - Existing tests `T2-F6-02` and `T2-F6-04` perform literal string searches for `:root[data-viewport="mobile"] .site-nav` and regex checks for `height: auto` and `flex-wrap: wrap`.
   - By appending the new rules at lines 19–54 directly below the base `.site-nav` block and leaving the responsive block intact, all 109 tests passed cleanly without regressions.

---

## 3. Caveats

- **No Caveats**: All changes strictly conform to exclusive file ownership boundaries (`Navbar.jsx`, `landing.css`). All existing test suites pass. Canvas and i18n files were not modified and are ready for Milestones M2 and M3.

---

## 4. Conclusion

Milestone M1 (Collapsible Mobile Navigation Bar) is 100% complete and fully verified:
- Mobile scroll hysteresis listener with 12px deadzone and 10px boundary guard is fully active.
- Settings popover open guard and keyboard focus-within visibility are working.
- GPU-accelerated CSS transitions with `will-change: transform, opacity;` and `pointer-events: none` on collapse are in place.
- All R1 mobile UX test cases pass.
- All 109 baseline navigation tests pass.
- Production Vite build succeeds with exit code 0.

---

## 5. Verification Method

To independently verify this milestone:

1. **Run the Mobile UX Test Runner**:
   ```powershell
   node --test tests/e2e-mobile-ux.test.mjs
   ```
   **Expected Result**: All 6 tests under `R1: Collapsible Top Navigation Bar on Mobile Viewports` pass cleanly (`T1-R1-01` through `T1-R1-06`).

2. **Run the Master Navigation Test Suite**:
   ```powershell
   npm test
   ```
   **Expected Result**: All 109 tests pass (`pass 109`, `fail 0`).

3. **Run the Production Vite Build**:
   ```powershell
   npm run build
   ```
   **Expected Result**: Exit code 0, bundle generated cleanly in `dist/`.

4. **Invalidation Conditions**:
   - Any failure in `T1-R1-01` through `T1-R1-06`.
   - Any regression in the 109 tests in `npm test`.
   - Removal of `.site-nav.is-collapsed` or `pointer-events: none` from `landing.css`.
