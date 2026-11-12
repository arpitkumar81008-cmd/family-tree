## 2026-11-09T14:43:59Z
You are Worker M3 for Milestone M3 (Pinch-to-Zoom Touch Gestures & Tree Pan Smoothness).
Your working directory is: c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m3
You MUST write all your notes and handoff.md inside your working directory.

MANDATORY: Read the original user request before starting work:
c:\B-Tech 1st year\Family Tree\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- c:\B-Tech 1st year\Family Tree\PROJECT.md
- c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m3_1\handoff.md
- c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m3_2\handoff.md
- c:\B-Tech 1st year\Family Tree\.agents\teamwork\explorer_m3_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You exclusively own:
- `src/components/Canvas.jsx`
- `src/styles/tree.css` (specifically adding `-webkit-overflow-scrolling: touch;` to `.treewrap`)
DO NOT modify `src/App.jsx`, `src/components/Navbar.jsx`, or any file in `tests/`.

Implementation Requirements:
1. `src/styles/tree.css`:
   - Add `-webkit-overflow-scrolling: touch;` to `.treewrap`.
2. `src/components/Canvas.jsx`:
   - Import `saveCanvasZoom` in addition to `saveCanvasPan` from `../utils/storage.js`.
   - Implement the complete touch pinch-to-zoom engine on `.treewrap` (`containerRef.current`):
     - Attach non-passive `{ passive: false }` listeners for `touchstart`, `touchmove`, `touchend`, `touchcancel`.
     - Crucial gesture isolation: call `e.preventDefault()` ONLY when `e.touches.length === 2`. Single-finger touches (`e.touches.length === 1`) must NOT call `preventDefault()`, allowing native momentum scrolling to work unimpeded.
     - Midpoint-anchored focal zoom math:
       - Distance $D = \text{Math.hypot}(x_2 - x_1, y_2 - y_1)$
       - Midpoint $M_x = (x_1 + x_2)/2 - rect.left$, $M_y = (y_1 + y_2)/2 - rect.top$
       - Division-by-zero safety: if $D_0 \le 0.0001$, ratio is $1.0$ (avoid NaN)
       - Zoom ratio: $Z_{next} = \min(1.4, \max(0.4, Z_{prev} \times (D_{curr} / D_0)))$
       - Focal scroll anchor: $SL_{next} = \max(0, \text{stageAnchor.x} \times Z_{next} - M_x)$ and $ST_{next} = \max(0, \text{stageAnchor.y} \times Z_{next} - M_y)$
     - RAF batching: throttle DOM and zoom updates using `requestAnimationFrame` to guarantee 60fps and avoid layout thrashing.
     - Persistence: sync with `saveCanvasZoom(finalZoom)` and `saveCanvasPan({ scrollLeft, scrollTop })` in `touchend` (never write to localStorage during `touchmove`).
     - Accidental card click suppression: maintain `hasPinched` flag in ref for 120ms debounce after `touchend`, attach capture-phase click interceptor on `containerRef` (`el.addEventListener('click', handleClickCapture, { capture: true })`), and guard card `onClick` with `if (!panRef.current.hasDragged && !pinchRef.current.hasPinched)`.
     - Layout dimension fallback: in the `.sizer` style, use `(layout?.W || layout?.totalWidth || 0) * zoom` to avoid NaN warnings in tests/SSR.
3. Verification:
   - `node --test tests/e2e-mobile-ux.test.mjs`
   - `npm test`
   - `npm run build`
   - `node --test tests/*.test.mjs`
4. Document full results in `c:\B-Tech 1st year\Family Tree\.agents\teamwork\worker_m3\handoff.md`.
5. Send completion message back.
