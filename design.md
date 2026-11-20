# Apple UI/UX Design Specification (`design.md`)

> A practical, engineering-ready reference translating **Apple’s Human Interface Guidelines (HIG)** and modern macOS / iOS / Liquid Glass craft into concrete tokens, component rules, motion physics, and accessibility standards for **VanshVriksha**.

---

## 1. Design Philosophy

Apple’s interface craft rests on four non-negotiable pillars:

1. **Clarity**
   - Every element earns its pixel budget. Typography is legible at every scale, icons are crisp and unambiguous, and generous whitespace replaces boxes and borders.
   - Users should understand hierarchy, state, and primary actions in under one second.

2. **Deference**
   - Chrome recedes so the user’s content (the family tree canvas, portraits, and relationships) commands the viewport.
   - Navigation bars, toolbars, and floating controls use translucent glass materials rather than heavy opaque slabs.

3. **Depth**
   - Distinct visual layers (canvas -> cards -> floating toolbars -> popovers -> sheets/modals) communicate spatial relationships through subtle elevation, specular hairlines, and blur rather than drop-shadow noise.

4. **Direct Manipulation**
   - Interactions feel physical and immediate: smooth pan/zoom, spring-driven sheets, tactile press states (`scale(0.97)`), and predictable undo/redo.

---

## 2. Materials, Vibrancy & Liquid Glass

Apple interfaces avoid flat opaque overlays on top of dynamic canvases. Instead, floating chrome uses layered translucent materials with high backdrop saturation and a specular inner edge highlight.

### Material Tiers

| Tier | Surface Use | Light Mode | Dark Mode | Backdrop Filter |
| :--- | :--- | :--- | :--- | :--- |
| **Ultra-Thin Glass** | Floating canvas pills, zoom controls, badges | `rgba(255, 255, 255, 0.62)` | `rgba(28, 28, 30, 0.58)` | `blur(20px) saturate(180%)` |
| **Regular Glass** | Top navigation bar, floating toolbar, mobile dock | `rgba(251, 250, 247, 0.78)` | `rgba(22, 24, 24, 0.76)` | `blur(24px) saturate(190%)` |
| **Thick Material** | Sheets, popovers, inspector panels, modals | `rgba(255, 255, 255, 0.90)` | `rgba(28, 30, 32, 0.88)` | `blur(32px) saturate(180%)` |
| **Scrim** | Modal backdrop | `rgba(15, 23, 42, 0.36)` | `rgba(0, 0, 0, 0.62)` | `blur(6px)` |

### Specular Edge & Elevation Rule
- Every glass surface carries a `1px` hairline border (`rgba(255, 255, 255, 0.45)` in light mode, `rgba(255, 255, 255, 0.12)` in dark mode) plus an inset top highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.55)` in light mode) so edges catch light cleanly over any background.
- Always provide an `@supports not (backdrop-filter: blur(1px))` opaque fallback for older browsers.

---

## 3. Semantic Color System

Apple systems rely on a restrained neutral foundation, strict semantic contrast roles, and a single purposeful accent color.

### Surface & Ink Hierarchy

| Token Role | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| Canvas Background (`--bg`) | `#F5F5F7` (or warm `#F6F4EF`) | `#0B0D0E` | Primary app canvas & page ground |
| Secondary Surface (`--surface`) | `#FFFFFF` | `#16191B` | Cards, grouped lists, elevated containers |
| Tertiary Surface (`--surface-elevated`) | `#F2F2F7` | `#222629` | Inputs, segmented tracks, hover fills |
| Primary Ink (`--ink`) | `#1D1D1F` | `#F5F5F7` | Headings, primary labels, member names |
| Secondary Ink (`--muted`) | `#6E6E73` | `#98989D` | Captions, metadata, helper copy |
| Hairline Separator (`--border-subtle`) | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.11)` | Dividers, card hairlines, toolbar rules |
| Primary Accent (`--accent`) | `#B91C3B` (Heritage Crimson) | `#FF4560` | Primary CTAs, active tabs, focus rings |
| Destructive | `#FF3B30` | `#FF453A` | Delete member, revoke access |
| Positive / Synced | `#34C759` | `#30D158` | Cloud synced badge, confirmations |
| Warning | `#FF9500` | `#FF9F0A` | Offline / pending states |

