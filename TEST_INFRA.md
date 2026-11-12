# Testing Infrastructure & Methodology: Family Tree Mobile UX

## Overview & Architecture
The testing infrastructure for the **Family Tree Mobile UX Enhancements** project implements an opaque-box, requirement-driven verification engine built on Node.js's native test runner (`node:test`) and strict assertion library (`node:assert/strict`).

The test runner interacts with the application across two primary surfaces:
1. **Dynamic Vite SSR Evaluation**: Using Vite's programmatic server (`createServer({ server: { middlewareMode: true } })`), tests compile and render React 18 JSX components (`Navbar.jsx`, `Canvas.jsx`, `CanvasDock.jsx`, `MobileBottomNav.jsx`, `LandingPage.jsx`) to semantic HTML strings via `react-dom/server` (`renderToStaticMarkup`), verifying tag semantics, accessible roles, ARIA attributes, and structural hierarchies without requiring heavy headless browser dependencies.
2. **Behavioral & Mathematical Specification Oracles**: Pure, authoritative specification oracles derived strictly from `PROJECT.md` and `ORIGINAL_REQUEST.md` execute mathematical calculations for touch distance, focal midpoint anchoring, zoom ratio clamping (`[0.4, 1.4]`), scroll hysteresis deadzones (`12px`), and top-boundary guards (`<= 10px`).

## Directory & File Layout
```
tests/
├── e2e-navigation.test.mjs    # Core Navigation E2E Suite (109 tests, 100% PASS)
├── e2e-mobile-ux.test.mjs     # Mobile UX Enhancements Suite (64 tests, Tiers 1-4)
└── helpers/
    ├── dom-assert.mjs         # Semantic CSS selector & HTML assertion engine
    ├── harness.mjs            # Unified export re-exporting all mock and runner utilities
    ├── ssr-runner.mjs         # Vite SSR dynamic module loader & static HTML renderer
    ├── storage-mock.mjs       # W3C LocalStorage mock with QuotaExceededError simulation
    └── window-mock.mjs        # W3C MockWindow, Location, and History EventTarget mock
```

## 4-Tier Test Architecture
The test suite enforces a rigorous 4-Tier verification hierarchy:

| Tier | Name | Target Scope | Mobile UX Count |
|------|------|--------------|-----------------|
| **Tier 1** | Feature Coverage | Happy-path equivalence classes for requirements R1, R2, R3, R4 | 26 Tests |
| **Tier 2** | Boundary & Corner Cases | Extreme screen sizes, micro-scrolls, rapid touches, edge coordinates | 24 Tests |
| **Tier 3** | Cross-Feature Combinations | Pairwise interactions between mobile features (e.g. Fullscreen + Pinch) | 8 Tests |
| **Tier 4** | Real-World User Scenarios | Complete multi-step smartphone workflows and genealogist flows | 6 Tests |
| **Total** | | | **64 Tests** |

### Tier Breakdown Details
1. **Tier 1 — Feature Coverage (26 tests)**:
   - **R1: Collapsible Top Navigation Bar (6 tests)**: Scroll up collapse, scroll down reveal, 12px hysteresis threshold, 10px top boundary guard, Settings popover protection, interactive button preservation.
   - **R2: Full-Screen Family Tree Mode (7 tests)**: Fullscreen class application (`.is-fullscreen`), exit restoration, viewport sizing (`100dvw`/`100dvh`), Escape key exit handler, CanvasDock toggle button, modal sheet overlay z-index hierarchy, bilingual dictionary key parity (`en.js` & `hi.js`).
   - **R3: Pinch-to-Zoom Gesture Controls (7 tests)**: Two-finger touchstart detection, pinch inward zoom out, pinch outward zoom in, `[0.4, 1.4]` clamping, focal midpoint anchoring math, 1-finger pan isolation, card click suppression debounce (~120ms).
   - **R4: UI Animations & Transitions (6 tests)**: Top navigation GPU transform transition, full-screen viewport transition, dock expand transitions, `prefers-reduced-motion` compliance, `:root[data-motion="reduce"]` theme compliance, reflow avoidance.

