# Handoff Report: Explorer M2-2 (CSS Viewport, Sizing & Z-Index Architecture)

**Milestone**: M2 — Full-Screen Family Tree View Mode  
**Role**: Explorer M2-2 (CSS Viewport & Sizing Explorer)  
**Date**: 2026-11-09  
**Status**: Investigation Complete — Hard Handoff  

---

## 1. Observation

Direct code examination and tool execution revealed the following concrete data:

### 1.1 Existing CSS Architecture & Viewport Constraints
- **`src/styles/tree.css` (lines 3–20)**:
  ```css
  .treewrap {
    position: relative;
    width: 100%;
    background: var(--surface);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    border-left: none;
    border-right: none;
    border-radius: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
    height: calc(100vh - 210px);
    min-height: 540px;
    margin-block: 16px;
    user-select: none;
    touch-action: pan-x pan-y;
  }
  ```
  *Finding*: No `.treewrap-host` or `.is-fullscreen` or `.canvas-fullscreen-toggle` rules currently exist in `tree.css`.

- **`src/styles/landing.css` (lines 659–661, 1139–1141, 1176–1179)**:
  ```css
  .treewrap-host {
    position: relative;
  }
  ...
  :root[data-viewport="mobile"] .treewrap {
    height: 64vh;
    min-height: 400px;
  }
  ...
  @media (max-width: 768px) {
    :root:not([data-viewport="laptop"]) .treewrap {
      height: 66vh;
      min-height: 420px;
    }
  }
  ```
  *Finding*: On mobile viewports and mobile simulation mode (`data-viewport="mobile"`), `.treewrap` is constrained to `64vh` / `66vh`. The full-screen rules must decisively override these with `!important`.

### 1.2 Comprehensive Codebase Z-Index Layer Audit
Ripgrep search (`grep_search` for `z-index` in `src/`) identified all existing z-index layers across the entire application:

| File | Line | Selector | Z-Index | Purpose |
|---|---|---|---|---|
| `src/styles/components.css` | 6 | `.skip-link` | `2000` | Topmost keyboard accessibility bypass |
| `src/styles/components.css` | 324 | `.settings-popover` | `1000` | Settings & theme popover dialog |
| `src/styles/components.css` | 401 | `.overlay` | `999` | Person card detail modal sheet (`Sheet.jsx`), `AddModal`, `HelpModal`, `AuthModal`, `CreateTreeModal`, `ShareTreeModal` |
| `src/styles/landing.css` | 587 | `.onboard-toast` | `900` | Contextual onboarding guidance toast |
| `src/styles/landing.css` | 7 | `.site-nav` | `100` | Sticky top navigation bar |
| `src/styles/components.css` | 1003 | `.mobile-bottom-nav` | `95` | Fixed mobile bottom navigation bar |
| `src/styles/landing.css` | 667 | `.canvas-dock` | `20` | Canvas controls collapsible dock |
| `src/styles/tree.css` | 176 | `.card:focus-visible` | `6` | Focused tree member card |
| `src/styles/tree.css` | 170 | `.card:hover` | `5` | Hovered tree member card |
| `src/styles/tree.css` | 161 | `.card` | `3` | Base tree member card |
| `src/styles/tree.css` | 117, 126 | `.branch-pill`, `.gen-rail`| `2` | Branch header and generation pills |

### 1.3 Test Suite Expectations & Assertions
Execution of `node --test tests/e2e-mobile-ux.test.mjs` revealed 4 failing tests in R2 (Full-screen view mode):
1. **`T1-R2-03: Full-screen sizing: .treewrap-host.is-fullscreen occupies full viewport dimensions in CSS`** (`tests/e2e-mobile-ux.test.mjs:340–354`):
   ```javascript
   const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
   const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
   const allCss = treeCss + '\n' + landingCss;
   assert.ok(allCss.includes('.treewrap-host.is-fullscreen') || allCss.includes('.is-fullscreen'));
   assert.ok(allCss.includes('fixed') && (allCss.includes('100dvh') || allCss.includes('100vh')));
   ```
