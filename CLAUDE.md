# Gupta Family Tree & Lineage Platform — Design System & Engineering Rules

> **Living Architecture, Design Tokens, & Figma MCP Integration Guidelines**  
> **Workspace**: `c:\B-Tech 1st year\Family Tree\`  
> **Repository**: `https://github.com/arpitkumar81008-cmd/family-tree.git`  
> **Framework**: React 18 + Vite (SPA)

---

## 🏛️ Design System Structure

### 1. Token Definitions

Design tokens are defined as native CSS custom properties on `:root` and structured systematically in [`src/styles/tokens.css`](file:///c:/B-Tech%201st%20year/Family%20Tree/src/styles/tokens.css). Tokens automatically adjust for Dark Mode via `@media (prefers-color-scheme: dark)` and user theme overrides (`[data-theme="dark"]`, `[data-theme="light"]`).

#### A. Color Palette Tokens
```css
:root {
  /* Surface & Ground */
  --bg: #eceeea;           /* Archetypal warm bone-white background */
  --surface: #f8f9f6;      /* Elevated white card & dialog surface */
  --ink: #0a0f0d;          /* Near-black authoritative ink typography */
  --muted: #4a524e;        /* Balanced slate gray for secondary labels */
  --line: #b9beb8;         /* Hairline gray divider & subtle border */

  /* Branching & Flowchart Connections */
  --branch: #0a0f0d;       /* Standard generational flowchart stroke */
  --main-branch: #e4002b;  /* Primary bloodline lineage connector (Badri Prasad) */
  --other-branch: #4a524e; /* In-law & secondary lineage connector (slate dashed) */
  --bridge-line: #4a524e;  /* Inter-branch marital bus bridge connector */

  /* Accents & Cultural Kinship */
  --accent: #e4002b;       /* Editorial crimson for focus & primary CTAs */
  --rel: #c20024;          /* Cultural kinship badges (Chacha, Bua, Tauji, etc.) */
  --scrim: rgba(10, 15, 13, 0.6); /* Backdrop overlay scrim */
  --av: #dce0da;           /* Avatar placeholder background */
}
```

Dark Mode Overrides (`[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`):
```css
:root[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0b0f0d;
    --surface: #121816;
    --ink: #f1f3ee;
    --muted: #a3aba6;
    --line: #2c3531;
    --branch: #f1f3ee;
    --main-branch: #ff4560;
    --other-branch: #8e9792;
    --bridge-line: #8e9792;
    --accent: #ff4560;
    --rel: #ff6b80;
    --scrim: rgba(0, 0, 0, 0.75);
    --av: #1e2622;
  }
}
```

#### B. Typography Tokens
```css
:root {
  --display: "Bodoni Moda", "Tiro Devanagari Hindi", Georgia, serif;
  --body: "Familjen Grotesk", "Hind", system-ui, -apple-system, "Segoe UI", sans-serif;
  --deva: "Tiro Devanagari Hindi", "Noto Serif Devanagari", Georgia, serif;
}
```
- **Display font (`--display`)**: High-contrast modern serif used for the hero title, landing page headings, and family cards.
- **Body font (`--body`)**: Technical grotesque used for UI labels, search bar, buttons, and metadata.
- **Devanagari font (`--deva`)**: Premium Devanagari serif used for Hindi typography and honorific badges.
- **Numerics**: Monospace tabular numbers (`font-variant-numeric: tabular-nums`) for dates, ages, and counters.

#### C. Geometry & Spacing Tokens
- **Corner Curvature**: Small, refined radii — not round, not sharp:
  ```css
  --radius-xs: 4px;   /* Buttons, inputs, pills, chips, tags */
  --radius-sm: 5px;   /* EXACT 5px border-radius for family member cards */
  --radius-md: 6px;   /* Modal dialogs, sheets, and popovers */
  --radius-lg: 10px;  /* Landing hero containers */
  ```
- **Spatial Grid Units**:
  - `CARD_W = 96px`, `CARD_H = 138px`
  - `COUPLE_GAP = 16px`, `SIBLING_GAP = 20px`, `ROW_GAP = 84px`, `SECTOR_GAP = 60px`
  - Zero diagonal or overlapping lines; strictly Manhattan orthogonal paths.

---

## 🧩 Component Library

Components are implemented as modular, functional React components in [`src/components/`](file:///c:/B-Tech%201st%20year/Family%20Tree/src/components/):

1. **`Navbar.jsx`**:
   - Modern sticky navigation bar with editorial monogram logo, view switcher (`Home` / `Tree Canvas`), live statistics badge, and three-dot settings popover button.
2. **`LandingPage.jsx`**:
   - Modern editorial landing page featuring:
     - Hero section with live generation metrics and Dual CTAs ("Explore Gupta Family Tree" & "Create / Import Tree").
     - Interactive Feature Grid (Dual-Mode Spatial Engine, Cultural Kinship Resolver, Real-Time Transliteration, Data Sovereignty).
     - Ancestral Spotlight honoring the foundational roots (Badri Prasad & Haudi Devi).
     - Family Tree Builder preview & workflow modal.
3. **`Canvas.jsx`**:
   - High-performance, hardware-accelerated spatial canvas with pan, zoom, click-and-drag, touch-pinch support, and strictly orthogonal SVG Manhattan bus lines.
   - Floating zoom & fit control dock.
4. **`Card.jsx`**:
   - Member node card with 5px corner radius, hairline borders, avatar monogram/photo, Hindi/English names, relationship tags, and deceased honorific badge.
   - Built-in 2D spatial keyboard arrow navigation (`↑`, `↓`, `←`, `→`).
5. **`Sheet.jsx`**:
   - Slide-out profile drawer displaying complete family connections (Parents, Spouse, Children, Siblings), interactive photo uploader, quick-add relations, and directional tree launcher.
6. **`SettingsPopover.jsx`**:
   - Floating popover triggered by the `⋮` three-dot icon:
     - Language: English / हिन्दी
     - Theme: Light / Dark / System
     - Text Size: Normal / Large / Extra Large
     - High Contrast: Off / On
     - Reduced Motion: Off / On
7. **`AddModal.jsx`**:
   - Modal dialog for adding relatives (Child, Spouse, Sibling, Parent, Root) with real-time Devanagari transliteration ✨ and duplicate detection.
8. **`Tabs.jsx`**:
   - ARIA-compliant tablist housing the Kinship Resolver ("How are we related?"), Upcoming Birthdays chronicle, and JSON Backup / Export / Import.

---

## 🛠️ Frameworks & Libraries

- **Core UI**: React 18.3.1 (`react`, `react-dom`) with hooks (`useState`, `useEffect`, `useMemo`, `useRef`).
- **Build System**: Vite 6.0.7 with `@vitejs/plugin-react` and ECMAScript modules (`"type": "module"`).
- **Styling Architecture**: Vanilla modular CSS utilizing CSS Custom Properties, flexbox, CSS Grid, and zero external runtime overhead (no Tailwind or CSS-in-JS runtimes).
- **Transliteration Engine**:
  - Primary: Google Input Tools API endpoint (`hi-t-i0-und`).
  - Fallback: Comprehensive local Sanskrit/Devanagari phonetic dictionary.

---

## 🖼️ Asset Management

- **User Photos**: Compressed and cropped client-side using HTML5 Canvas (`toDataURL("image/jpeg", 0.84)`) up to 320×320px, saved in `localStorage`.
- **Avatars**: Elegant typographic monogram generated dynamically from 2 initials.
- **Web Fonts**: Hosted via Google Fonts with `<link rel="preconnect">` for sub-100ms first paint.
- **Zero Heavy Binary Assets**: Vector SVGs and CSS geometry for all UI elements.

---

## 🔣 Icon System

All icons are high-precision SVGs or crisp typographic unicode symbols for zero layout shift:
- `⋮` : Accessibility & settings popover
- `★` : Directional tree flowchart perspective
- `+` / `−` : Zoom controls
- `⛶` : Fit to viewport
- `✨` : Automatic Hindi transliteration
- `↺` / `✕` : Reset perspective to full lineage
- `↖` : Paternal ancestry vector
- `↗` : Maternal / In-law ancestry vector
- `↓` : Descendants vector

---

## 🎨 Styling Approach & Craft Manifesto

1. **No "AI-Slop"**:
   - No generic purple gradients, neon drop shadows, or bubbly cards.
   - Crisp hairline borders (`1px solid var(--line)` or `var(--ink)`).
   - Authoritative editorial layout reminiscent of an archival historical manuscript.
2. **Exact Radii**:
   - Cards: **Exact 5px**.
   - Buttons, Pills, Chips: **Exact 4px**.
   - Modals, Drawers: **Exact 6px**.
3. **Respectful Indian Kinship**:
   - All relationships calculated with respectful honorifics in both English and parliamentary Hindi.
4. **Collision-Free Geometry**:
   - Algorithmic post-order subtree allocation guarantees zero overlapping cards.
