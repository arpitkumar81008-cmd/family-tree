# VanshVriksha (वंश वृक्ष) — Bilingual Interactive Family Tree Platform

[![Live on Firebase Hosting](https://img.shields.io/badge/Live%20App-vanshvriksha.web.app-e4002b?style=flat-square)](https://vanshvriksha.web.app)
[![Built with React 18 & Vite 6](https://img.shields.io/badge/Stack-React%2018%20%C2%B7%20Vite%206%20%C2%B7%20Firebase%20%5E13.2.0-0a0f0d?style=flat-square)](https://github.com/arpitkumar81008-cmd/family-tree)
[![Author](https://img.shields.io/badge/GitHub-@arpitkumar81008--cmd-121816?style=flat-square)](https://github.com/arpitkumar81008-cmd)

An interactive, bilingual (**English & हिन्दी**) multi-generational family tree web platform engineered with authentic Indian kinship resolution (`Tauji`, `Chacha`, `Bua`, `Mausi`, `Mama`, `Jethani`, `Devrani`, and more), a dual-mode zero-collision spatial layout engine, automated English-to-Devanagari name transliteration, private-by-default Cloud Firestore multi-tree synchronization, high-res PNG/PDF poster export, and portable JSON backups.

- **Live Production Website:** [https://vanshvriksha.web.app](https://vanshvriksha.web.app)
- **Author:** Arpit Kumar Gupta · [GitHub (@arpitkumar81008-cmd)](https://github.com/arpitkumar81008-cmd) · [LinkedIn](https://www.linkedin.com/in/arpit-kumar-gupta-0320a4335/)

---

## Key Features

### 1. Public Demo Lineage vs. Private Personal Trees & 3-Way Navigation
- **3-Way Primary Navigation (`Home` · `Demo Tree` · `My Private Tree`)**: Seamlessly switch between the editorial Home page, the public Demo Tree, and your private tree in a single click—with full URL synchronization (`/?view=home`, `/?view=tree`, `/?view=tree&tree=<id>`), browser `Back / Forward` (`popstate`) history, and active tree memory (`lastPrivateTreeId`).
- **Contextual Workspace Breadcrumbs (`src/components/Breadcrumbs.jsx`)**: Displays an interactive breadcrumb trail (`Home › Public Demo Tree › Perspective: <Person>`) with 1-click navigation back to Home or resetting an active person perspective to the full lineage overview.
- **Interactive Public Demo Tree (`Verma Family Lineage` — 26 members across 5 generations)**: Both guests and signed-in users can explore, search, pan/zoom, and test the public Demo Tree at any time without affecting their private tree.
- **Private-by-Default Cloud Trees, Join Requests & Family Sharing (`src/components/ShareTreeModal.jsx`)**:
  - **Invite Relatives by Email (`viewerEmails` / `editorEmails`)**: Add any family member's verified email address with **View-Only** or **Can Edit** permissions.
  - **Family Access Code & WhatsApp Invite Link (`shareCode`)**: Generate a secure code (e.g., `VERMA-2026`) or copy a 1-click invite link (`?view=tree&tree=<id>&code=<code>`) and approve relatives via real-time Join Requests (`/trees/{treeId}/joinRequests/{requesterUid}`).
  - **1-Click Visibility Toggle**: Switch between **Private (Invited Family & Code Only)** and **Public View-Only (Anyone with link)** anytime.
- **25-Step Undo/Redo & Cloud Sync**: Undo (`Ctrl+Z`) and Redo (`Ctrl+Y` / `Cmd+Shift+Z`) edits on the canvas with optimistic transaction concurrency (`version`) in Cloud Firestore and automatic offline/local persistence.

### 2. Dual-Mode Spatial Flowchart Engine (`src/layout/engine.js`)
- **Mode 1 — Full Lineage Top-Down Overview**: Recursive subtree-packing algorithm (`calcSubtree` + `positionSubtree`) that centers ancestral patriarchs/matriarchs, separates in-law branches into dedicated collapsible hierarchical side sectors (`SubTreesSidebar.jsx`), and guarantees zero overlapping cards or slicing lines.
- **Mode 2 — Person-Centric Bilateral Orthogonal Flowchart**: Selecting any member in *"See relations from"* dynamically re-orients the diagram around that person—routing paternal ancestry to the upper-left, spouse & in-law ancestry to the upper-right, siblings to the left, and children/grandchildren downward using clean orthogonal Manhattan paths.

### 3. Bilingual Indian Kinship, Auto-Transliteration & Relationship Path Highlight
- **Instant English ↔ हिन्दी Toggle**: Switch the entire UI, generation labels, and member names between English and Hindi in one click.
- **Dual-Engine Phonetic Transliteration (`src/i18n/translit.js`)**: Typing any name in English automatically generates its Devanagari (हिन्दी) spelling using Google Input Tools (with a 2s timeout) plus a 100% offline phonetic Devanagari fallback engine.
- **Authentic Indian Kinship Solver (`src/utils/kinship.js`, `RelationSolverModal.jsx`)**: Computes bidirectional blood & marital relationships (`Chacha`, `Tauji`, `Bua`, `Mama`, `Mausi`, `Samdhi`, etc.), shared ancestors, and highlights the visual connection path directly on the tree canvas.

### 4. Portraits, Milestones, Poster Exports & Progressive Web App
- **In-Browser Photo & HEIC/HEIF Compression (`src/utils/photoCompress.js`)**: Automatically converts phone HEIC/HEIF photos and compresses portraits client-side into lightweight JPEGs (`<= 8 KB` per photo) stored safely within Firestore limits.
- **Birthdays & Anniversaries (`src/components/MilestonesModal.jsx`)**: Filterable upcoming family milestones tracker with 1-click member focus.
- **2× DPI PNG & Printable PDF Poster Export (`src/utils/treeExportImage.js`)**: Download a high-resolution family poster PNG or open a formatted landscape print/PDF view.
- **Editorial Home Experience & Reduced-Motion Support**: Auto-rotating 4-tab Features Showcase (`LandingPage.jsx`), Quick Start Guide, Display Mode switcher (`Auto` / `Laptop` / `Mobile`), Light/Dark/High-Contrast themes, and an offline-capable PWA service worker (`public/sw.js`).

---

## Common User Tutorials (Step-by-Step Guides)

### Tutorial 1: How to Create Your Own Private Family Tree
1. Click **Build your own tree** in the top navigation bar or on the Home page.
2. If you are not signed in yet, sign in with **Google** or **Email & Password** (email accounts support verification & password reset).
3. Under **Start a blank tree**:
   - Enter your **Family tree title** (e.g., *Verma Family Lineage*).
   - Enter the **First person's name** (your founding ancestor or yourself).
   - Keep **Visibility** set to **Private (only me)** so only your account and approved family members can view or edit it.
4. Click **Start tree** to open your new interactive canvas.

### Tutorial 2: How to Add Parents, Spouses, Siblings & Children
1. Switch to the **Family Tree** view.
2. You can add a relative in two ways:
   - **From the Toolbar**: Click **Add Member**, choose the **Relationship** (`Child of`, `Spouse of`, `Brother / Sister of`, `Parent of`, or `New Family Branch / Root Ancestor`), and select the target family member.
   - **From a Person's Card**: Click any person's card on the canvas to open their detail drawer, then click **Add spouse**, **Add child**, **Add brother or sister**, or **Add parent**.
3. Type the person's name in English—the **Hindi (Devanagari)** field will populate automatically (or click **`अ`** to re-translate).
4. Select **Male** or **Female** and click **Add to tree**.

### Tutorial 3: How to Use Canvas Controls, Perspectives & Full Screen
1. **Pan & Navigate**: Drag anywhere on the canvas (or use pinch-to-zoom / scroll wheel) to explore the lineage.
2. **Expand Canvas Controls**: Hover or tap the bottom-right control dock to access **Full lineage**, directional pan arrows, zoom (`−` / `100%` / `+`), **Fit**, and **Full screen**.
3. **Person-Centric Flowchart**: Use **See relations from** in the toolbar to re-center the lineage around any member with exact kinship labels on every card.

### Tutorial 4: How to Find Relations, Track Milestones & Export Posters/Backups
1. Open **Find Relation** in the toolbar (or the **How are we related?** tab) to inspect bidirectional English/Hindi kinship, shared ancestors, and highlight the connection path on the tree.
2. Open **Milestones** or the **Birthdays** tab to view upcoming birthdays and anniversaries.
3. Use **Export PNG** / **PDF/Print** in the toolbar for high-resolution posters, or use the **Backup** tab to download/upload portable `.json` snapshots.

---

## Frequently Asked Questions (FAQs)

### 1. Is my personal family tree private or public?
Your personal family tree is **strictly private** (`isPublic: false` in Cloud Firestore). Signed-out visitors only see the fictional **Verma Family Lineage** public demo tree (`26` members across `5` generations). Private trees are protected by Firebase Authentication and Cloud Firestore Security Rules ([`firestore.rules`](firestore.rules)) so only you and approved family members can read or modify them.

### 2. How are changes and photos saved?
Every change saves with optimistic transaction versioning (`version`) in Cloud Firestore when signed in, with IndexedDB & `localStorage` offline support. Uploaded photos (including `.heic`/`.heif`) are compressed in-browser into safe JPEG data URLs and validated against allowed schemas before rendering or export.

### 3. Does the English-to-Hindi translation work offline?
Yes. [`src/i18n/translit.js`](src/i18n/translit.js) uses Google Input Tools when online (with a 2-second timeout fallback) and a built-in phonetic Devanagari engine when offline.

### 4. What keyboard shortcuts are available?
- **`Ctrl+K` / `/`**: Focus the **Find a person** search input (`↑` / `↓` / `Enter` cycles matches).
- **`Ctrl+Z` / `Ctrl+Y`**: Undo or Redo edits.
- **`?`**: Open the **Keyboard Shortcuts & Quick Help** modal.
- **`ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`**: Navigate between member cards or bottom tabs.
- **`Escape`**: Close open modals/drawers or exit full-screen mode.

---

## Project Architecture

```text
family-tree/
├── index.html                      # Vite entry HTML with Google Fonts, SEO, Open Graph & manifest link
├── public/
│   ├── images/tree-logo.png        # App logo & favicon
│   ├── manifest.webmanifest        # Web App Manifest
│   └── sw.js                       # Offline-capable static PWA service worker
├── vite.config.js                  # Vite 6 bundler config with vendor chunk splitting
├── firebase.json                   # Firebase Hosting (headers/CSP/rewrites) & Firestore config
├── firestore.rules                 # Production Firestore Security Rules (private-by-default ACLs)
├── firestore.indexes.json          # Firestore composite indexes
├── functions/                      # Optional Cloud Functions (redeemShareCode)
├── .github/workflows/ci.yml        # GitHub Actions CI (npm ci, npm run build, npm test)
├── src/
│   ├── main.jsx                    # React 18 root bootstrap & ErrorBoundary
│   ├── App.jsx                     # Root state orchestrator, lazy modals/canvas, cloud sync & shortcuts
│   ├── data/
│   │   ├── familyData.js           # Public Demo dataset (Verma Family Lineage) & buildFamilyIndex()
│   │   └── schema.js               # Strict JSON, prototype-key, & safe photo URL validators
│   ├── layout/
│   │   └── engine.js               # Dual-mode spatial layout engine (Subtree-Packing + Manhattan Flowchart)
│   ├── i18n/
│   │   ├── index.js                # Translator factory
│   │   ├── en.js                   # English dictionary (UI, tutorials, FAQs)
│   │   ├── hi.js                   # Hindi dictionary (UI, tutorials, FAQs)
│   │   └── translit.js             # Online (2s timeout) + offline English-to-Devanagari transliterator
│   ├── services/
│   │   ├── firebase.js             # Firebase (^13.2.0) Auth, Analytics & Firestore persistent cache client
│   │   ├── treeSync.js             # Multi-tree sync, optimistic versioning, join requests & URL state
│   │   ├── joinNotifications.js    # Safe mailto / EmailJS owner join notifications
│   │   └── analyticsStats.js       # Aggregate analytics daily counter & admin helper
│   ├── utils/
│   │   ├── kinship.js              # Bilingual Indian & English complex blood/marital kinship solver
│   │   ├── deduplication.js        # Pure deduplication (dedup) & union merge helpers
│   │   ├── storage.js              # LocalStorage persistence & zoom/pan memory
│   │   ├── historyStack.js         # 25-step Undo/Redo history manager
│   │   ├── milestones.js           # Upcoming birthday & anniversary calculator
│   │   ├── photoCompress.js        # Browser HEIC/JPEG photo compressor & compactor
│   │   ├── treeExportImage.js      # 2x DPI PNG & safe landscape print poster exporter
│   │   ├── authStorage.js          # Local auth session helper
│   │   └── useSmartAutoAnimate.js  # @formkit/auto-animate hook with reduced-motion observer
│   ├── components/
│   │   ├── Navbar.jsx              # Sticky navigation bar with 3-way view switcher, GitHub icon & settings
│   │   ├── Breadcrumbs.jsx         # Contextual workspace breadcrumb trail with 1-click perspective reset
│   │   ├── MobileBottomNav.jsx     # Ergonomic 4-tab bottom navigation bar for mobile viewports
│   │   ├── LandingPage.jsx         # Editorial Home page with auto-rotating features & quick-start guide
│   │   ├── Toolbar.jsx             # Perspective selector, search cycler, undo/redo, export & add member
│   │   ├── Canvas.jsx              # Interactive 2D drag/pinch-to-zoom stage with path highlight
│   │   ├── CanvasDock.jsx          # Collapsible bottom-right canvas control dock
│   │   ├── Card.jsx                # Family member card with safe avatar, kinship badge & keyboard nav
│   │   ├── Sheet.jsx               # Person detail & inline edit modal/drawer
│   │   ├── AddModal.jsx            # Global Add Family Member modal with duplicate detection
│   │   ├── RelationSolverModal.jsx # Interactive Relationship Solver modal
│   │   ├── MilestonesModal.jsx     # Upcoming Birthdays & Anniversaries modal
│   │   ├── ShareTreeModal.jsx      # Family sharing modal (invites, access codes, join requests)
│   │   ├── SubTreesSidebar.jsx     # Family branches sidebar & collapse controls
│   │   ├── CreateTreeModal.jsx     # Multi-tree directory, blank tree builder & JSON importer
│   │   ├── AuthModal.jsx           # Google, Email/Password & password reset authentication modal
│   │   ├── AdminPanel.jsx          # Admin analytics panel (?view=admin)
│   │   ├── SettingsPopover.jsx     # Accessibility & Display Mode (Auto / Laptop / Mobile) popover
│   │   ├── Tabs.jsx                # Relationship Finder, Birthdays & Backup/Restore panel
│   │   ├── HelpModal.jsx           # Keyboard shortcuts reference dialog
│   │   └── OnboardingToast.jsx     # Contextual new-user onboarding toast
│   └── styles/
│       ├── tokens.css              # Light, Dark, High-Contrast, Text-Size & Reduced-Motion CSS tokens
│       ├── components.css          # Full-width page layout, breadcrumbs, mobile bottom nav, modals & tabs
│       ├── tree.css                # Canvas stage, orthogonal SVG connectors & member cards
│       └── landing.css             # Navbar, Hero, Interactive Feature Tabs, Quick Start & Mobile/Laptop modes
└── tests/
    ├── e2e-navigation.test.mjs     # E2E navigation, URL sync, bilingual & boundary test suite
    ├── kinship-solver.test.mjs     # Kinship & relationship solver tests
    ├── enhancements.test.mjs       # Feature enhancement tests
    ├── enhancements-v2.test.mjs    # Undo/redo, milestones & i18n parity tests
    ├── review-fixes.test.mjs       # Security, validation, benchmark & regression tests
    └── helpers/                    # Vite SSR runner & DOM/Browser mock harness
```

---

## Local Development, Testing & Deployment

```bash
# 1. Install dependencies
npm install

# 2. Start local development server (opens http://localhost:3000)
npm run dev

# 3. Run all automated test suites
npm test

# 4. Build production bundle into dist/
npm run build

# 5. Deploy to Firebase Hosting & Firestore Rules (https://vanshvriksha.web.app)
npx firebase-tools deploy --only firestore:rules,hosting
```
