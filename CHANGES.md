# VanshVriksha (वंशवृक्ष) — Architecture & Release Changelog

## Latest Release — Full-Screen Desktop Experience, Non-Destructive Cloud+Local Sync, Interactive Tutorials & FAQs

### 1. Home Screen Navbar De-Cluttering
- **Removed `.stats-badge` on Home View**: In [`src/components/Navbar.jsx`](src/components/Navbar.jsx), the member/generation status pill (`24 members · 5 generations · Public view`) is now rendered exclusively on the **Explore Tree** canvas (`currentView !== 'home'`) so the Home landing screen header stays clean and uncluttered.

### 2. Full-Screen Edge-to-Edge Desktop Layout
- **Edge-to-Edge Viewport Utilization**:
  - Updated [`src/styles/landing.css`](src/styles/landing.css) and [`src/styles/components.css`](src/styles/components.css) so `.landing`, `.site-nav`, and `.page` span `width: 100%; max-width: 100%` with responsive fluid padding (`clamp(20px, 3vw, 48px)`).
  - Expanded `.feature-grid` on wide desktop monitors (`> 1180px`) to a **4-column grid** (`grid-template-columns: repeat(4, 1fr)`).
  - Removed the left and right borders and border-radius from `.tools` ([`src/styles/components.css`](src/styles/components.css)) and `.treewrap` ([`src/styles/tree.css`](src/styles/tree.css)), and expanded the canvas height to `calc(100vh - 210px)`.

### 3. Non-Destructive Local + Cloud Persistence & Member Restoration
- **Restored All 49 Members in Private Cloud Tree**:
  - Updated the owner-restricted private tree (`trees/tree_gupta_private_akg`, `isPublic: false`) in Cloud Firestore so all 9 manually added family members (`Ganesh Prashad Gupta`, `Ram Janki Devi`, `Vishnu Gupta`, `Rashmi Gupta`, `Om Prakash Gupta`, `Raghav Gupta`, `Atharv Gupta`, `Arnav Gupta`, `Adhira Gupta`) are permanently preserved alongside the 40 base members (**49 members total**, verified with **0 card overlaps** across Mode 1 and all 49 perspectives in Mode 2).
- **Non-Destructive Local History Merge ([`src/utils/storage.js`](src/utils/storage.js) & [`src/services/treeSync.js`](src/services/treeSync.js))**:
  - Implemented `mergeCloudTreeWithLocalHistory(cloudData, treeId, isPublic)` which inspects all browser `localStorage` keys (`gupta-family-tree-v3`, `gupta-family-tree-v2`, `gupta-family-tree-v1`, `gupta_multi_trees_v1`, `demo-family-tree-v1`) and non-destructively merges any locally added members, couples, or children into incoming Cloud Firestore snapshots.
  - Added explicit deletion tombstones (`recordDeletedId` / `clearDeletedIds`) so intentionally deleted members are never resurrected by the merge, while newly added members are never lost during code updates or page reloads.
  - Updated `saveUserTreeDebounced` in [`src/services/treeSync.js`](src/services/treeSync.js) to write to `localStorage` synchronously (`0ms` delay) before the `600ms` debounced Cloud Firestore write.

### 4. Interactive User Tutorials & Frequently Asked Questions (FAQ)
- **Bilingual Tutorials & FAQ Sections**:
  - Added **How VanshVriksha Works — Quick Start Tutorials** (`Step 01` to `Step 04`) and **Frequently Asked Questions (FAQ)** (`faq1` to `faq4`) in English ([`src/i18n/en.js`](src/i18n/en.js)) and Hindi ([`src/i18n/hi.js`](src/i18n/hi.js)).
  - Rendered both sections on the Home landing screen ([`src/components/LandingPage.jsx`](src/components/LandingPage.jsx)) with responsive grid cards and native accessible `<details className="faq-item">` accordions styled in [`src/styles/landing.css`](src/styles/landing.css).

---

## Previous Milestones

### Public Demo Tree & Private Cloud Isolation
- Created [`src/data/demoFamilyData.js`](src/data/demoFamilyData.js) featuring the fictional **Sharma Family Tree (Demo)** (24 members across 5 generations) as the default public guest experience (`trees/tree_demo_sharma`, `isPublic: true`).
- Isolated the personal Gupta Family Tree into a strictly private Cloud Firestore document (`trees/tree_gupta_private_akg`, `isPublic: false`) protected by [`firestore.rules`](firestore.rules).

### Motion Animations, Collapsible `✦` Star Dock & Viewport Modes
- Integrated [`motion`](https://github.com/motiondivision/motion) (`motion/react`) for spring-physics view transitions and modal entrances, and [`@formkit/auto-animate`](https://github.com/formkit/auto-animate) for smooth list and card layout transitions.
- Replaced permanent zoom/fit buttons with a collapsible bottom-right **`✦` Star Dock** ([`src/components/TreeCanvas.jsx`](src/components/TreeCanvas.jsx)) that expands only on hover or keyboard focus.
- Added a **Laptop (`💻`) / Mobile (`📱`) Viewport Mode Switcher** in [`src/components/Navbar.jsx`](src/components/Navbar.jsx) and hover/focus-revealed contextual explanations (`.hint-pill` / `.info-popover-wrap`).

### WCAG 2.1 AA Accessibility & Bilingual Vedic Kinship Engine
- Full keyboard navigation, skip-to-content link, modal focus trapping (`useFocusTrap.js`), `prefers-reduced-motion` support, and bilingual Hindi/English kinship calculation across 6 generations (`src/utils/relationship.js`).
