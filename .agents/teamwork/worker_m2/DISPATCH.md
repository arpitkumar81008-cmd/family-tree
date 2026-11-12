# DISPATCH for Worker M2

## Identity
- Role: Implementation Worker (Milestone M2 — Full-Screen Family Tree View Mode)
- Working Directory: c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m2

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
- `src/components/Canvas.jsx`
- `src/components/CanvasDock.jsx`
- `src/styles/tree.css`
- `src/styles/landing.css`
- `src/i18n/en.js`
- `src/i18n/hi.js`

## Task Instructions
Implement Milestone M2 (Full-Screen Family Tree View Mode) by applying the synthesized recommendations from Explorers M2-1, M2-2, and M2-3:
1. In `src/i18n/en.js` and `src/i18n/hi.js`:
   - Add translation keys `fullscreenEnter`, `fullscreenExit`, `fullscreenEnterShort`, `fullscreenExitShort` maintaining 100% dictionary key parity.
   - Reference patch: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_3\i18n_fullscreen.patch`.
2. In `src/components/Canvas.jsx`:
   - Support `isFullscreen` prop (with dual controlled/uncontrolled internal state fallback).
   - Render `.treewrap-host.is-fullscreen` conditionally.
   - Add dedicated floating toggle button (`canvas-fullscreen-toggle`).
   - Add window `Escape` key listener (with guard against open modals).
   - Add progressive enhancement for HTML5 Fullscreen API (`requestFullscreen()`, `exitFullscreen()`, `fullscreenchange` listener).
   - Preserve pan coordinates across full-screen toggle using `saveCanvasPan`.
   - Pass `isFullscreen` and toggle callback to `<CanvasDock>`.
   - Reference report: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_1\handoff.md`.
3. In `src/components/CanvasDock.jsx`:
   - Add full-screen toggle button (`dock-fullscreen-btn`) to `.dock-controls-tray`.
4. In `src/styles/tree.css`:
   - Add `.treewrap-host.is-fullscreen` with `position: fixed; inset: 0; z-index: 800; width: 100vw; width: 100dvw; height: 100vh; height: 100dvh; background: var(--surface); margin: 0; padding: 0;`.
   - Add `.treewrap-host.is-fullscreen .treewrap` with `height: 100% !important; min-height: 100% !important; max-height: 100% !important; margin: 0 !important; border: none !important;`.
   - Add `.canvas-fullscreen-toggle` styling and active states with safe area insets.
   - Reference report: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_2\handoff.md`.
5. In `src/styles/landing.css`:
   - Add defensive overrides for `:root[data-viewport="mobile"] .treewrap-host.is-fullscreen .treewrap` and `.site-nav:has(.settings-popover)`.

## Verification Commands
After implementing:
1. Run `node --test tests/e2e-mobile-ux.test.mjs` — verify all R1 and R2 tests pass!
2. Run `npm test` — verify all 109 master tests pass!
3. Run `npm run build` — verify Vite build succeeds with exit code 0!

Write your handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m2\handoff.md` with build and test outputs, and notify parent orchestrator via `send_message`.


## 2026-11-09T14:12:14Z
You are the Implementation Worker for Milestone M2 (Full-Screen Family Tree View Mode).
Your working directory is: c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m2
Read your dispatch assignment at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m2\DISPATCH.md
Read the original user request at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master document at: c:\B-Tech 1st year\Family Tree\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `src/components/Canvas.jsx`
- `src/components/CanvasDock.jsx`
- `src/styles/tree.css`
- `src/styles/landing.css`
- `src/i18n/en.js`
- `src/i18n/hi.js`

Inputs from Explorers:
- Controls blueprint: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_1\handoff.md`
- CSS rules & z-index architecture: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_2\handoff.md`
- Localization patch: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_3\i18n_fullscreen.patch` and `handoff.md`

Tasks:
1. Apply the 4 localization keys to `src/i18n/en.js` and `src/i18n/hi.js`.
2. Update `src/components/Canvas.jsx` with full-screen container class, floating toggle button, escape handler, and HTML5 Fullscreen API progressive enhancement.
3. Update `src/components/CanvasDock.jsx` with full-screen toggle button.
4. Update `src/styles/tree.css` and `src/styles/landing.css` with fixed viewport overlay (`100dvh`/`100dvw`), z-index 800, and floating button styles.
5. Run `node --test tests/e2e-mobile-ux.test.mjs` (verify all R1 and R2 tests pass).
6. Run `npm test` (verify all 109 navigation tests pass).
7. Run `npm run build` (verify build succeeds).
8. Document results and write handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m2\handoff.md`.
9. Notify parent orchestrator via send_message when complete.