### Dark Mode Principles
- Never simply invert light-mode colors.
- Communicate elevation by making higher layers **slightly lighter** (`#0B0D0E` canvas -> `#16191B` card -> `#222629` popover/sheet) instead of relying on heavy black shadows.
- Slightly desaturate or brighten accents (`#B91C3B` -> `#FF4560`) so they pass WCAG AA contrast on dark surfaces.

---

## 4. Typography & Bilingual Hierarchy

Apple typography emphasizes optical clarity, tight display tracking, generous body readability, and tabular alignment for numbers.

### Font Stack
- **UI / System Body:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Familjen Grotesk", "Hind", system-ui, sans-serif`
- **Display / Editorial Headings:** `"SF Pro Display", "Fraunces", "Tiro Devanagari Hindi", Georgia, serif`
- **Devanagari / Hindi:** `"Tiro Devanagari Hindi", "Hind", "Noto Sans Devanagari", sans-serif`

### Type Scale & Tracking

| Role | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| Large Title (Hero) | `clamp(2rem, 4vw, 3.25rem)` | `700` | `1.08` | `-0.03em` |
| Section Title | `1.5rem` (`24px`) | `650` | `1.2` | `-0.022em` |
| Sheet / Modal Title | `1.125rem` (`18px`) | `600` | `1.25` | `-0.015em` |
| Body | `0.9375rem` (`15px`) | `400` | `1.47` | `-0.01em` |
| Control / Button | `0.875rem` (`14px`) | `550` | `1.2` | `-0.008em` |
| Caption / Metadata | `0.75rem` (`12px`) | `500` | `1.33` | `0em` |
| Micro Badge | `0.6875rem` (`11px`) | `600` | `1.2` | `+0.02em` |

### Typographic Rules
- Use `font-variant-numeric: tabular-nums;` on counters, years, generation numbers, zoom percentages, and timestamps so values never jitter when updating.
- Apply `-webkit-font-smoothing: antialiased;` and `text-rendering: optimizeLegibility;`.
- Avoid trailing periods on buttons, headings, and short UI labels.
- Keep Devanagari line-height slightly taller (`>= 1.35`) so matras and conjuncts never clip.

---

## 5. Spatial Grid & Concentric Geometry

### Spacing Scale (4px / 8px System)
- Base unit: `4px` (`--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 20px`, `--space-6: 24px`, `--space-8: 32px`, `--space-10: 40px`).
- Never crowd controls against container edges: minimum `12px`–`16px` padding in compact sheets/popovers, `20px`–`24px` in modals.

### Concentric Corner Radii
To match Apple’s visual smoothness, nested elements must follow the concentric formula:

$$\text{innerRadius} = \max(4\text{px},\; \text{outerRadius} - \text{padding})$$

| Element | Recommended Radius |
| :--- | :--- |
| Full Pill (Buttons, Segmented Pills, Chips) | `9999px` |
| Modal / Sheet Container | `20px` (`24px` on mobile bottom sheet top corners) |
| Popover / Floating Toolbar | `16px` |
| Card / Grouped List Container | `14px` |
| Input / Inner Row / Sub-button | `10px` |
| Compact Badge / Tag | `6px` |

---

## 6. Motion & Spring Physics

Apple animations are **fast to respond, smooth to settle, and never sluggish**. Avoid linear or generic ease-in-out curves for UI transitions.

### Motion Tokens

```css
:root {
  /* Fluid Apple-like spring curves */
  --ease-apple-spring: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-apple-snappy: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-apple-sheet: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-apple-bounce: cubic-bezier(0.34, 1.4, 0.64, 1);

  /* Durations */
  --dur-instant: 110ms;   /* Press state, hover tint */
  --dur-fast: 180ms;      /* Popovers, segmented thumb, toggles */
  --dur-normal: 280ms;    /* Sheets, modals, panel transitions */
  --dur-slow: 420ms;      /* Canvas focus pan/zoom settle */
}
```

### Interaction Rules
- **Tactile Press:** Primary buttons and interactive pills subtly compress on `:active` (`transform: scale(0.97)`) and release with `--ease-apple-spring`.
- **No Layout-Thrashing Animations:** Animate only `transform`, `opacity`, and `filter` / `box-shadow` where needed.
- **Reduced Motion:** Respect `@media (prefers-reduced-motion: reduce)` by collapsing slide/scale transitions to instant opacity crossfades.

---

