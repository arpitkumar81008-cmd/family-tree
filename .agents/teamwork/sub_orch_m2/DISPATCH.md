# DISPATCH: Milestone M2 Sub-orchestrator

## Mission
Orchestrate Milestone M2: Full-Screen Family Tree View Mode (R2, F5-F9, F14).
Run the iteration loop (Explorer → Worker → Reviewer → Challenger → Auditor → Gate) to completion.

## Scope & Inputs
- Scope Document: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\sub_orch_m2\SCOPE.md`
- Project Document: `c:\B-Tech 1st year\Family Tree\PROJECT.md`
- Original Request: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md`
- Working Directory: `c:\B-Tech 1st year\Family Tree\.agents\teamwork\sub_orch_m2`

## Key Requirements
- Full-screen viewing mode on mobile for family tree canvas utilizing full viewport width/height (`100dvw`/`100dvh`).
- Dedicated toggle controls in `CanvasDock` and floating canvas toggle button.
- Escape key and exit button cleanly restore standard layout and pan/zoom coordinates.
- Ensure modal sheets (`z-index: 999`) and settings remain above full-screen canvas (`z-index: 800`).
- Translation keys added to both `en.js` and `hi.js` maintaining 100% dictionary key parity.
- Deliver clean gate pass with Reviewer APPROVE and Auditor CLEAN verdicts.
- Notify parent orchestrator via `send_message` when milestone gate passes.
