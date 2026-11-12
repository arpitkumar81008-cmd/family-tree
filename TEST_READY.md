# Test Suite Readiness: Mobile UX Enhancements

## Test Suite Status: READY & PUBLISHED
The opaque-box E2E test suite for **Family Tree Mobile UX Enhancements** has been authored, verified, and published to `tests/e2e-mobile-ux.test.mjs`.

## Tier Breakdown & Test Counts

| Tier | Name | Target Minimum | Implemented Count | Current Status |
|------|------|----------------|-------------------|----------------|
| **Tier 1** | Feature Coverage | >= 20 tests (>=5 / feature) | **26 tests** | 22 PASS / 4 AWAITING IMPL |
| **Tier 2** | Boundary & Corner Cases | >= 20 tests (>=5 / feature) | **24 tests** | 24 PASS / 0 FAIL |
| **Tier 3** | Cross-Feature Interactions | >= 4 tests (pairwise) | **8 tests** | 7 PASS / 1 AWAITING IMPL |
| **Tier 4** | Real-World Mobile Scenarios | >= 5 tests | **6 tests** | 6 PASS / 0 FAIL |
| **TOTAL** | | **>= 49 tests** | **64 tests** | **59 PASS / 5 AWAITING IMPL** |

## Feature Coverage Matrix

| Feature | Requirement | Tier 1 Tests | Tier 2 Boundaries | Tier 3 Pairwise | Tier 4 Scenarios | Total Tests |
|---------|-------------|--------------|-------------------|-----------------|------------------|-------------|
| **R1** | Collapsible Mobile Navigation Bar | 6 (`T1-R1-01`..`06`) | 6 (`T2-R1-01`..`06`) | 3 (`T3-PAIR-01,03,05`) | 2 (`T4-SCEN-01,04`) | **17** |
| **R2** | Full-Screen Family Tree View Mode | 7 (`T1-R2-01`..`07`) | 6 (`T2-R2-01`..`06`) | 5 (`T3-PAIR-01,02,04,06,07`) | 3 (`T4-SCEN-01,02,06`) | **21** |
| **R3** | Pinch-to-Zoom Gesture Controls | 7 (`T1-R3-01`..`07`) | 6 (`T2-R3-01`..`06`) | 3 (`T3-PAIR-02,03,08`) | 3 (`T4-SCEN-01,03,05`) | **19** |
| **R4** | UI Animations & GPU Compositing | 6 (`T1-R4-01`..`06`) | 6 (`T2-R4-01`..`06`) | 2 (`T3-PAIR-04,05`) | 2 (`T4-SCEN-01,02`) | **16** |
| **R5** | Non-Regression & Viewport Ergonomics | *Covered across all* | *Covered across all* | *Covered across all* | *Covered across all* | **64** |

## Baseline Test Execution Results

Command executed:
```powershell
node --test tests/e2e-mobile-ux.test.mjs
```

### Result Summary
- **Total Tests**: 64
- **Suites**: 13
- **Passed**: 59
- **Failed**: 5 (Precise, clean contract-driven failures awaiting M1 & M2 implementation)
- **Duration**: ~2.5 seconds

### In-Progress Contract Tracking (5 Awaiting Implementation)
These 5 tests serve as the authoritative acceptance criteria for upcoming milestones:
1. `T1-R1-01`: Top bar collapses when scrolling upwards on mobile (`src/styles/landing.css` requires `.site-nav.is-collapsed` rule) — **Assigned to Milestone M1**.
2. `T1-R2-01`: Full-Screen mode toggle enters `.is-fullscreen` on `.treewrap-host` container (`src/components/Canvas.jsx` requires `isFullscreen` prop support) — **Assigned to Milestone M2**.
3. `T1-R2-03`: Full-screen sizing: `.treewrap-host.is-fullscreen` occupies full viewport dimensions in CSS (`src/styles/tree.css` requires fixed viewport rules) — **Assigned to Milestone M2**.
4. `T1-R2-07`: Bilingual translation key parity for full-screen mode in `en.js` and `hi.js` (`fullscreenEnter`, `fullscreenExit`, etc.) — **Assigned to Milestone M2**.
5. `T3-PAIR-06`: Fullscreen toggle button displays correct bilingual labels in English and Hindi — **Assigned to Milestone M2**.

### Existing Suite Non-Regression Verification
Command executed:
```powershell
node --test tests/e2e-navigation.test.mjs
```
- **Passed**: 109 / 109 (100% PASS, 0 failures, 0 regressions)
- **Duration**: ~3.8 seconds

## How to Verify
To run both test suites:
```powershell
node --test tests/*.test.mjs
```