2. **`T2-R2-05: Orientation change (portrait <-> landscape) inside full-screen recalculates dimensions`** (`tests/e2e-mobile-ux.test.mjs:780–786`):
   ```javascript
   const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
   assert.ok(
     treeCss.includes('100dvw') || treeCss.includes('100vw') || treeCss.includes('inset: 0') || treeCss.includes('width: 100%'),
     'Fullscreen container must use dynamic viewport units to adapt to orientation changes'
   );
   ```
   *Critical Finding*: Test `T2-R2-05` reads `src/styles/tree.css` **directly** (not `landing.css`), requiring `.treewrap-host.is-fullscreen` with `100dvw` and `inset: 0` to be declared in `src/styles/tree.css`.
3. **`T1-R2-06: Modal sheet overlay hierarchy`** (`tests/e2e-mobile-ux.test.mjs:398–408`) & **`T3-PAIR-07 [R2 + Modal]`** (`lines 1031–1036`):
   ```javascript
   const canvasZIndex = 800;
   const modalZIndex = 999;
   assert.ok(modalZIndex > canvasZIndex, 'Modal sheet must render above full-screen canvas');
   ```

---

## 2. Logic Chain

### 2.1 Viewport Sizing & Dynamic Viewport Units (`100dvh` / `100dvw`)
- **Step 1**: On mobile devices (iOS Safari and Android Chrome), fixed elements using standard `100vh` frequently suffer from layout clipping or vertical jumping when browser toolbars (URL address bar and bottom navigation toolbar) dynamically expand or collapse during scrolling.
- **Step 2**: The CSS Large Viewport (`lvh`), Small Viewport (`svh`), and Dynamic Viewport (`dvh` / `dvw`) units solve this. Specifically, `100dvh` dynamically tracks the actual visible viewport height as browser UI expands and contracts.
- **Step 3**: To support legacy browsers alongside modern mobile engines, the stylesheet must provide progressive fallback declarations:
  ```css
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  ```
  Browsers lacking `dvh`/`dvw` support safely ignore the second line and use `100vh`/`100vw`, while modern browsers override with the dynamic unit.
- **Step 4**: Coupling this with `position: fixed; inset: 0;` establishes an unbreakable fullscreen overlay anchored to the hardware screen boundary regardless of body scroll position.

### 2.2 Inner Container Override (`.treewrap-host.is-fullscreen .treewrap`)
- **Step 5**: In normal mode, `.treewrap` has `height: calc(100vh - 210px); min-height: 540px; margin-block: 16px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);`.
- **Step 6**: In mobile viewports, media queries clamp `.treewrap` to `64vh` / `66vh`.
- **Step 7**: Therefore, `.treewrap-host.is-fullscreen .treewrap` must enforce:
  ```css
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  ```
  The `!important` flags ensure unconditional override over `:root[data-viewport="mobile"]` and `@media (max-width: 768px)` selectors.

### 2.3 Stacking Context & Z-Index Layering Integrity
- **Step 8**: Target stacking order for Milestone M2:
  - **`z-index: 2000`**: `.skip-link` (top-level accessibility bypass)
  - **`z-index: 1000`**: `.settings-popover` (settings dialog)
  - **`z-index: 999`**: `.overlay` (Person detail sheet `<Sheet>`, `<AddModal>`, `<HelpModal>`)
  - **`z-index: 900`**: `.onboard-toast` (guidance alerts)
  - **`z-index: 800`**: `.treewrap-host.is-fullscreen` (Active Full-Screen Canvas)
  - **`z-index: 100`**: `.site-nav` (Top navigation bar)
  - **`z-index: 95`**: `.mobile-bottom-nav` (Mobile bottom navigation bar)
