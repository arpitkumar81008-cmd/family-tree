# Scope: Milestone M1 — Collapsible Mobile Navigation Bar

## Architecture
- Module boundary: `src/components/Navbar.jsx` and `.site-nav` rules in `src/styles/landing.css`.
- Feature set: F1, F2, F3, F4, F14 from `PROJECT.md`.
- Behavior:
  - On mobile viewports (`window.innerWidth <= 768` or `:root[data-viewport="mobile"]`), scrolling upwards (finger swiping up, advancing into content) causes `.site-nav` to collapse into compact size or become invisible (`transform: translateY(-100%); opacity: 0; pointer-events: none;`).
  - Scrolling down makes the top bar visible again (`transform: translateY(0); opacity: 1; pointer-events: auto;`).
  - Hysteresis threshold: 12px deadzone to prevent jitter.
  - Boundary guard: always visible when near/at top (`scrollY <= 10px`).
  - Accessibility & settings guard: if Settings popover is open or if any element inside has focus (`:focus-within`), top bar stays visible.
  - Interactive elements: Copy Link, GitHub, Sign In, Home, Demo Tree remain fully functional when visible.
  - Invariants: Preserve all existing tests in `tests/e2e-navigation.test.mjs`, including SSR markup and regexes on `landing.css` (`:root[data-viewport="mobile"] .site-nav { height: auto }`).

## Interface Contracts
- Reads: `window.scrollY`, `window.innerWidth`, `:root[data-viewport]`, `isSettingsOpen`.
- Modifies: `.site-nav` CSS classes and `src/styles/landing.css`.
- Does NOT touch canvas, tree coordinate system, or authentication logic.

## Code Layout
- `src/components/Navbar.jsx` (exclusively owned by M1)
- `src/styles/landing.css` (.site-nav rules exclusively owned by M1)