## 7. Core UI Patterns & Components

### A. Navigation Bar & Segmented Control
- Translucent floating or sticky top bar (`Regular Glass`) with a hairline bottom border.
- Primary mode switcher uses an Apple-style **Segmented Control**: a rounded pill track (`--surface-elevated`) with an elevated active pill (`--surface` + subtle shadow).
- Keep top-level actions minimal; move secondary preferences into a clean contextual **Popover**.

### B. Floating Canvas Toolbar
- Detached from edges with `12px`–`16px` inset margins, rounded pill/capsule silhouette, `Regular Glass` material, and a soft multi-layer ambient shadow.
- Group related actions with subtle `1px` vertical dividers (`height: 18px`, `opacity: 0.15`).

### C. Sheets & Modals
- **Desktop:** Centered modal (`border-radius: 20px`) or right-anchored inspector sheet (`Thick Material`, `width: 360px–420px`) with a sticky translucent header and footer.
- **Mobile:** Bottom-anchored sheet (`border-radius: 24px 24px 0 0`) with a centered `36px × 5px` grabber pill at the top and safe-area bottom padding (`env(safe-area-inset-bottom)`).
- Always include a clear close button (`32px × 32px` circular subtle fill) and `Escape` key dismissal.

### D. Popovers
- Compact, anchored floating panels (`border-radius: 16px`, `Thick Material`, crisp hairline border, ambient shadow).
- Grouped inset rows (`padding: 10px 12px`, `border-radius: 10px`) with subtle hover fill and trailing controls (switches, segmented toggles, checkmarks).

### E. Form Controls & Grouped Lists
- Group related fields inside softly rounded inset sections (`--surface`) separated by hairline dividers that indent past leading icons/labels.
- Inputs have a quiet filled background (`--surface-elevated`), `10px` radius, no heavy resting border, and a crisp `3px` translucent accent focus ring on `:focus-visible`.

### F. Family Tree Cards & Canvas Connectors
- Keep card surfaces clean, calm, and high-contrast: soft tinted surfaces with `1px` hairline borders, crisp circular portrait avatars, and clear visual emphasis only on hover, selection, or highlighted lineage paths.
- Keep connector lines understated at rest (`1.25px`–`1.5px`) and elevate active/traced kinship paths cleanly.

---

## 8. Accessibility & Craft Checklist

- **Contrast:** Minimum `4.5:1` for body text and controls; `3:1` for large text and non-text UI indicators (both Light and Dark modes).
- **Touch Targets:** Minimum `44px × 44px` interactive hit area on touch devices (even if the visual icon is `18px`–`20px`).
- **Keyboard Navigation:** Visible `:focus-visible` rings (`0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent)`), logical tab order, focus trapping inside open modals, and `Escape` to dismiss.
- **No Emoji Clutter:** Rely on crisp monochrome vector icons (SF Symbols-style `1.75px` stroke weight, rounded caps/joins) instead of mixed-style emojis.
- **Safe Areas:** Honor `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` on mobile navbars, bottom docks, and sheets.

---

## 9. VanshVriksha Implementation Notes & Invariants

When applying this specification to the VanshVriksha codebase:

- **Primary Files to Evolve:**
  - `src/styles/tokens.css` — Material glass tokens, semantic light/dark surfaces, Apple spring curves, concentric radii.
  - `src/styles/components.css` — Segmented navbar tabs, floating toolbar, sheets, modals, popovers, inputs, and mobile bottom dock.
  - `src/styles/tree.css` — Card surface polish, hairline borders, focus/selection rings, and canvas controls.
  - `src/styles/landing.css` — Editorial hero typography, calm whitespace, and frosted feature cards.
- **Engineering Invariants to Preserve:**
  - **Card Geometry (`96×138` default):** Do not alter base card dimensions without updating `src/layout/engine.js` orthogonal SVG connector geometry.
  - **Navbar Collapse Contract:** Preserve `aria-hidden={isCollapsed}` on `<nav>` and `.site-nav.is-collapsed` (`pointer-events: none; transform: translateY(-100%); opacity: 0;`).
  - **Bilingual Parity:** Maintain 100% key parity between `src/i18n/en.js` and `src/i18n/hi.js`.
  - **Existing User Data & Tests:** Keep all Firestore schemas, local cache contracts, and the existing automated test suite (`npm test`) passing at 100%.
