# DISPATCH: Milestone M1 Sub-orchestrator

## Mission
Orchestrate Milestone M1: Collapsible Mobile Navigation Bar on scroll (R1, F1-F4, F14).
Run the iteration loop (Explorer → Worker → Reviewer → Challenger → Auditor → Gate) to completion.

## Scope & Inputs
- Scope Document: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\sub_orch_m1\SCOPE.md`
- Project Document: `c:\B-Tech 1st year\Family Tree\PROJECT.md`
- Original Request: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md`
- Working Directory: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\sub_orch_m1`

## Key Requirements
- On mobile viewports, scrolling up collapses top nav, scrolling down reveals it.
- Hysteresis (12px), top boundary guard (scrollY <= 10px), popover open guard, focus-within guard.
- All buttons remain fully interactive when visible.
- Preserve all 109 tests in `tests/e2e-navigation.test.mjs`.
- Deliver clean gate pass with Reviewer APPROVE and Auditor CLEAN verdicts.
- Notify parent orchestrator via `send_message` when milestone gate passes.
