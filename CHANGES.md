# VanshVriksha (वंशवृक्ष) — Architecture & Release Changelog

## Latest Release — Family Sharing & Relatives Access (`ShareTreeModal`), `vanshvriksha.web.app` Domain, 3-Way Navigation & Mobile Bar

### 0. Multi-Method Family Sharing & Relatives Access ([`src/components/ShareTreeModal.jsx`](src/components/ShareTreeModal.jsx), [`src/services/treeSync.js`](src/services/treeSync.js), [`firestore.rules`](firestore.rules))
- **Invite Relatives by Email (`viewerEmails` / `editorEmails`)**: Tree owners can invite family members by email with either **👁 View Only** or **✎ Can Edit & Add Members** permissions. When an invited relative signs in with Google or Email on [`vanshvriksha.web.app`](https://vanshvriksha.web.app), the shared family lineage opens automatically for them.
- **Family Access Code & 1-Click WhatsApp Invite Link (`shareCode` / `shareCodeRole`)**: Owners can set or generate a memorable Family Access Code (e.g., `GUPTA-2026`) and copy a 1-click invite link (`?view=tree&tree=<id>&code=<code>`). Any relative can either open that link or enter the code into the **Join a Family Tree with an Access Code** box inside [`ShareTreeModal.jsx`](src/components/ShareTreeModal.jsx) or [`CreateTreeModal.jsx`](src/components/CreateTreeModal.jsx).
- **1-Click Visibility Toggle (`isPublic`)**: Switch between **🔒 Private (Invited Family & Code Only)** and **🌐 Public View-Only (Anyone with link)** at any time.
- **Primary Live Domain Switched to [`https://vanshvriksha.web.app`](https://vanshvriksha.web.app)**: Configured `vanshvriksha.web.app` in [`firebase.json`](firebase.json) and added `vanshvriksha.web.app` + `vanshvriksha.firebaseapp.com` to Firebase Authentication's Authorized Domains so **Continue with Google** works seamlessly.

### 1. 3-Way Primary Navigation & Signed-In Demo Tree Bugfix ([`src/components/Navbar.jsx`](src/components/Navbar.jsx), [`src/App.jsx`](src/App.jsx))
- **3-Way View Switcher (`Home` · `Demo Tree` · `My Private Tree`)**: Replaced the single toggle with a WAI-ARIA `role="tablist"` 3-way switcher in the top navigation bar supporting full keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`, `Enter`, `Space`).
- **Signed-In Demo Tree Isolation**: Clicking **Explore Demo Tree** (from either the Home landing page or the Navbar) while signed in now strictly loads the public Demo Tree (`activeTreeId = ""`) without redirecting into the user's private tree.
- **Persistent Active View & Ownership Status Badge (`.nav-status-badge`)**: Displays accurate context (`Viewing: Public Demo Tree`, `Viewing: <Tree Title> · Your tree`, or `Read-only`) and never falsely labels the Demo Tree as `Your tree` when signed in.

### 2. Zero-Loss State Preservation & 1-Click Private Tree Memory ([`src/utils/storage.js`](src/utils/storage.js), [`src/components/Canvas.jsx`](src/components/Canvas.jsx))
- **Active Tree Memory (`gupta_last_private_tree_id`)**: Remembers the user's most recently accessed private tree ID so switching between **Home**, **Demo Tree**, and **My Private Tree** restores their private tree in a single click.
- **Canvas & Perspective Persistence**: Preserves zoom level (`gupta_canvas_zoom`), pan scroll coordinates (`gupta_canvas_pan`), and selected person perspective across view switches without data loss.

### 3. URL Synchronization & Refresh Redirect Elimination ([`src/services/treeSync.js`](src/services/treeSync.js), [`src/App.jsx`](src/App.jsx))
- **Deep-Linkable Query Parameters**: Synchronizes workspace views with `/?view=home`, `/?view=tree`, and `/?view=tree&tree=<id>`, including full browser **Back / Forward** (`popstate`) history support.
- **No Unwanted Home Refresh Redirect**: Refreshing the browser while on `/?view=home` keeps the user on the Home landing page instead of redirecting into a previously viewed tree.

### 4. Contextual Workspace Breadcrumbs & Mobile Bottom Navigation ([`src/components/Breadcrumbs.jsx`](src/components/Breadcrumbs.jsx), [`src/components/MobileBottomNav.jsx`](src/components/MobileBottomNav.jsx))
- **Contextual Workspace Breadcrumbs (`.workspace-breadcrumbs`)**: Renders an interactive `Home › <Tree Name> › Perspective: <Person Name>` trail above the tree header with 1-click perspective reset and Home navigation.
- **Responsive Mobile Bottom Bar (`.mobile-bottom-nav`)**: Provides 4 accessible (`>= 44×44px`) thumb-zone navigation buttons (**Home**, **Demo**, **My Tree**, **Menu**) on mobile viewports (`<= 768px` and `data-viewport="mobile"`) with full English (`src/i18n/en.js`) and Hindi (`src/i18n/hi.js`) parity.
- **109-Test E2E Navigation Suite ([`tests/e2e-navigation.test.mjs`](tests/e2e-navigation.test.mjs))**: Added 109 automated E2E tests across Tiers 1–4 (`npm test`).

---

## Previous Release — Full-Screen Desktop Experience, Non-Destructive Cloud+Local Sync, Interactive Tutorials & FAQs

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
