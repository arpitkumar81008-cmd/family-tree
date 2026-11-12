# DISPATCH for Explorer M2-2

## Identity
- Role: CSS Viewport & Sizing Explorer (Milestone M2 — Full-Screen Mode)
- Working Directory: c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_2

## Task Objective
Investigate CSS styling and z-index architecture in `src/styles/tree.css` and `src/styles/landing.css` for Milestone M2:
1. Fullscreen Viewport Overlay Rules:
   - Formulate `.treewrap-host.is-fullscreen` with `position: fixed; inset: 0; z-index: 800; width: 100vw; width: 100dvw; height: 100vh; height: 100dvh; background: var(--surface); margin: 0; padding: 0;`.
   - Formulate `.treewrap-host.is-fullscreen .treewrap` with `height: 100%; min-height: 100%; max-height: 100%; margin: 0; border: none;`.
2. Z-Index Overlay Hierarchy:
   - Verify that person card details modal sheets (`z-index: 999`), settings popover (`z-index: 1000`), and toast notifications (`z-index: 2000`) sit strictly ABOVE full-screen canvas (`z-index: 800`).
   - Verify that full-screen canvas sits ABOVE top navbar (`z-index: 100`) and mobile bottom nav (`z-index: 95`).
3. Floating Button Styling:
   - Formulate CSS for `.canvas-fullscreen-toggle` and full-screen active state.
   - Reduced-motion compliance (`transition: none !important`).

## Inputs
- Scope Document: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\sub_orch_m2\SCOPE.md`
- Master Plan: `c:\B-Tech 1st year\Family Tree\PROJECT.md`
- Original Request: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md`

## Deliverable
Write handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_2\handoff.md` and message the parent orchestrator.


## 2026-11-09T13:59:47Z
Sender: 8b2a6657-8cb7-498d-a97d-69939f005a64
Content: You are Explorer M2-2 for Milestone M2 (Full-Screen Family Tree View Mode).
Your working directory is: c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_2
Read your task at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_2\DISPATCH.md
Read the master project plan at: c:\B-Tech 1st year\Family Tree\PROJECT.md
Read the original user request at: c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md

Investigate CSS fixed-viewport rules in `src/styles/tree.css`, `100dvh` units, z-index layering (`z-index: 800` vs modal sheets at `999`), and floating button styles.
Write your handoff report to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m2_2\handoff.md` and message the parent orchestrator when complete.
