# Gupta Family Tree — Design System & Engineering Rules

> **Living Architecture & Design System Guidelines for AI Agents & Engineers**  
> Primary file: [`Gupta Family Tree.html`](file:///c:/B-Tech%201st%20year/Family%20Tree/Gupta%20Family%20Tree.html)

---

## 🏛️ Design System Structure

### 1. Token Definitions
All design tokens are defined as native CSS custom properties on `:root` and automatically adapted for dark mode via `@media (prefers-color-scheme: dark)`.

#### Color Tokens
| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--bg` | `#eceeea` (bone-white) | `#0b0f0d` (deep charcoal) | Canvas ground background |
| `--surface` | `#f8f9f6` (pure warm white) | `#121816` (elevated dark surface) | Cards, sheets, dialog surfaces |
| `--ink` | `#0a0f0d` (near-black ink) | `#f1f3ee` (soft off-white) | Primary typography & strong borders |
| `--muted` | `#4a524e` (slate gray) | `#a3aba6` (muted gray) | Secondary text, generation labels, subtitles |
| `--line` | `#b9beb8` (hairline gray) | `#2c3531` (hairline dark) | Subtle borders, guide lines, dividers |
| `--branch` | `#0a0f0d` | `#f1f3ee` | Flowchart SVG connector paths |
| `--accent` | `#e4002b` (editorial crimson) | `#ff4560` (vivid coral-red) | Primary action buttons, active tags, highlights |
| `--rel` | `#c20024` | `#ff6b80` | Kinship tags (Dada, Nani, Chacha, etc.) |
| `--scrim` | `rgba(10,15,13,0.6)` | `rgba(0,0,0,0.7)` | Modal & sheet backdrop overlay |
| `--av` | `#dce0da` | `#1e2622` | Avatar background placeholder |

#### Typography Tokens
```css
--display: "Bodoni Moda", "Tiro Devanagari Hindi", Georgia, serif;
--body: "Familjen Grotesk", "Hind", system-ui, -apple-system, "Segoe UI", sans-serif;
--deva: "Tiro Devanagari Hindi", "Noto Serif Devanagari", Georgia, serif;
```
- **Display font (`Bodoni Moda`)**: Reserved for title, family names on cards, modal headers.
- **Body font (`Familjen Grotesk`)**: Clean, industrial grotesque for controls, search, meta text.
- **Devanagari font (`Tiro Devanagari Hindi`, `Hind`)**: Applied automatically via `:root[lang="hi"]` for parliamentary Hindi typography.
- **Numbers**: Always rendered with tabular figures (`font-variant-numeric: tabular-nums`).

#### Spacing & Geometry Rules
- **Corners**: Subtle curvature (`border-radius: 5px` for cards, `4px` for buttons, inputs, pills, chips, and `6px` for modals/sheets). Elegant and restrained ("small curvature at the corner, not very round, not very sharp").
- **Card Size**: Width `96px`, Height `138px` (`148px` with late/badge).
- **Gaps**: `COUPLE_GAP = 16px`, `SIBLING_GAP = 20px`, `SECTOR_GAP = 60px`, `ROW_GAP = 84px`.
- **Borders**: 1px solid hairline (`border: 1px solid var(--ink)` or `var(--line)`). No heavy drop shadows; only crisp 1px ambient elevation.
- **Connectors**: Strictly orthogonal Manhattan lines (`V`, `H`, 90° right angles). No curved bezier lines. True branch integration with zero artificial "extended family" dump sections.

---

### 2. Component Library

UI components are organized as modular React functional components:

1. **Card (`.card`)**:
   - Represents an individual family member on the canvas.
   - Contains Avatar initial (`.av`), full name (`.nm`), kinship tag (`.rl`), and status badge (`.tag`).
   - Supports keyboard arrow-key 2D navigation between adjacent family members.
2. **Detail Sheet (`.sheet`)**:
   - Slides from side/bottom on mobile when a card is clicked.
   - Contains person details, Hindi translation toggle (`✨`), relatives quick-jump chips (`.chip`), photo upload, and primary action (`★ View Tree From Here`).
3. **Modal Dialog (`AddModal`)**:
   - Accessible dialog (`role="dialog"`, `aria-modal="true"`) for adding Child, Spouse, Sibling, or Parent.
   - Features background click dismissal, rapid-click protection, and duplicate name confirmation.
4. **Flowchart Canvas (`.tree`, `.canvas`, SVG `<svg>`)**:
   - Renders interactive pan/zoom SVG canvas with smooth cubic bezier connectors.
5. **Control Bar (`.bar`)**:
   - Flexbox container housing Search (`#search`), Relation Selector (`#viewer`), Reset (`.reset-btn`), Zoom controls (`.zoom`), Add Member button (`.btn`), and the Three-Dot Accessibility & Settings Popover Menu (`.settings-btn`, `⋮`).
   - The Three-Dot Popover Menu centralizes:
     - Language toggle (English / हिन्दी)
     - Theme selector (Light / Dark / System)
     - Text size scaling (Default / Large / XL)
     - High contrast mode (Off / On)
     - Reduced motion mode (Off / On)
     - Full keyboard accessibility (`Escape` dismissal, focus-visible outlines, click-outside handling).
6. **Tabs (`.tabs`, `.tab`, `.panel`)**:
   - ARIA-compliant tablist (`role="tablist"`, `role="tab"`, `role="tabpanel"`) for tools:
     - "How are we related?" relation finder
     - Upcoming birthdays
     - Backup & restore (JSON export/import)

---

### 3. Frameworks & Libraries

- **UI Framework**: React 18 (`react`, `react-dom/client`) using functional components and hooks (`useState`, `useEffect`, `useRef`, `useMemo`).
- **Styling**: Pure CSS with CSS Custom Properties. Zero heavy CSS frameworks (no Tailwind, no Bootstrap).
- **Bundler**: Parcel v2 (`@parcel/transformer-js`) with inlined single-file production HTML deliverable.
- **Dual-Engine Transliteration**:
  - Online: Google Input Tools API for phonetic English-to-Hindi conversion.
  - Offline fallback: Built-in Sanskrit/Hindi phonetic Devanagari dictionary and character mapping engine.

---

### 4. Asset Management

- **User Photos**: Converted to base64 `data:image/...` strings client-side, cropped square, and stored in browser `localStorage`.
- **Avatars**: When no photo is uploaded, falls back to a 2-letter typographic monogram generated by function `b(name)` using `Bodoni Moda` on `--av` background.
- **Web Fonts**: Sourced via Google Fonts CDN (`Bodoni Moda`, `Familjen Grotesk`, `Hind`, `Tiro Devanagari Hindi`).
- **Zero External Heavy Assets**: All UI icons, lines, and textures are native SVG or system unicode symbols, ensuring instant offline-capable loads.

---

### 5. Icon System

- Native high-contrast typographic and unicode glyphs are used for lightweight, razor-sharp rendering:
  - `↺` : Reset to top-level overview
  - `★` : Focus / bilateral flowchart branch
  - `+` / `−` : Zoom in / zoom out
  - `×` : Modal / sheet dismiss
  - `✨` : Automated English-to-Hindi transliteration
  - `🔍` : Search indicator
  - Directional branch indicators: `↖` (Paternal), `↗` (Maternal/In-laws), `↓` (Children)

---

### 6. Styling Approach

- **Methodology**: Component-scoped BEM-like class naming with global theme tokens (`.card`, `.card.dim`, `.sheet`, `.btn`, `.btn.ghost`, `.branch-pill`).
- **Elevation**:
  - Card hover: 1px ink border darkening + subtle 2px translate.
  - Active sheet: `box-shadow: -8px 0 24px rgba(0,0,0,0.12)`.
  - Scrim: `backdrop-filter: blur(2px)` with `--scrim`.
- **Accessibility & Focus**:
  - Focus rings: `outline: 2px solid var(--accent); outline-offset: 2px;`.
  - Contrast: Minimum 4.5:1 for body text (achieving 14:1+ AAA in light mode, 12:1+ AAA in dark mode).

---

### 7. Project Structure

```
c:\B-Tech 1st year\Family Tree/
├── Gupta Family Tree.html              # Main deliverable (Single-file bundled React web app)
├── Gupta Family Tree Project Summary.md# Project genesis & handoff records
├── Gupta Family Tree.md                # Quick summary
├── CLAUDE.md                           # This design system & engineering reference
└── CHANGES.md                          # Comprehensive version-by-version change log
```

---

## 🚫 "Anti-AI-Slop" Craft Manifesto

When updating or designing components for this project, you **MUST** uphold these rules:
1. **No Gradients, Blobs, or Bubbly Cards**: Cards must have crisp 90-degree corners, fine hairline borders, and authoritative editorial typography.
2. **Editorial Gravitas**: Treat the Gupta Family Tree like an archival heirloom folio or university library chronicle.
3. **Respectful Hindi**: All kinship terms use respectful honorifics (जी / Ji) in Hindi and English.
4. **Mathematical Layout Rigor**: Never allow cards to overlap. Subtrees use post-order bounding box allocations, and directional flowcharts respect directional vectors ($\nwarrow, \nearrow, \downarrow, \leftrightarrow$).
