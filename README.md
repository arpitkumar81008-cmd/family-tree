# VanshVriksha (वंश वृक्ष) — Bilingual Interactive Family Tree Platform

[![Live on Firebase Hosting](https://img.shields.io/badge/Live%20App-Firebase%20Hosting-e4002b?style=flat-square)](https://gupta-family-tree-akg.web.app)
[![Built with React 18 & Vite 6](https://img.shields.io/badge/Stack-React%2018%20%C2%B7%20Vite%206%20%C2%B7%20Firebase%20v11-0a0f0d?style=flat-square)](https://github.com/arpitkumar81008-cmd/family-tree)
[![Author](https://img.shields.io/badge/GitHub-@arpitkumar81008--cmd-121816?style=flat-square)](https://github.com/arpitkumar81008-cmd)

An interactive, bilingual (**English & हिन्दी**) multi-generational family tree web platform engineered with authentic Indian kinship resolution (`Tauji`, `Chacha`, `Bua`, `Mausi`, `Mama`, `Jethani`, `Devrani`, and more), a dual-mode zero-collision spatial layout engine, automated English-to-Devanagari name transliteration, private-by-default Cloud Firestore multi-tree synchronization, and portable JSON backups.

- **Live Production Website:** [https://gupta-family-tree-akg.web.app](https://gupta-family-tree-akg.web.app)
- **Author:** [Arpit Kumar Gupta (@arpitkumar81008-cmd)](https://github.com/arpitkumar81008-cmd)

---

## ✨ Key Features

### 1. Public Demo Lineage vs. Private Personal Trees & 3-Way Navigation
- **3-Way Primary Navigation (`Home` · `Demo Tree` · `My Private Tree`)**: Seamlessly switch between the editorial Home page, the public Demo Tree, and your private tree in a single click—with full URL synchronization (`/?view=home`, `/?view=tree`, `/?view=tree&tree=<id>`), browser `Back / Forward` (`popstate`) history, and active tree memory (`lastPrivateTreeId`).
- **Contextual Workspace Breadcrumbs (`src/components/Breadcrumbs.jsx`)**: Displays an interactive breadcrumb trail (`Home › Public Demo Tree › Perspective: <Person>`) with 1-click navigation back to Home or resetting an active person perspective to the full lineage overview.
- **Interactive Public Demo Tree (`Sharma Family Lineage`)**: Both guests and signed-in users can explore, search, pan/zoom, and test the public Demo Tree at any time without affecting their private tree.
- **Private-by-Default Cloud Trees**: Authenticated users (via Google Sign-In or Email/Password) can create or import their own private family trees stored securely in **Cloud Firestore** (`isPublic: false` enforced by `firestore.rules` so only the owner/collaborators can read or edit).
- **Non-Destructive Local + Cloud Persistence**: Every member, relationship, note, or photo added manually is persisted with `0ms` local latency in `localStorage` and merged (`deepMergeTree`) with Cloud Firestore so manually added family members, canvas zoom, pan scroll position, and perspective are never lost across view switches or page refreshes.

### 2. Dual-Mode Spatial Flowchart Engine (`src/layout/engine.js`)
- **Mode 1 — Full Lineage Top-Down Overview**: Recursive subtree-packing algorithm (`calcSubtree` + `positionSubtree`) that centers ancestral patriarchs/matriarchs, separates in-law branches into dedicated hierarchical side sectors connected via dashed bridge lines, and guarantees zero overlapping cards or slicing lines.
- **Mode 2 — Person-Centric Bilateral Orthogonal Flowchart**: Selecting any member in *"See relations from"* dynamically re-orients the diagram around that person—routing paternal ancestry to the upper-left (`↖`), spouse & in-law ancestry to the upper-right (`↗`), siblings to the left, and children/grandchildren downward (`↓`) using clean orthogonal Manhattan paths.

### 3. Bilingual Indian Kinship & Auto-Transliteration
- **Instant English ↔ हिन्दी Toggle**: Switch the entire UI, generation labels, and member names between English and Hindi in one click.
- **Dual-Engine Phonetic Transliteration (`src/i18n/translit.js`)**: Typing any name in English automatically generates its Devanagari (हिन्दी) spelling using Google Input Tools with a 100% offline phonetic Devanagari fallback engine.
- **Authentic Indian Kinship Calculator (`src/utils/kinship.js`)**: Automatically computes bidirectional relationships and closest shared ancestors between any two people in the tree, distinguishing paternal vs. maternal sides and elder vs. younger birth order (`ताऊजी` vs. `चाचाजी`, `जेठानी` vs. `देवरानी`, `बुआजी`, `फूफाजी`, `मामाजी`, `मौसीजी`, `साला`, `साली`, etc.).

### 4. Uncluttered Editorial UI & Progressive Disclosure
- **Full-Viewport Desktop Utilization**: Fluid edge-to-edge layout without restrictive side borders, maximizing canvas space on wide laptop and desktop monitors.
- **Hover / Focus / Scroll Progressive Explanations**: Secondary explanatory subtext under headings across the entire website remains tucked away by default and smoothly reveals only on hover, keyboard focus, or scroll—keeping the interface clean and readable.
- **Collapsible Bottom-Right Star (`✦`) Canvas Dock**: The Fit (`⛶`), Zoom (`−` / `+`), Directional Pan (`← ↑ ↓ →`), and `⟲ Full lineage` controls collapse into a compact **`✦`** star button in the bottom-right corner of the canvas and expand smoothly on hover, focus, or tap-to-pin.
- **Smooth Motion & Auto-Animate Transitions**: Powered by [`@formkit/auto-animate`](https://github.com/formkit/auto-animate) and [`motion`](https://github.com/motiondivision/motion) (with spring-inspired curves inspired by [`oil-motion`](https://github.com/oil-oil/oil-motion)), while strictly honoring `:root[data-motion="reduce"]` and `prefers-reduced-motion`.
- **Dual Visibility Modes (Laptop vs. Mobile)**: Automatic responsive adaptation (`<= 768px`) plus an explicit **Display Mode** switcher (`Auto` / `💻 Laptop` / `📱 Mobile`) inside the `⋮` Settings menu.

---

## 📖 Common User Tutorials (Step-by-Step Guides)

### Tutorial 1: How to Create Your Own Private Family Tree
1. Click **Create / Import Tree** in the top navigation bar (or the **Build your own family tree** banner on the Home page).
2. If you are not signed in yet, click **Sign in to Create / Import Tree →** and sign in with **Google** or **Email & Password**.
3. Under **Start a blank tree**:
   - Enter your **Family tree title** (e.g., *Verma Family Lineage*).
   - Enter the **First person's name** (your founding ancestor or yourself).
   - Keep **Visibility** set to **Private (only me)** so only your account can view or edit it (or choose **Public** if you want a shareable view-only link).
4. Click **Start tree** to open your new interactive canvas.

### Tutorial 2: How to Add Parents, Spouses, Siblings & Children
1. Switch to the **Family Tree** view.
2. You can add a relative in two ways:
   - **From the Toolbar**: Click **+ Add Member** in the top control bar, choose the **Relationship** (`Child of`, `Spouse of`, `Brother / Sister of`, `Parent of`, or `New Family Branch / Root Ancestor`), and select the target family member.
   - **From a Person's Card**: Click any person's card on the canvas to open their detail drawer, then click **+ Add spouse**, **+ Add child**, **+ Add brother or sister**, or **+ Add parent**.
3. Type the person's name in English—the **Hindi (Devanagari)** field will populate automatically (or click the **`अ`** button to re-translate).
4. Select **Male** or **Female** and click **Add to tree**.

### Tutorial 3: How to Use the Collapsible `✦` Star Dock & Perspective Flowchart
1. **Pan & Navigate**: Click and drag anywhere on the canvas (or use your mouse wheel / trackpad) to pan across the lineage.
2. **Expand Canvas Controls (`✦`)**: Move your cursor over (or tap on mobile) the **`✦`** star button in the bottom-right corner of the canvas to reveal:
   - `⟲ Full lineage` — resets the perspective back to the full top-down tree and fits it to your screen.
   - `← ↑ ↓ →` — smooth directional pan buttons.
   - `−` / `100%` / `+` — zoom out and zoom in.
   - `⛶ Fit` — automatically scales and centers the tree to fit your viewport.
3. **Person-Centric Flowchart**: Use the **See relations from** dropdown in the toolbar (or click a person's card and toggle their perspective) to view the bilateral directional flowchart centered on that person, with every card badged with their exact relationship to that person.

### Tutorial 4: How to Find Relationships, Track Birthdays & Export Backups
1. Scroll below the tree canvas to the **Family details and tools** panel:
   - **How are we related?**: Select any **First person** and **Second person** from the dropdowns. The app immediately displays their bidirectional relationship in English and Hindi along with their **Closest shared ancestor**.
   - **Birthdays**: Add a **Date of birth** on any living member's card to see upcoming birthdays sorted chronologically with age turn counts.
   - **Backup**:
     - Click **Copy** or **Download .json** to save a complete portable backup file (`family-tree-backup-YYYY-MM-DD.json`). Check **Include photos** if you want compressed portrait photos included in the JSON file.
     - Paste any previously exported JSON into the **Import** box and click **Replace tree with this backup** to restore it.

---

## ❓ Frequently Asked Questions (FAQs)

### 1. Is my personal family tree private or public?
Your personal family tree is **strictly private** (`isPublic: false` in Cloud Firestore). Unauthenticated visitors only see the fictional **Sharma Family Lineage** public demo tree (`24` members). Your private tree is protected by Firebase Authentication and Cloud Firestore Security Rules ([`firestore.rules`](file:///c:/B-Tech%201st%20year/Family%20Tree/firestore.rules)) so only your authenticated account (`ownerUid`) can read or modify it. When you click **Sign out**, any private tree is immediately cleared from the screen.

### 2. Why did manually added members disappear earlier, and how is that prevented now?
Previously, if a cloud snapshot or code update reloaded the base tree before a debounced save completed, local additions in `localStorage` could be overwritten. Now:
- Every manual edit or member addition writes to `localStorage` synchronously (`0ms` delay) and syncs to Cloud Firestore.
- On load, `mergeCloudTreeWithLocalHistory` ([`src/utils/storage.js`](file:///c:/B-Tech%201st%20year/Family%20Tree/src/utils/storage.js)) performs a non-destructive union (`deepMergeTree`) between Cloud Firestore and all local browser storage snapshots (`gupta-family-tree-v3`, `v2`, `v1`, and `gupta_multi_trees_v1`), ensuring manually added members are never lost.

### 3. Does the English-to-Hindi translation work offline?
Yes! [`src/i18n/translit.js`](file:///c:/B-Tech%201st%20year/Family%20Tree/src/i18n/translit.js) uses a hybrid engine: when online, it queries Google Input Tools for vocabulary-aware Devanagari transliteration; when offline, it automatically falls back to a built-in phonetic consonant/vowel Devanagari state machine.

### 4. How do I switch between Laptop and Mobile display modes or adjust accessibility?
Click the **`⋮` (Accessibility & Settings)** button in the top-right corner of the navigation bar. From there you can configure:
- **Language**: `English` / `हिन्दी`
- **Display Mode**: `Auto` / `💻 Laptop` / `📱 Mobile`
- **Theme**: `Light` / `Dark` / `System`
- **Text Size**: `Default` (`138px` cards) / `Large` (`152px` cards) / `XL` (`168px` cards)
- **High Contrast**: `Off` / `On` (WCAG AAA high-contrast tokens)
- **Reduced Motion**: `Off` / `On` (disables all `@formkit/auto-animate`, `motion`, and CSS transitions)

### 5. What keyboard shortcuts are available?
- **`/`**: Focus the **Find a person** search input from anywhere on the page.
- **`?`**: Open the **Keyboard Shortcuts & Quick Help** modal.
- **`ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`**: Spatially navigate between family member cards on the canvas, or switch between the bottom tool tabs.
- **`Escape`**: Close any open modal, drawer, or settings popover and return focus to the trigger element.

---

## 🗂️ Project Architecture

```text
family-tree/
├── index.html                      # Vite entry HTML with Google Fonts (Fraunces, Bodoni Moda, Familjen Grotesk, Hind)
├── vite.config.js                  # Vite bundler config with vendor chunk splitting
├── firebase.json                   # Firebase Hosting & Cloud Firestore configuration
├── firestore.rules                 # Production Firestore Security Rules (private-by-default ACLs)
├── firestore.indexes.json          # Firestore composite indexes
├── CLAUDE.md                       # Design system & architectural engineering rules
├── CHANGES.md                      # Complete chronological project changelog
└── src/
    ├── main.jsx                    # React 18 root bootstrap
    ├── App.jsx                     # Root state orchestrator, auth/cloud sync & keyboard shortcuts
    ├── data/
    │   ├── familyData.js           # Public Demo dataset (Sharma Family Lineage) & buildFamilyIndex()
    │   └── schema.js               # Strict JSON & Firestore schema validator
    ├── layout/
    │   └── engine.js               # Dual-mode spatial layout engine (Mode 1 Subtree-Packing + Mode 2 Manhattan Flowchart)
    ├── i18n/
    │   ├── index.js                # Translator factory
    │   ├── en.js                   # English dictionary (UI, tutorials, FAQs)
    │   ├── hi.js                   # Hindi dictionary (UI, tutorials, FAQs)
    │   └── translit.js             # Online + offline English-to-Devanagari transliterator
    ├── services/
    │   ├── firebase.js             # Firebase v11 Auth & Firestore client with persistent IndexedDB cache
    │   └── treeSync.js             # Real-time multi-tree sync with 0ms local cache + debounced cloud writes
    ├── utils/
    │   ├── kinship.js              # Bilingual Indian & English kinship calculator
    │   ├── deduplication.js        # Pure deduplication (dedup) & non-destructive union (deepMergeTree)
    │   ├── storage.js              # LocalStorage persistence & historical merge recovery
    │   ├── useSmartAutoAnimate.js  # @formkit/auto-animate hook with reduced-motion observer
    │   └── image.js                # Client-side canvas JPEG compression (160px @ 0.72 quality)
    ├── components/
    │   ├── Navbar.jsx              # Sticky navigation bar with 3-way view switcher, status badge, auth & settings
    │   ├── Breadcrumbs.jsx         # Contextual workspace breadcrumb trail with 1-click perspective reset
    │   ├── MobileBottomNav.jsx     # Ergonomic 4-tab bottom navigation bar for mobile viewports
    │   ├── LandingPage.jsx         # Full-screen editorial Home page with features, tutorials & collapsible FAQs
    │   ├── Toolbar.jsx             # Perspective selector, search input & + Add Member trigger
    │   ├── Canvas.jsx              # Interactive 2D drag-to-pan/zoom stage with motion animations
    │   ├── CanvasDock.jsx          # Collapsible bottom-right ✦ star control dock
    │   ├── Card.jsx                # Family member card with avatar, kinship badge & keyboard nav
    │   ├── Sheet.jsx               # Person detail & inline edit modal/drawer
    │   ├── AddModal.jsx            # Global Add Family Member modal with duplicate detection
    │   ├── CreateTreeModal.jsx     # Multi-tree directory, blank tree builder & JSON importer
    │   ├── AuthModal.jsx           # Google & Email/Password authentication modal
    │   ├── SettingsPopover.jsx     # Accessibility & Display Mode (Auto / Laptop / Mobile) popover
    │   ├── Tabs.jsx                # Relationship Finder, Birthdays & 2-column Backup/Restore panel
    │   ├── HelpModal.jsx           # Keyboard shortcuts reference dialog
    │   └── OnboardingToast.jsx     # Contextual new-user onboarding toast
    ├── styles/
    │   ├── tokens.css              # Light, Dark, High-Contrast, Text-Size & Reduced-Motion CSS tokens
    │   ├── components.css          # Full-width page layout, breadcrumbs, mobile bottom nav, modals & tabs
    │   ├── tree.css                # Canvas stage, orthogonal SVG connectors & member cards
    │   └── landing.css             # Navbar, Hero, Tutorials, FAQs, Collapsible ✦ Dock & Mobile/Laptop modes
    └── ../tests/
        ├── e2e-navigation.test.mjs # 109-test E2E navigation, URL sync, bilingual & boundary test suite
        └── helpers/                # Vite SSR runner & DOM/Browser mock harness
```

---

## 🚀 Local Development, Testing & Deployment

```bash
# 1. Install dependencies
npm install

# 2. Start local development server (opens http://localhost:3000)
npm run dev

# 3. Run the 109-test E2E navigation & state verification suite
npm test

# 4. Build production bundle into dist/
npm run build

# 5. Deploy to Firebase Hosting (https://gupta-family-tree-akg.web.app)
npx firebase-tools deploy --only hosting,firestore:rules
```