- **Step 9**: Because `800 > 100` and `800 > 95`, entering full-screen mode cleanly covers both the top navbar and the mobile bottom navigation bar, fulfilling Requirement R2 ("maximize screen real estate and reduce clutter").
- **Step 10**: Because `999 > 800`, when a user taps a family member card in full-screen mode, the person card modal sheet (`.overlay`) renders cleanly ON TOP of the full-screen canvas without terminating or resetting full-screen mode.
- **Step 11**: Stacking Context Isolation: `<main className="page">` does not establish an isolated stacking context (no permanent `transform`, `filter`, or `contain` properties). Therefore, `.treewrap-host.is-fullscreen` and `.overlay` both participate in the root viewport stacking context.

### 2.4 Floating Controls & Device Notch Ergonomics
- **Step 12**: Inside `.treewrap-host`, two controls float above the canvas:
  - `.canvas-dock` (`z-index: 20`): Positioned at `bottom: 12px; right: 12px;`.
  - `.canvas-fullscreen-toggle` (`z-index: 25`): Positioned at `top: 14px; right: 14px;`.
- **Step 13**: In full-screen mode, modern devices with notches, camera cutouts, or Dynamic Islands (e.g. iPhone) require safe-area padding. Using `calc(14px + env(safe-area-inset-top, 0px))` and `calc(14px + env(safe-area-inset-right, 0px))` prevents buttons from being obscured by hardware cutouts.
- **Step 14**: When full-screen is active, `.canvas-fullscreen-toggle` transitions to an accent active state (`border-color: var(--accent); color: var(--accent);`) indicating its dual role as an exit button.
- **Step 15**: Accessibility and touch target compliance: On mobile screens (`max-width: 768px`), the button dimensions scale to `40px x 40px` (or `44px`) to satisfy WCAG 2.5.5 touch target guidelines.

---

## 3. Caveats

1. **Direct File Test Assertion**: Test `T2-R2-05` reads `src/styles/tree.css` directly via `fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8')`. Full-screen rules must NOT be placed solely in `src/styles/landing.css`. They MUST be placed in `src/styles/tree.css`.
2. **Settings Popover in Fullscreen**: Because `.settings-popover` is nested inside `.site-nav` (which has `z-index: 100`), opening settings from the mobile bottom nav while in fullscreen would remain beneath `z-index: 800` unless `.site-nav` elevates. The proposed CSS includes `.site-nav:has(.settings-popover) { z-index: 1000; }` to protect this hierarchy.
3. **No External Libraries**: All viewport management and transitions must use native CSS and GPU compositing properties (`transform`, `opacity`), avoiding expensive reflows (`top`, `left`, `width`, `height`).

---

## 4. Conclusion & Concrete Proposals

### 4.1 Proposed CSS Additions for `src/styles/tree.css`
Append the following block to `src/styles/tree.css`:

