# Project: Family Tree Mobile UX Enhancements

## Architecture
- **Framework & Runtime**: React 18 SPA bundled with Vite 6, using HTML5 DOM + SVG hybrid rendering.
- **Coordinate & Viewport System**:
  - Spatial layout computed by `src/layout/engine.js`.
  - Scaled canvas stage (`.stage`) transformed via CSS `transform: scale(zoom)` from origin (0, 0).
  - Physical scroll container (`.treewrap`) managing native pan coordinates (`scrollLeft`, `scrollTop`).
  - Viewport-aware responsive top navigation (`.site-nav`) and bottom navigation (`.mobile-bottom-nav`).
- **State & Storage Architecture**:
  - Centralized application state in `src/App.jsx`.
  - Offline-first persistence via `src/utils/storage.js` (`gupta_canvas_zoom`, `gupta_canvas_pan`, `gupta_active_tree_id`, `gupta_display_mode`, `gupta_preferred_lang`).
  - Bilingual localization engine in `src/i18n/` with strict dictionary key parity between English (`en.js`) and Hindi (`hi.js`).
- **Animation Strategy**:
  - High-frequency mobile interactions (header collapse/reveal, full-screen viewport transition, pinch scale) utilize GPU compositor transforms (`transform`, `opacity`) with zero layout thrashing.
  - Component entrances utilize `motion` (v14.10.1); dynamic list/modal mutations utilize `@formkit/auto-animate` via `useSmartAutoAnimate.js`.
  - Strict compliance with `prefers-reduced-motion` and `:root[data-motion="reduce"]`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Mobile Scroll Detection & Hysteresis | Detect scroll direction on mobile viewports with deadzone threshold (12px) and top-guard (scrollY <= 10px). | M1 | Survey |
| F2 | Collapsible Top Navigation Bar | Collapse `.site-nav` with GPU transform (`translateY(-100%)`, opacity 0) on scroll up; reveal on scroll down. | M1 | Survey |
| F3 | Top Bar Accessibility & Popover Protection | Keep top bar visible when Settings popover is open or when an element inside has focus (`:focus-within`). | M1 | Survey |
| F4 | Top Bar Interactive Elements Preservation | Ensure Copy Link, GitHub, Sign In, Home, Demo Tree buttons remain fully functional when visible. | M1 | Survey |
| F5 | Hybrid Full-Screen Viewport Mode | CSS fixed viewport overlay (`position: fixed; inset: 0; z-index: 800; height: 100dvh; width: 100dvw;`) on `.treewrap-host` with HTML5 Fullscreen API progressive enhancement. | M2 | Survey |
| F6 | Full-Screen Toggle Controls | Dedicated toggle button in `CanvasDock` and floating canvas toggle button with bilingual labels. | M2 | Survey |
| F7 | Full-Screen Exit & Clean Layout Restoration | Escape key handler, exit button, native fullscreen change sync, clean restoration of standard layout and pan/zoom coordinates. | M2 | Survey |
| F8 | Non-blocking Modal Sheet Overlay Hierarchy | Ensure person card detail modal sheets (`z-index: 999`) and settings remain visible on top of full-screen tree canvas (`z-index: 800`). | M2 | Survey |
| F9 | Bilingual Translation Dictionary Parity | Add `fullscreenEnter`, `fullscreenExit`, `fullscreenEnterShort`, `fullscreenExitShort` to both `en.js` and `hi.js` maintaining 100% key parity. | M2 | Survey |
| F10 | Two-Finger Touch Event Tracking | Non-passive touch listeners on `.treewrap` capturing `touchstart`, `touchmove`, `touchend`, calling `preventDefault()` ONLY during 2-finger touch. | M3 | Survey |
| F11 | Focal-Point Midpoint Zoom Math | Calculate Euclidean distance delta ratio, adjust zoom clamped to `[0.4, 1.4]`, anchor canvas scroll position to touch midpoint $(V_x, V_y)$ without visual jumping. | M3 | Survey |
| F12 | 60fps RequestAnimationFrame Batching | Throttle pinch updates with `requestAnimationFrame` to eliminate layout thrashing on mobile screens. | M3 | Survey |
| F13 | Gesture Isolation & Card Click Suppression | Single-finger drag remains 100% native; `hasPinched` flag with 120ms debounce prevents accidental card click upon lifting fingers. | M3 | Survey |
| F14 | Smooth UI Animations & Transitions | GPU-accelerated CSS cubic-bezier transitions for navbar collapse/reveal, full-screen transitions, and tree controls with `prefers-reduced-motion` compliance. | M1, M2, M3 | Survey |
| F15 | Non-Regression Invariant Verification | Maintain 100% pass rate on existing 109 tests, public demo tree loading, Firebase/local auth, link copy, and build size. | M4 | Survey |
| F16 | Opaque-Box E2E Mobile Test Suite | Category-Partition, BVA, Pairwise, Real-World test suite covering Tiers 1-4 for mobile viewports. | E2E-Track | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Mobile Testing Track | Test infra & runner in `tests/`, test cases across Tiers 1-4 for mobile nav, full-screen, pinch-to-zoom, animations. Produces `TEST_READY.md`. | none | DONE |
| M1 | Collapsible Mobile Navigation Bar | Implementation of F1, F2, F3, F4, F14 in `src/components/Navbar.jsx` and `src/styles/landing.css`. | none | DONE |
| M2 | Full-Screen Family Tree View Mode | Implementation of F5, F6, F7, F8, F9, F14 in `src/components/Canvas.jsx`, `src/components/CanvasDock.jsx`, `src/styles/tree.css`, `src/styles/landing.css`, `src/i18n/`. | none | DONE |
| M3 | Pinch-to-Zoom Touch Gestures & Smoothness | Implementation of F10, F11, F12, F13, F14 in `src/components/Canvas.jsx` and touch event handling. | M2 | DONE |
| M4 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Phase 1: 100% pass on E2E test suite (Tiers 1-4); Phase 2: Adversarial coverage hardening (Tier 5). | E2E, M1, M2, M3 | DONE |

