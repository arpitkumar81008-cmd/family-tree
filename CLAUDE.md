# CLAUDE.md — Developer & Agent Architecture Guide for VanshVriksha (वंशवृक्ष)

## Project Overview

**VanshVriksha (वंशवृक्ष)** is a bilingual (English + हिन्दी) interactive genealogy and multi-generation family tree platform built with **React 18**, **Vite 5**, **Motion (`motion/react`)**, **`@formkit/auto-animate`**, **Firebase Authentication**, and **Cloud Firestore**.

- **Live Production App**: [https://gupta-family-tree-akg.web.app](https://gupta-family-tree-akg.web.app)
- **GitHub Repository**: [https://github.com/arpitkumar81008-cmd/family-tree](https://github.com/arpitkumar81008-cmd/family-tree)

---

## Core Architecture

### 1. Public Demo vs. Private Cloud Isolation
- **Public Demo Tree (`trees/tree_demo_sharma`)**:
  - Default dataset defined in [`src/data/demoFamilyData.js`](src/data/demoFamilyData.js) (24 fictional members of the **Sharma Family Tree (Demo)** across 5 generations).
  - Accessible to all visitors without signing in.
- **Private Family Trees (`trees/<treeId>`)**:
  - Stored in Cloud Firestore with `isPublic: false` and `ownerUid: <uid>`.
  - Enforced at the database layer via [`firestore.rules`](firestore.rules) so private trees can only be read or modified by their authenticated owner.

### 2. Non-Destructive Local + Cloud Sync (`src/utils/storage.js` & `src/services/treeSync.js`)
- Every edit writes to `localStorage` (`0ms` synchronous write) and syncs to Cloud Firestore (`600ms` debounced write).
- When loading from `localStorage` or receiving a Cloud Firestore snapshot, `mergeCloudTreeWithLocalHistory(cloudData, treeId, isPublic)` in [`src/utils/storage.js`](src/utils/storage.js) merges any locally added members, couples, and children from `gupta-family-tree-v3`, `v2`, `v1`, `gupta_multi_trees_v1`, or `demo-family-tree-v1` while respecting explicit deletion tombstones (`recordDeletedId`).
- **Rule for Future Updates**: Never overwrite `localStorage` or `treeState.data` with a static template if the user has existing members. Always run `deepMergeTree` / `mergeCloudTreeWithLocalHistory`.

### 3. Two-Pass Collision-Free Tree Layout Engine (`src/utils/layout.js`)
- **Mode 1 (`computeMode1`)**: Standard ancestor/descendant layout from a selected root couple, with recursive bottom-up subtree width calculation (`subtreeW`) so sibling branches never overlap.
- **Mode 2 (`computeMode2`)**: Dual-ancestor / extended kinship view showing both husband's and wife's parents, siblings, cousins, and descendants simultaneously, with a post-layout overlap resolver ensuring a minimum `30px` horizontal gap (`H_GAP`) on every row.
- **SVG Connectors**: Orthogonal stepped Bézier paths for parent-to-child links and horizontal marriage bars (`═══`).

### 4. Bilingual Vedic Kinship Calculator (`src/utils/relationship.js`)
- Computes exact Indian kinship terms in English and Devanagari Hindi (`Chacha`, `Bua`, `Mama`, `Mausi`, `Dada`, `Nani`, `Bhanja`, `Bhatija`, `Jija`, `Bhabhi`, etc.) between any two individuals via BFS shortest-path traversal.

### 5. UI, Animations & Accessibility
- **Full-Screen Desktop Layout**: `.landing`, `.site-nav`, `.page`, `.tools`, and `.treewrap` span `100%` of the desktop viewport width with no left/right outer borders.
- **Collapsible `✦` Star Dock**: Located in the bottom-right corner of `.treewrap` ([`src/components/TreeCanvas.jsx`](src/components/TreeCanvas.jsx)); expands into `-`, `100%`, `+`, and `Fit` controls only on hover or keyboard focus.
- **Viewport Switcher**: Laptop (`💻`) and Mobile (`📱`) layout toggle in [`src/components/Navbar.jsx`](src/components/Navbar.jsx) sets `document.documentElement.dataset.viewport`.
- **Tutorials & FAQs**: Rendered on [`src/components/LandingPage.jsx`](src/components/LandingPage.jsx) with bilingual strings in [`src/i18n/en.js`](src/i18n/en.js) and [`src/i18n/hi.js`](src/i18n/hi.js).

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server on http://localhost:3000
npm run build        # Production build into dist/
npx firebase-tools deploy --only hosting   # Deploy dist/ to Firebase Hosting
```
