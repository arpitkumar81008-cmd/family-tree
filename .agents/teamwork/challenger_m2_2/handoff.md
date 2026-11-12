# Handoff Report: Challenger M2-2 (Milestone M2 Hierarchy, Viewports & Localization Challenge)

## 1. Observation

### 1.1 Scope & Codebase Direct Inspection
- **Stacking Order Hierarchy in Stylesheets**:
  - `src/styles/components.css:1003`: `.mobile-bottom-nav` declares `z-index: 95;`.
  - `src/styles/landing.css:7`: `.site-nav` declares `z-index: 100;`.
  - `src/styles/tree.css:272`: `.treewrap-host.is-fullscreen` declares `position: fixed !important; inset: 0 !important; z-index: 800 !important;`.
  - `src/styles/components.css:401`: `.overlay` (Person detail modal sheet) declares `position: fixed; inset: 0; z-index: 999;`.
  - `src/styles/components.css:324`: `.settings-popover` declares `z-index: 1000;`.
  - `src/styles/landing.css:1204`: `.site-nav:has(.settings-popover)` declares `z-index: 1000 !important;`.
  - `src/styles/components.css:6`: `.skip-link` declares `z-index: 2000;`.
  - `src/styles/tree.css:303`: `.canvas-fullscreen-toggle` declares `z-index: 25;`.
  - `src/styles/landing.css:667`: `.canvas-dock` declares `z-index: 20;`.
- **Dynamic Viewport Unit Resilience & Fallbacks in `src/styles/tree.css`**:
  - Lines 273-276:
    ```css
    width: 100vw !important;
    width: 100dvw !important;
    height: 100vh !important;
    height: 100dvh !important;
    ```
  - Declaration order strictly places fallback `100vw` before modern `100dvw`, and fallback `100vh` before modern `100dvh`.
  - Lines 287-296: `.treewrap-host.is-fullscreen .treewrap` enforces `height: 100% !important; min-height: 100% !important; max-height: 100% !important; margin: 0 !important; border: none !important;`.
  - `src/styles/landing.css:1195-1200`: `:root[data-viewport="mobile"] .treewrap-host.is-fullscreen .treewrap` also defensively enforces `height: 100% !important;`.
- **Bilingual Full-Screen Controls in `Canvas.jsx` and `CanvasDock.jsx`**:
  - `src/components/Canvas.jsx:410-419`:
    ```jsx
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
    ```
  - `src/components/CanvasDock.jsx:125-140`:
    ```jsx
    <button
      type="button"
      className={`dock-btn text dock-fullscreen-btn${isFullscreen ? ' active' : ''}`}
      tabIndex={isExpanded ? 0 : -1}
      aria-label={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
      aria-pressed={isFullscreen}
      ...
    >
      {isFullscreen
        ? `✕ ${t('fullscreenExitShort') || 'Exit'}`
        : `⛶ ${t('fullscreenEnterShort') || 'Full'}`}
    </button>
    ```
- **Dictionary Key Parity in `src/i18n/en.js` & `src/i18n/hi.js`**:
  - `en.js` total keys: 261.
  - `hi.js` total keys: 261.
  - Symmetric difference: `missingInHi: []`, `missingInEn: []`.
  - M2 translation values:
    - `en.fullscreenEnter`: `"Enter full screen"`
    - `en.fullscreenExit`: `"Exit full screen"`
    - `en.fullscreenEnterShort`: `"Full screen"`
    - `en.fullscreenExitShort`: `"Exit"`
    - `hi.fullscreenEnter`: `"फुल स्क्रीन में देखें"`
    - `hi.fullscreenExit`: `"फुल स्क्रीन से बाहर निकलें"`
    - `hi.fullscreenEnterShort`: `"फुल स्क्रीन"`
    - `hi.fullscreenExitShort`: `"बाहर निकलें"`

### 1.2 Test Execution Results
1. **Adversarial M2-2 Hierarchy Test Suite**:
   ```
   Command: node --test tests/adversarial-m2-hierarchy.test.mjs
   Output:
   ▶ Adversarial M2-2 Challenge: Hierarchy, Viewports & Localization
     ✔ Section 1: Stacking Order Hierarchy & Z-Index Cascade Invariants (6.6778ms)
     ✔ Section 2: Mobile Dynamic Viewport Resilience & Fallback Invariants (3.8094ms)
     ✔ Section 3: Bilingual String Rendering in Full-Screen Toggle Buttons (1798.1547ms)
     ✔ Section 4: Dictionary Parity & Translation Integrity (3.4875ms)
   ℹ tests 21
   ℹ suites 5
   ℹ pass 21
   ℹ fail 0
   ℹ duration_ms 2509.4074
   ```
2. **Master Navigation E2E Test Suite**:
   ```
   Command: npm test
   Output:
   ℹ tests 109
   ℹ suites 21
   ℹ pass 109
   ℹ fail 0
   ℹ duration_ms 3907.8605
   ```
3. **Full Project Test Suite Across All Test Files**:
   ```
   Command: node --test tests/*.test.mjs
   Output:
   ℹ tests 258
   ℹ suites 57
   ℹ pass 258
   ℹ fail 0
   ℹ duration_ms 4462.4581
   ```
4. **Production Build Compilation**:
   ```
   Command: npm run build
   Output:
   ✓ 388 modules transformed.
   dist/assets/index-6S02hvTI.css  43.30 kB │ gzip: 8.03 kB
   ✓ built in 4.93s (Exit code 0)
   ```

---

## 2. Logic Chain

