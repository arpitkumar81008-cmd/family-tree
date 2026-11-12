# DISPATCH for Explorer M1-1

## Identity
- Role: Explorer M1-1 (Navbar Component State & Scroll Listener Architecture)
- Working Directory: c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_1

## Objective
Analyze `src/components/Navbar.jsx` for Milestone M1 (Collapsible Mobile Navigation Bar):
1. Recommend the exact React state, refs, and scroll listener architecture:
   - Detect mobile viewport (`window.innerWidth <= 768` or `:root[data-viewport="mobile"]`).
   - Scrolling upwards (finger moving up, scrollY increasing into page): collapse `.site-nav`.
   - Scrolling downwards (finger moving down, scrollY decreasing toward top): reveal `.site-nav`.
   - Hysteresis threshold: 12px deadzone.
   - Top-of-page boundary guard: if `currentScrollY <= 10px`, always keep visible.
   - Guard against collapsing when Settings popover is open (`isSettingsOpen`).
   - Guard against collapsing when any element has focus (`:focus-within`).
   - Complete SSR safety (`typeof window !== 'undefined'`) and event cleanup in `useEffect`.
2. Ensure DOM structure, aria attributes (`aria-hidden={isCollapsed}`), and test selectors remain 100% intact.

## Inputs
- PROJECT.md: c:\B-Tech 1st year\Family Tree\PROJECT.md
- ORIGINAL_REQUEST.md: c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope: c:\B-Tech 1st year\Family Tree\.agents\teamwork\sub_orch_m1\SCOPE.md

## Deliverable
Write your detailed implementation strategy to `c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m1_1\handoff.md` and message the parent orchestrator.