```css
/* =========================================================================
   Milestone M2: Full-Screen Viewport Mode & Floating Toggle Controls (F5-F8, F14)
   ========================================================================= */

/* Host container for tree canvas and floating dock / toggle */
.treewrap-host {
  position: relative;
  width: 100%;
}

/* Full-Screen Viewport Overlay (Fixed Viewport Architecture) */
.treewrap-host.is-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 800 !important;
  width: 100vw !important;
  width: 100dvw !important;
  height: 100vh !important;
  height: 100dvh !important;
  background: var(--surface) !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  border-radius: 0 !important;
}

/* Ensure inner scroll container occupies 100% of the full-screen viewport */
.treewrap-host.is-fullscreen .treewrap {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
}

/* Floating Full-Screen Toggle Button */
.canvas-fullscreen-toggle {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 25;
  min-width: 38px;
  height: 38px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--ink);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.16s ease,
    color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.18s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.canvas-fullscreen-toggle:hover {
  background: var(--ink);
  color: var(--bg);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

.canvas-fullscreen-toggle:active {
  transform: translateY(0) scale(0.97);
}

.canvas-fullscreen-toggle:focus-visible {
  outline: 2px solid var(--accent) !important;
  outline-offset: 2px !important;
}

/* Active Fullscreen State for Floating Toggle */
.treewrap-host.is-fullscreen .canvas-fullscreen-toggle,
.canvas-fullscreen-toggle.is-active {
  top: calc(14px + env(safe-area-inset-top, 0px));
  right: calc(14px + env(safe-area-inset-right, 0px));
  background: var(--surface);
  color: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.treewrap-host.is-fullscreen .canvas-fullscreen-toggle:hover,
.canvas-fullscreen-toggle.is-active:hover {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
}

/* Position adjustment for canvas dock in fullscreen mode to honor safe-area */
.treewrap-host.is-fullscreen .canvas-dock {
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  right: calc(12px + env(safe-area-inset-right, 0px));
}

/* Mobile touch target sizing */
@media (max-width: 768px) {
  .canvas-fullscreen-toggle {
    min-width: 40px;
    height: 40px;
    padding: 0 10px;
    font-size: 13px;
  }
}

/* Reduced Motion Compliance (F14) */
:root[data-motion="reduce"] .canvas-fullscreen-toggle,
:root[data-motion="reduce"] .treewrap-host.is-fullscreen {
  transition: none !important;
  animation: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .canvas-fullscreen-toggle,
  .treewrap-host.is-fullscreen {
    transition: none !important;
    animation: none !important;
  }
}
```

### 4.2 Proposed CSS Additions for `src/styles/landing.css`
Add defensive overrides in `src/styles/landing.css` to prevent mobile view simulation conflicts:

```css
/* Milestone M2: Protect fullscreen mode under mobile viewport modes */
:root[data-viewport="mobile"] .treewrap-host.is-fullscreen .treewrap,
:root:not([data-viewport="laptop"]) .treewrap-host.is-fullscreen .treewrap {
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
}

/* Elevate navbar if settings popover is open so it sits above fullscreen canvas (z-index: 1000 > 800) */
.site-nav:has(.settings-popover) {
  z-index: 1000 !important;
}

/* CanvasDock Fullscreen Toggle Button Styling */
.dock-btn.dock-fullscreen-btn {
  font-size: 12.5px;
}

.dock-btn.dock-fullscreen-btn.active,
.dock-btn.dock-fullscreen-btn[aria-pressed="true"] {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

:root[data-theme="dark"] .dock-btn.dock-fullscreen-btn.active {
  background: var(--ink);
  color: var(--bg);
}
```

---

## 5. Verification Method

To independently verify this CSS architecture:

1. **Verify Unit & E2E CSS Assertions**:
   ```powershell
   node --test tests/e2e-mobile-ux.test.mjs
   ```
   - `T1-R2-03` asserts `.treewrap-host.is-fullscreen`, `fixed`, and `100dvh` in `src/styles/tree.css`.
   - `T2-R2-05` asserts `100dvw` and `inset: 0` in `src/styles/tree.css`.
   - `T1-R2-06` and `T3-PAIR-07` assert modal sheet (`999`) > canvas (`800`).
   - `T3-PAIR-04` asserts reduced motion compliance.

2. **Verify Non-Regression on Existing 109 Navigation Tests**:
   ```powershell
   npm test
   ```
   All 109 tests must continue to pass cleanly with exit code 0.

3. **Verify Adversarial M1 Scenarios**:
   ```powershell
   node --test tests/adversarial-m1-interaction.test.mjs tests/adversarial-scroll-mechanics.test.mjs
   ```
   All 37 adversarial interaction and scroll tests must pass.

4. **Invalidation Conditions**:
   - If `.treewrap-host.is-fullscreen` is placed only in `landing.css` and omitted from `tree.css`, `T2-R2-05` will fail.
   - If `!important` is omitted from height rules on `.treewrap-host.is-fullscreen .treewrap`, mobile rules (`64vh` / `66vh`) will constrain canvas height in mobile view mode.
   - If modal sheet z-index is set below 800, `T3-PAIR-07` will fail.
