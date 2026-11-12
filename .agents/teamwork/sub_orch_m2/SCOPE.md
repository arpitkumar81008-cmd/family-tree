# Scope: Milestone M2 — Full-Screen Family Tree View Mode

## Architecture
- Module boundary: `src/components/Canvas.jsx`, `src/components/CanvasDock.jsx`, `src/styles/tree.css`, `src/styles/landing.css`, `src/i18n/en.js`, `src/i18n/hi.js`.
- Feature set: F5, F6, F7, F8, F9, F14 from `PROJECT.md`.
- Behavior:
  - Provide a full-screen viewing mode on mobile devices for exploring the family tree, accessible via dedicated toggle button in `CanvasDock` and floating canvas toggle button.
  - Hybrid architecture: CSS fixed-viewport overlay (`.treewrap-host.is-fullscreen` with `position: fixed; inset: 0; z-index: 800; width: 100vw; width: 100dvw; height: 100vh; height: 100dvh; background: var(--surface); margin: 0;`) ensuring 100% compatibility across iOS Safari and Android Chrome, augmented by HTML5 Fullscreen API (`requestFullscreen()`) where supported.
  - Sizing: In full-screen mode, `.treewrap` utilizes 100% viewport width and height.
  - Layout restoration: Exiting full-screen mode (via toggle button, floating exit button, or `Escape` key) cleanly restores standard layout, canvas scroll position, and zoom level.
  - Overlay hierarchy: Person card details modal sheet (`z-index: 999`) and settings popover (`z-index: 1000`) sit strictly above full-screen canvas (`z-index: 800`).
  - Localization: Add `fullscreenEnter`, `fullscreenExit`, `fullscreenEnterShort`, `fullscreenExitShort` to both `src/i18n/en.js` and `src/i18n/hi.js` maintaining 100% dictionary key parity.

## Interface Contracts
- Canvas container: `<div className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}>`.
- Exposes `isFullscreen`, `onToggleFullscreen` to `<CanvasDock>`.
- Renders `<button className="canvas-fullscreen-toggle">` floating button.
- Preserves `gupta_canvas_zoom` and `gupta_canvas_pan` in local storage.

## Code Layout
- `src/components/CanvasDock.jsx` (exclusively owned by M2)
- `src/styles/tree.css` (fullscreen rules exclusively owned by M2)
- `src/i18n/en.js` & `src/i18n/hi.js` (fullscreen keys exclusively owned by M2)
- `src/components/Canvas.jsx` (container wrapping & state owned by M2 during M2; hands off to M3)