1. **Stacking Order Mathematical Invariant Verification**:
   - Observations in § 1.1 verify the exact z-index values:
     - `.mobile-bottom-nav` = 95
     - `.site-nav` = 100
     - `.treewrap-host.is-fullscreen` = 800
     - `.overlay` (Person detail modal sheet) = 999
     - `.settings-popover` = 1000
     - `.site-nav:has(.settings-popover)` = 1000
     - `.skip-link` = 2000
   - Test `ADV-STK-02` verifies the strict mathematical order:
     `95 < 100 < 800 < 999 <= 1000 < 2000`.
   - In full-screen mode, `.treewrap-host.is-fullscreen` (800) sits above `.site-nav` (100) and `.mobile-bottom-nav` (95), preventing navigation bars from showing over or intercepting clicks on the canvas.
   - When a person card detail modal sheet is opened in full-screen mode, `.overlay` (999) sits above `.treewrap-host.is-fullscreen` (800), ensuring the modal sheet and backdrop capture user interactions cleanly.
   - When the settings popover is opened, `.site-nav:has(.settings-popover)` elevates the navbar to `1000 !important;`, which defeats `800 !important;` and ensures the settings popover is usable even when the tree is full-screen.
   - Tests `ADV-STK-03` and `ADV-STK-04` empirically test hit-testing across all layer combinations.

2. **Dynamic Viewport Unit Fallback Cascade**:
   - Mobile browsers (Safari on iOS, Chrome on Android) expand and collapse their URL and bottom navigation chrome dynamically during scrolling and gesture handling.
   - Observations in § 1.1 verify that `src/styles/tree.css` specifies:
     ```css
     width: 100vw !important;
     width: 100dvw !important;
     height: 100vh !important;
     height: 100dvh !important;
     ```
   - In standard CSS cascading rules, parsers evaluate declarations sequentially. A browser supporting `dvh`/`dvw` overrides the preceding `vh`/`vw`. A legacy engine (or WebView) that does not recognize `dvh`/`dvw` discards the unknown tokens and retains the valid fallback `100vh`/`100vw`.
   - Test `ADV-VWP-02` confirms declaration ordering (`vh` before `dvh`, `vw` before `dvw`).
   - Test `ADV-VWP-03` simulates both modern and legacy CSS engines, proving non-zero, full container height in both environments.
   - Test `ADV-VWP-04` confirms that `.treewrap-host.is-fullscreen .treewrap` sets `height: 100% !important; min-height: 100% !important; max-height: 100% !important; margin: 0 !important; border: none !important;`, eliminating standard non-fullscreen fixed heights (`calc(100vh - 210px)`).

3. **Bilingual String Rendering & Narrow Screen Geometry**:
   - Observations in § 1.1 and test `ADV-BIL-01` confirm that both `Canvas` floating toggle and `CanvasDock` tray toggle render valid English and Hindi strings and icons:
     - Standard: `"Full screen"` / `"फुल स्क्रीन"` with enter icon `⛶` and accessible `aria-label` `"Enter full screen"` / `"फुल स्क्रीन में देखें"`.
     - Fullscreen: `"Exit"` / `"बाहर निकलें"` with exit icon `✕` and accessible `aria-label` `"Exit full screen"` / `"फुल स्क्रीन से बाहर निकलें"`.
   - Test `ADV-BIL-03` confirms 0 broken HTML entities (`&#...`), 0 raw unicode escape literals (`\u...`), and 0 `undefined`/`null`/`NaN` tokens.
   - Test `ADV-BIL-04` validates that all Hindi strings contain authentic Devanagari codepoints (`[\u0900-\u097F]`).
   - Test `ADV-BIL-05` stress-tests rendered widths on mobile screens from 320px to 414px (iPhone SE to iPhone 11 Pro Max). At maximum text length, the button occupies less than 40% of the narrowest 320px screen width, leaving over 190px of horizontal room, preventing text clipping, wrapping issues, or horizontal scroll blowout.
   - Test `ADV-BIL-06` verifies mobile safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-bottom)`) and accessible touch target sizes (`min-width: 40px`, `height: 40px`).

4. **Dictionary Parity & Translation Integrity**:
   - Observations in § 1.1 and tests `ADV-DIC-01` through `ADV-DIC-05` verify:
     - Exact key count parity: 261 keys in both `en.js` and `hi.js`.
     - 0 missing keys in either direction.
     - 0 empty strings or dummy placeholder values ("TODO", "TBD", "placeholder").
     - Parameterized function entries execute cleanly without throwing.
     - Translator helper (`createTranslator`) resolves all M2 keys robustly even when called with extraneous or missing arguments.

---

## 3. Caveats

- **No Caveats**: All 4 challenge dimensions specified in the dispatch were empirically tested and validated. No regressions were observed across the entire 258-test project suite.
- Review-only discipline was strictly maintained: no implementation files in `src/` were modified. Only the new adversarial test file `tests/adversarial-m2-hierarchy.test.mjs` was authored.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone M2 implementation (Full-Screen Family Tree View Mode) is mathematically sound, resilient across mobile dynamic viewports, fully localized without clipping or entity corruption, and possesses flawless dictionary parity.

---

## 5. Verification Method

To independently verify the adversarial test suite and system integrity:

1. **Run Adversarial M2 Hierarchy Test Suite**:
   ```powershell
   node --test tests/adversarial-m2-hierarchy.test.mjs
   ```
   *Expected*: 21 passed, 0 failed.
2. **Run Master Navigation E2E Suite**:
   ```powershell
   npm test
   ```
   *Expected*: 109 passed, 0 failed.
3. **Run All Project Test Suites**:
   ```powershell
   node --test tests/*.test.mjs
   ```
   *Expected*: 258 passed, 0 failed.
4. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Vite build succeeds with exit code 0.
