# DISPATCH for E2E Test Writer

## Identity
- Role: E2E Test Writer (Mobile UX Test Suite)
- Working Directory: c:\B-Tech 1st year\Family Tree\.agents\teamwork\test_writer_e2e

## Mission
Design and implement the comprehensive, opaque-box E2E test suite for Mobile UX Enhancements across Tiers 1-4.
Publish `TEST_INFRA.md` and `TEST_READY.md` at project root upon completion.

## Inputs
- PROJECT.md: c:\B-Tech 1st year\Family Tree\PROJECT.md
- ORIGINAL_REQUEST.md: c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md
- Existing test suite reference: `tests/e2e-navigation.test.mjs`

## Test Methodology (Opaque-Box & Requirement-Driven)
The test suite must be saved to `tests/e2e-mobile-ux.test.mjs` and runnable via `node --test tests/e2e-mobile-ux.test.mjs`.
Follow the 4-tier methodology:
1. **Tier 1 — Feature Coverage (>=5 tests per feature, minimum 20 tests)**:
   - R1: Collapsible Top Navigation Bar (5 tests: scroll up collapse, scroll down reveal, hysteresis threshold, top boundary guard, button preservation).
   - R2: Full-Screen Family Tree Mode (5 tests: toggle enter, toggle exit, full viewport dimensions, escape key, dock button).
   - R3: Pinch-to-Zoom Gesture Controls (5 tests: 2-finger pinch in zooms out, pinch out zooms in, zoom clamping [0.4, 1.4], midpoint anchor, 1-finger pan isolation).
   - R4: UI Animations (5 tests: navbar collapse transition, full-screen transition, dock animation, reduced-motion compliance, 60fps transform usage).
2. **Tier 2 — Boundary & Corner Cases (>=5 tests per feature, minimum 20 tests)**:
   - Extreme screen sizes (320px narrow, 414px, 768px, landscape).
   - Micro-scrolls below hysteresis threshold.
   - Rapid pinch in/out sequences.
   - Orientation changes.
   - Open settings popover during scroll.
   - Keyboard focus inside collapsed nav.
3. **Tier 3 — Cross-Feature Combinations (>=4 pairwise tests)**:
   - Fullscreen mode + Pinch-to-zoom active.
   - Fullscreen mode + Collapsible nav on mobile.
   - Fullscreen mode + Card details modal sheet open.
   - Language toggle (English/Hindi) + Fullscreen toggle labels.
4. **Tier 4 — Real-World Application Scenarios (>=5 application-level tests)**:
   - Complete smartphone user journey: navigate home -> open demo tree -> scroll down (nav collapses) -> enter full-screen mode -> pinch-to-zoom to inspect ancestors -> click member card -> close details -> exit full-screen mode -> scroll up (nav restored).
   - Bilingual mobile journey with screen rotation.
   - Authentication flow while interacting with mobile nav and full-screen canvas.

## Verification & Deliverables
1. Run `node --test tests/e2e-mobile-ux.test.mjs`.
2. Generate `TEST_INFRA.md` at project root following the prompt template.
3. Generate `TEST_READY.md` at project root with full tier summary table and feature checklist.
4. Write handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\test_writer_e2e\handoff.md`.
5. Notify parent orchestrator via `send_message`.

## 2026-11-09T13:23:42Z
From: 8b2a6657-8cb7-498d-a97d-69939f005a64
Content: You are the E2E Test Writer for the Family Tree Mobile UX Enhancements project.
Your working directory is: c:\B-Tech 1st year\Family Tree\.agents\teamwork\test_writer_e2e
Read your dispatch task at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\test_writer_e2e\DISPATCH.md
Read the master project plan at: c:\B-Tech 1st year\Family Tree\PROJECT.md
Read the original user request at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md

Task:
Design and implement the comprehensive, opaque-box E2E test suite for Mobile UX Enhancements across Tiers 1-4:
- Tier 1: Feature Coverage (>=5 tests per feature: R1, R2, R3, R4)
- Tier 2: Boundary & Corner Cases (>=5 tests per feature)
- Tier 3: Cross-Feature Interactions (pairwise combinations)
- Tier 4: Real-World Mobile User Scenarios (>=5 application-level tests)

Deliverables:
1. Write the test suite to `tests/e2e-mobile-ux.test.mjs`, utilizing the project's native node:test runner and existing helpers (`tests/helpers/ssr-runner.mjs`, `window-mock.mjs`, `dom-assert.mjs`).
2. Run `node --test tests/e2e-mobile-ux.test.mjs` and document pass/fail results.
3. Write `TEST_INFRA.md` at project root following the project pattern template.
4. Write `TEST_READY.md` at project root summarizing tier counts and feature matrix.
5. Write your handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\test_writer_e2e\handoff.md`.
6. Notify your parent orchestrator via send_message when complete.
