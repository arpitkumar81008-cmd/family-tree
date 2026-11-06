# Gupta Family Tree — Interactive Lineage & Kinship Application

> An interactive, accessible, bilingual (English & हिन्दी) family tree platform built with React, Vite, and an algorithmic dual-mode spatial layout engine. Designed for generational clarity, cultural relationship modeling, and seamless one-click cloud deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farpitkumar81008-cmd%2Ffamily-tree)
[![GitHub Pages](https://github.com/arpitkumar81008-cmd/family-tree/actions/workflows/deploy.yml/badge.svg)](https://github.com/arpitkumar81008-cmd/family-tree/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Key Highlights

- **Dual-Mode Algorithmic Layout Engine**:
  - **Mode 1 (Top-Down Central Lineage)**: Visualizes the primary blood lineage (Badri Prasad) centrally with aside in-law branches connected through orthogonal bus bridges and zero overlapping subtrees.
  - **Mode 2 (Directional Sequential Flowchart)**: Switch perspective to any individual card with one click. Roots paternal ancestry ↖ towards the upper-left, places focal brothers on the **left**, in-law ancestry ↗ towards the upper-right, and descendants ↓ below.
- **Strictly Orthogonal Connectors**: Zero ambiguous diagonal or bezier overlaps. Clean Manhattan routing with generational guide rails.
- **Deep Cultural Kinship Resolver**: Native calculation of authentic Indian relationship terms in English and formal parliamentary Hindi (e.g., *Tauji* vs *Chacha*, *Bua*, *Phupha*, *Mausi*, *Mama*, *Jethani*, *Devrani*, *Chachera Bhai*).
- **Phonetic Auto-Transliteration ✨**: Real-time English-to-Devanagari name translation powered by the Google Input Tools API with an instant offline phonetic fallback dictionary.
- **Inclusive Accessibility Suite**:
  - 3-Dot popover accessibility control in the header.
  - Three distinct themes: **Light**, **Dark**, and **System default**.
  - Text scaling: **Normal**, **Large**, and **Extra Large**.
  - **High Contrast** mode (bold 2px strokes and black/white contrast borders).
  - **Reduced Motion** mode (disables transforms and transitions).
  - Spatial keyboard navigation: Move between family cards using `↑` `↓` `←` `→`, press `/` for quick search, and `?` for keyboard shortcuts.
- **Local Persistence & Data Portability**: Instant offline saving via browser `localStorage` with automated deduplication and full JSON export/import capability.
- **Standalone Distribution**: Ships with a single-file bundle (`Gupta Family Tree.html`) requiring no build tools or servers.

---

## 📂 Project Structure

```text
family-tree/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated GitHub Pages CI/CD workflow
├── public/
│   ├── favicon.svg               # Vector brand icon
│   └── index.html                # Static fallback
├── src/
│   ├── components/
│   │   ├── AddModal.jsx          # Modal for adding relatives (Child, Spouse, Sibling, Parent, Root)
│   │   ├── Canvas.jsx            # Zoomable, pannable, SVG-connected spatial canvas
│   │   ├── Card.jsx              # Family member node card & avatar renderer
│   │   ├── HelpModal.jsx         # Keyboard shortcuts & interactive guide modal
│   │   ├── SettingsPopover.jsx   # 3-Dot accessibility popover menu
│   │   ├── Sheet.jsx             # Slide-out profile sheet & person manager
│   │   ├── Tabs.jsx              # Relationship finder, Birthdays, and Backup panels
│   │   └── Toolbar.jsx           # Perspective selector, search bar, and actions
│   ├── data/
│   │   ├── familyData.js         # Canonical 40-member dataset & indexer
│   │   └── schema.js             # Data shape validation rules
│   ├── i18n/
│   │   ├── en.js                 # English dictionary (110+ keys)
│   │   ├── hi.js                 # Formal Hindi dictionary (110+ keys)
│   │   ├── index.js              # Localization factory
│   │   └── translit.js           # Dual-engine English-to-Hindi transliteration
│   ├── layout/
│   │   └── engine.js             # Dual-mode spatial layout & Manhattan routing engine
│   ├── styles/
│   │   ├── components.css        # Modals, sheets, toolbars, and buttons
│   │   ├── tokens.css            # Design tokens, typography, and theme variables
│   │   └── tree.css              # Canvas, SVG paths, generation rails, and cards
│   ├── utils/
│   │   ├── deduplication.js      # Canonical ID mapping & deduplication
│   │   ├── kinship.js            # Indian kinship resolver algorithm
│   │   └── storage.js            # LocalStorage synchronization & state migration
│   ├── App.jsx                   # Top-level state and orchestrator
│   └── main.jsx                  # React 18 entrypoint
├── Gupta Family Tree.html        # Standalone, zero-install distribution bundle
├── index.html                    # Root Vite entry HTML
├── package.json                  # Dependencies and scripts
├── vercel.json                   # Vercel deployment configuration
├── vite.config.js                # Vite build configuration (base: './')
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `yarn`

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/arpitkumar81008-cmd/family-tree.git
   cd family-tree
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. Build for production:
   ```bash
   npm run build
   ```
   The optimized production bundle will be generated in `dist/`.

---

## 🌐 Deployment

### Deploying to Vercel (Recommended)

1. Connect your GitHub account to [Vercel](https://vercel.com).
2. Click **New Project** and import `arpitkumar81008-cmd/family-tree`.
3. Vercel automatically detects the Vite configuration:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**. The included `vercel.json` ensures client-side routing and cache headers work out of the box.

### Deploying to GitHub Pages

This repository includes a pre-configured GitHub Actions workflow in `.github/workflows/deploy.yml`.
1. In your GitHub repository, go to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to `main` — GitHub will build and publish the site automatically to:
   `https://arpitkumar81008-cmd.github.io/family-tree/`

---

## 🧭 Navigation & Keyboard Shortcuts

| Key / Control | Action |
| :--- | :--- |
| <kbd>/</kbd> | Focus Quick Search |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | Navigate spatially between cards on the canvas |
| <kbd>Enter</kbd> / <kbd>Click</kbd> | Open person details sheet |
| <kbd>+</kbd> / <kbd>−</kbd> | Zoom in / out |
| <kbd>Fit</kbd> | Center and fit tree to screen |
| <kbd>Esc</kbd> | Close any open modal or sheet |
| <kbd>?</kbd> | Toggle Help & Keyboard Shortcuts guide |

---

## 🗺️ Roadmap to Generic Tree Builder

This architecture was designed from the ground up to support general-purpose multi-tree editing:
1. **Multi-Tree Workspace**: Enable users to create empty trees, load templates, or switch between distinct family databases.
2. **Backend Sync**: Integration with Supabase / Firebase / Cloudflare D1 for real-time collaborative family tree editing.
3. **GEDCOM 5.5 / 7.0 Support**: Import and export standard genealogical `.ged` files.
4. **Custom Color Themes & Print Export**: Export ultra-high-resolution SVG and multi-page PDF charts suitable for physical family wall banners.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