## Interface Contracts
### Navbar ↔ Window & Viewport
- `Navbar.jsx` listens to `window.addEventListener('scroll', handleScroll, { passive: true })` on mobile viewports (`window.innerWidth <= 768` or `:root[data-viewport="mobile"]`).
- When scrolling up into content, applies class `.site-nav.is-collapsed`.
- When scrolling down toward top, removes `.site-nav.is-collapsed`.
- Guard: if `currentScrollY <= 10` or `isSettingsOpen === true` or `.site-nav:focus-within`, keep `.site-nav` visible.
- Exported DOM structure: keeps `#nav-btn-home`, `#nav-btn-demo`, `#nav-btn-mytree`, `.nav-actions`, and `.site-nav` root intact for SSR assertions.

### Canvas ↔ Full-Screen Mode
- `Canvas.jsx` controls `isFullscreen: boolean`.
- Root container: `<div className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}>`.
- CSS rule: `.treewrap-host.is-fullscreen` takes `position: fixed; inset: 0; z-index: 800; width: 100vw; height: 100dvh;`.
- Controls: exposes full-screen toggle to `<CanvasDock>` via `onToggleFullscreen` prop and renders `<button className="canvas-fullscreen-toggle">` floating button.
- Keyboard: listens for `Escape` to exit full-screen.
- Native API: triggers `requestFullscreen()` and `exitFullscreen()` where supported with error guards.

### Canvas ↔ Pinch-to-Zoom Touch Engine
- `Canvas.jsx` attaches non-passive touch listeners on `.treewrap`:
  - `touchstart`: detects `touches.length === 2`, records distance $D_0$, midpoint $M_0$, initial zoom $Z_0$, and stage coordinate $P_{stage}$. Sets `pinchRef.current.hasPinched = true`.
  - `touchmove`: if `touches.length === 2`, calls `e.preventDefault()`, computes scale ratio $r = D_{curr} / D_0$, clamps zoom to $[0.4, 1.4]$, and batches scroll update via `requestAnimationFrame` ensuring $(P_{stage})$ remains anchored at current midpoint $M_{curr}$.
  - `touchend`: when touches drop below 2, persists final zoom and pan coordinates, and maintains `hasPinched = true` for 120ms to suppress synthetic card click.
  - 1-finger touch: zero interference, native overflow scrolling runs cleanly.

## Code Layout
- Exclusive File Ownership Boundaries:
  - **Milestone M1 Worker**: owns `src/components/Navbar.jsx` and `.site-nav` rules in `src/styles/landing.css`.
  - **Milestone M2 Worker**: owns `src/components/CanvasDock.jsx`, `.treewrap-host.is-fullscreen` rules in `src/styles/tree.css`, `src/styles/landing.css`, and `src/i18n/en.js`, `src/i18n/hi.js`.
  - **Milestone M3 Worker**: owns touch event listeners and focal zoom math in `src/components/Canvas.jsx`. (Runs after M2 completes to ensure clean handoff on `Canvas.jsx`).
  - **E2E Testing Track**: owns `tests/e2e-mobile-ux.test.mjs` and related test fixtures. Does NOT modify `src/`.
