# Scope: E2E Testing Track (Mobile UX Enhancements)

## Architecture
- Independent, opaque-box test track derived strictly from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`.
- Does not modify `src/` implementation files.
- Test harness located in `tests/e2e-mobile-ux.test.mjs` (or integrated with existing `tests/e2e-navigation.test.mjs` runner).
- Publishes `TEST_INFRA.md` and `TEST_READY.md` at project root when complete.

## Feature Inventory to Test
| # | Feature | Requirement | Test Scope |
|---|---------|-------------|------------|
| F1 | Mobile Scroll Detection & Hysteresis | R1 | Test scrolling up collapses header, scrolling down restores header, 10px deadzone/boundary. |
| F2 | Collapsible Top Navigation Bar | R1 | Test visibility, opacity, transform classes, and space reclamation on mobile viewports. |
| F3 | Top Bar Accessibility & Popover Protection | R1 | Test that open Settings popover or focused element keeps top bar visible. |
| F4 | Top Bar Interactive Elements Preservation | R1, R5 | Test Copy Link, GitHub, Sign In, Home, Demo Tree buttons remain fully interactive when visible. |
| F5 | Hybrid Full-Screen Viewport Mode | R2 | Test full viewport dimensions (`100dvw`/`100dvh`), covering standard headers. |
| F6 | Full-Screen Toggle Controls | R2 | Test dedicated toggle button in CanvasDock and floating canvas button. |
| F7 | Full-Screen Exit & Layout Restoration | R2, R5 | Test exit button and Escape key restore standard layout without coordinate drift. |
| F8 | Modal Sheet Z-Index Hierarchy | R2, R5 | Test person detail modal sheets open on top of full-screen tree canvas. |
| F9 | Bilingual Translation Parity | R2, R5 | Test 100% key parity between `en.js` and `hi.js` for all new fullscreen labels. |
| F10 | Two-Finger Touch Event Tracking | R3 | Test 2-finger touchstart/touchmove/touchend, preventDefault called only on 2 touches. |
| F11 | Focal-Point Midpoint Zoom Math | R3 | Test pinch in zooms out, pinch out zooms in, clamped to [0.4, 1.4], focal anchor preserved. |
| F12 | Touch Isolation & Single-Finger Pan | R3, R5 | Test single-finger touch pan operates natively without triggering zoom. |
| F13 | Accidental Card Click Suppression | R3, R5 | Test that finishing a pinch gesture does not trigger member detail card click. |
| F14 | UI Animations & Reduced Motion | R4, R5 | Test CSS transitions, cubic-bezier timing, and data-motion="reduce" disabling. |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E-1 | Test Infra & Tier 1 Feature Coverage | Setup test runner, create `TEST_INFRA.md`, write Tier 1 tests (>=5 per feature). | none | IN_PROGRESS |
| E2E-2 | Tier 2 Boundary & Corner Cases | Write boundary tests (320px screens, rapid pinch, orientation change, extremes). | E2E-1 | PLANNED |
| E2E-3 | Tier 3 Cross-Feature & Tier 4 Real-World | Write pairwise combinations and realistic mobile user journeys. | E2E-2 | PLANNED |
| E2E-4 | Publish TEST_READY.md | Validate complete test suite runs and passes (or fails cleanly on unimplemented features), output `TEST_READY.md`. | E2E-3 | PLANNED |

## Code Layout
- Test Suite File: `tests/e2e-mobile-ux.test.mjs`
- Test Infra Documentation: `TEST_INFRA.md` (project root)
- Test Ready Signal: `TEST_READY.md` (project root)