2. **Tier 2 — Boundary, Extreme & Corner Cases (24 tests)**:
   - **R1 Boundaries (6 tests)**: Ultra-narrow 320px viewport (iPhone SE), micro-scroll oscillation (+/- 5px), extreme 5000px scroll fling, iOS elastic overscroll (`scrollY < 0`), desktop viewports (`innerWidth >= 1024`), mobile landscape orientation (`innerHeight <= 500px`).
   - **R2 Boundaries (6 tests)**: Rapid toggle button spam (<200ms), HTML5 Fullscreen API rejection fallback, native `fullscreenchange` event synchronization, coordinate/pan preservation across exit, orientation change inside full-screen, perspective person retention.
   - **R3 Boundaries (6 tests)**: Extreme zoom attempts (scale ratios 0.01 / 50.0), coincident touches ($D_0 \approx 0$ safe division), 3+ simultaneous touch fingers, rapid touch tap without move, extreme viewport edge midpoints ($(0, 0)$ and $(W, H)$), touchcancel gesture interruption.
   - **R4 Boundaries (6 tests)**: High-frequency scroll event batching via `requestAnimationFrame`, dynamic displayMode switching ("Auto"/"Mobile"/"Laptop"), mid-animation reduced-motion toggle, CSS `translateY(-100%)` / `translate3d` hardware acceleration syntax, 300ms mobile budget, modal sheet entrance animation.

3. **Tier 3 — Cross-Feature Combinations (8 tests)**:
   - Pairwise interactions: R1+R2 (Navbar in Fullscreen), R2+R3 (Fullscreen + Pinch zoom), R1+R3 (Scroll detection vs Pinch touch), R2+R4 (Fullscreen + Reduced Motion), R1+R4 (Navbar + Reduced Motion), R2+Bilingual (English/Hindi toggle labels), R2+Modal (Card modal above Fullscreen canvas), R3+Card Click (Pinch on card suppresses detail modal).

4. **Tier 4 — Real-World Application Scenarios (6 tests)**:
   - `T4-SCEN-01`: Complete smartphone user journey (Home -> Demo Tree -> Scroll down -> Fullscreen -> Pinch zoom -> Inspect card -> Close details -> Exit fullscreen -> Scroll up).
   - `T4-SCEN-02`: Bilingual mobile journey with screen rotation (Hindi -> portrait -> landscape -> full-screen -> pinch zoom -> portrait).
   - `T4-SCEN-03`: Genealogist deep-inspection flow (Overview 0.4x zoom -> Detailed 1.4x zoom -> Focal anchor stability).
   - `T4-SCEN-04`: Mobile navigation with open settings popover (Popover protection during scroll -> Normal collapse after close).
   - `T4-SCEN-05`: Touch gesture resilience during dirty/interrupted touches (1-finger pan -> accidental 2nd finger -> clean resumption).
   - `T4-SCEN-06`: Accessibility, screen-reader, and keyboard navigation on mobile full-screen mode (Escape key exit, ARIA attributes).

## Test Execution Commands
Run the Mobile UX test suite:
```powershell
node --test tests/e2e-mobile-ux.test.mjs
```

Run the Navigation non-regression test suite:
```powershell
node --test tests/e2e-navigation.test.mjs
```

Run all test suites across the project:
```powershell
node --test tests/*.test.mjs
```

## Opaque-Box & Requirement-Driven Philosophy
Every test in this suite is derived from explicit statements in `PROJECT.md` and `ORIGINAL_REQUEST.md`. No test is designed around incidental implementation details:
- Tests do NOT inspect private closure variables; they verify DOM outputs, CSS stylesheet rules, storage keys, and event contracts.
- Tests do NOT use artificial facades or mocks that always pass; each test exercises genuine logic and asserts exact values.
- Contract tracking: Tests fail with actionable, descriptive error messages whenever an interface contract (e.g. `.site-nav.is-collapsed`, `.treewrap-host.is-fullscreen`, dictionary key parity) is missing or violated.
