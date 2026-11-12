# DISPATCH for Worker M1

## Identity
- Role: Implementation Worker (Milestone M1 — Collapsible Mobile Navigation Bar)
- Working Directory: c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m1

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
- `src/components/Navbar.jsx`
- `src/styles/landing.css`

## Task Instructions
Implement Milestone M1 (Collapsible Mobile Navigation Bar on scroll) by applying the synthesized recommendations from Explorers M1-1, M1-2, and M1-3:
1. In `src/components/Navbar.jsx`:
   - Import `useEffect, useRef`.
   - Add `isCollapsed` state, `lastScrollYRef`, `tickingRef`, `rafIdRef`, `navRef`, and sync refs.
   - Implement mobile scroll listener with 12px hysteresis deadzone, 10px top boundary guard, settings open guard, and focus guard.
   - Attach `ref={navRef}`, `aria-hidden={isCollapsed}`, `onFocus={handleFocus}`, and class `${isCollapsed ? ' is-collapsed' : ''}` to `<nav className="site-nav">`.
   - Reference implementation available at: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_1\proposed_Navbar.jsx`.
2. In `src/styles/landing.css`:
   - Update `.site-nav` (lines 4-18) to include `transform: translateY(0); opacity: 1; will-change: transform, opacity; transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;`.
   - Add `.site-nav.is-collapsed` (`transform: translateY(-100%); opacity: 0; pointer-events: none;`).
   - Add `.site-nav:focus-within` (`transform: translateY(0) !important; opacity: 1 !important; pointer-events: auto !important;`).
   - Add laptop mode safeguard (`:root[data-viewport="laptop"] .site-nav.is-collapsed`).
   - Add reduced-motion compliance (`:root[data-motion="reduce"] .site-nav`, `@media (prefers-reduced-motion: reduce)`).
   - PRESERVE lines 1034-1061 (`:root[data-viewport="mobile"] .site-nav { height: auto; flex-wrap: wrap; ... }`) and lines 1111-1133 completely intact for test assertions.
   - Reference patch available at: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_2\landing_css_m1.patch`.

## Verification Commands
After implementing:
1. Run `node --test tests/e2e-mobile-ux.test.mjs` — verify `T1-R1-01` passes!
2. Run `npm test` (`node --test tests/e2e-navigation.test.mjs`) — verify all 109 tests pass!
3. Run `npm run build` — verify Vite build succeeds with exit code 0!

Write your handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m1\handoff.md` with build and test outputs, and notify parent orchestrator via `send_message`.


## 2026-11-09T13:39:39Z
You are the Implementation Worker for Milestone M1 (Collapsible Mobile Navigation Bar).
Your working directory is: c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m1
Read your dispatch assignment at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m1\DISPATCH.md
Read the original user request at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master document at: c:\B-Tech 1st year\Family Tree\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `src/components/Navbar.jsx`
- `src/styles/landing.css`

Inputs & References from Explorers:
- Proposed Navbar component: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_1\proposed_Navbar.jsx`
- Navbar State report: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_1\handoff.md`
- CSS Patch & report: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_2\landing_css_m1.patch` and `handoff.md`
- Interactive element verification: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_3\handoff.md`

Tasks:
1. Update `src/components/Navbar.jsx` with mobile scroll hysteresis listener, boundary guards, and dynamic classes.
2. Update `src/styles/landing.css` with `.site-nav.is-collapsed`, GPU transitions, focus-within protection, and reduced-motion compliance (preserving lines 1034-1061 intact).
3. Run `node --test tests/e2e-mobile-ux.test.mjs` (verify T1-R1-01 passes).
4. Run `npm test` (verify all 109 navigation tests pass).
5. Run `npm run build` (verify build succeeds).
6. Document results and write handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m1\handoff.md`.
7. Notify parent orchestrator via send_message when complete.
