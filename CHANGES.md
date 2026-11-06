# Gupta Family Tree — Change Log & Context File

> **Purpose:** This file tracks every change made to the project during this conversation. It doubles as a living context snapshot so any future session can pick up exactly where we left off. Update this file after every significant change.

---

## 📁 Project Overview

| Item | Detail |
|---|---|
| **Project** | Gupta Family Tree |
| **Owner** | Arpit Kumar Gupta |
| **Location** | `c:\B-Tech 1st year\Family Tree\` |
| **Tech** | Modular React 18 + Vite 5 + Firebase v11 (Auth + Cloud Firestore + Hosting) |
| **Cloud Backend** | Firebase Project `gupta-family-tree-akg` (Cloud Firestore `(default)` in `asia-south1`) |
| **Live Deployment** | **Firebase Hosting:** https://gupta-family-tree-akg.web.app |
| **GitHub Repository** | https://github.com/arpitkumar81008-cmd/family-tree (`main` branch) |
| **Local Storage** | Browser `localStorage` — canonical key `gupta-family-tree-v3` (with explicit allow-list migration from `v1`/`v2` and isolated `gupta_multi_trees_v1` for custom trees) |

---

## 👨‍👩‍👧‍👦 Family Data (User-Confirmed — 40 Members across 5 Generations)

### Generation 0 — Founding Ancestors (Great-Great-Grandparents)
| Person | Hindi | Role | Status |
|---|---|---|---|
| Badri Prasad | बद्री प्रसाद | Root Patriarch | Late (स्वर्गवासी) |
| Haudi Devi | हौदी देवी | Root Matriarch | Late (स्वर्गवासी) |

### Generation 1 — Grandparents
| Person | Hindi | Role | Status |
|---|---|---|---|
| Sukdev Prasad | सुखदेव प्रसाद | Son of Badri & Haudi | Late (स्वर्गवासी) |
| Surati Devi | सुरती देवी | Wife of Sukdev Prasad | Late (स्वर्गवासी) |

### Generation 2 — Parents Generation (Gupta Ancestors + In-Laws & Spouses)
| Person | Hindi | Spouse | Hindi | Status |
|---|---|---|---|---|
| Ram Dayal Gupta | राम दयाल गुप्ता | Shrimani Devi | श्रीमणि देवी | Ram: Alive, Shrimani: Late |
| Prabud Dayal Gupta | प्रभुदयाल गुप्ता | Kamla Devi | कमला देवी | Alive |
| Savitri Devi (Sister 1) | सावित्री देवी | Ramanand Prasad | रामानंद प्रसाद | Alive |
| Pushpa Devi (Sister 2) | पुष्पा देवी | Ramayan Prasad | रामायण प्रसाद | Alive |
| Gayatri Devi (Sister 3) | गायत्री देवी | *(none)* | — | Late (स्वर्गवासी) |
| Manju Devi (Sister 4) | मंजू देवी | Lalaji Prasad | लालाजी प्रसाद | Alive |
| Anant Kumar Gupta | अनंत कुमार गुप्ता | Radha Gupta | राधा गुप्ता | Minal's Father (Alive) |
| Radha Gupta | राधा गुप्ता | Anant Kumar Gupta | अनंत कुमार गुप्ता | Minal's Mother (Alive) |

### Generation 3 — Focal Generation (Children of Ram Dayal, Prabud Dayal & In-Laws)
| Person | Hindi | Spouse | Parents | Status |
|---|---|---|---|---|
| Hari Om Gupta | हरि ओम गुप्ता | Minal Gupta (मिनल गुप्ता) | Ram Dayal & Shrimani | Alive |
| Minal Gupta | मिनल गुप्ता | Hari Om Gupta (हरि ओम गुप्ता) | Anant Kumar & Radha | Alive |
| Sonal Gupta | सोनल गुप्ता | — | Anant Kumar & Radha | Alive (Sister of Minal) |
| Amit Gupta | अमित गुप्ता | — | Anant Kumar & Radha | Alive (Brother of Minal) |
| Neha Gupta | नेहा गुप्ता | — | Anant Kumar & Radha | Alive (Sister of Minal) |
| Hari Narayan Gupta | हरि नारायण गुप्ता | Parul Gupta (पारुल गुप्ता) | Ram Dayal & Shrimani | Alive |
| Ashutosh Gupta | आशुतोष गुप्ता | Sneha Gupta (स्नेहा गुप्ता) | Ram Dayal & Shrimani | Alive |
| Akhilesh Gupta | अखिलेश गुप्ता | Priya Gupta (प्रिया गुप्ता) | Ram Dayal & Shrimani | Alive |
| Navin Kumar Gupta | नवीन कुमार गुप्ता | — | Prabud Dayal & Kamla Devi | Alive |
| Munni Devi | मुन्नी देवी | — | Prabud Dayal & Kamla Devi | Alive |
| Hari Krishna Gupta | हरि कृष्ण गुप्ता | — | Prabud Dayal & Kamla Devi | Alive |
| Sitaram Gupta | सीताराम गुप्ता | — | Prabud Dayal & Kamla Devi | Late (स्वर्गवासी) |

### Generation 4 — Grandchildren Generation
| Parents | Children |
|---|---|
| Hari Om & Minal | Arpit Kumar Gupta, Abhinav Kumar Gupta, Anurag Kumar Gupta |
| Hari Narayan & Parul | Akshay Gupta, Akshara Gupta |
| Ashutosh & Sneha | Rishabh Gupta, Anika Gupta |
| Akhilesh & Priya | Nayra Gupta |

**Total: 40 members across 5 generations (Gen 0 to Gen 4).**

---

## 🗂️ Project Files (Modular Vite + Firebase Architecture)

| File | Description |
|---|---|
| `index.html` | Vite application entry HTML |
| `src/main.jsx` | React 18 root bootstrap |
| `src/App.jsx` | Root state orchestrator, auth/tree sync, keyboard shortcuts, and view router |
| `src/layout/engine.js` | Dual-mode spatial layout engine (Mode 1 Top-Down Subtree Packing + Mode 2 Bilateral Orthogonal Manhattan Flowchart) |
| `src/data/familyData.js` | Canonical 40-member dataset (`INITIAL_DATA`) and `buildFamilyIndex` lookup engine |
| `src/data/schema.js` | Strict schema validation (`validateTreeData`) for imports and cloud persistence |
| `src/utils/kinship.js` | Bilingual English + Hindi kinship calculator (`calculateKinship`) |
| `src/utils/deduplication.js` | Pure deduplication (`dedup`) and legacy storage union (`deepMergeTree`) |
| `src/utils/storage.js` | Explicit `LEGACY_KEYS` allow-list persistence for the canonical Gupta tree |
| `src/services/firebase.js` | Modular Firebase v11 client (Google & Email/Password Auth + Cloud Firestore with persistent IndexedDB multi-tab cache) |
| `src/services/treeSync.js` | Multi-tree cloud/local synchronization service with pending-write loop guards & 1200ms debounced saves |
| `src/components/` | `Navbar.jsx`, `LandingPage.jsx`, `Canvas.jsx`, `CanvasDock.jsx`, `Card.jsx`, `Sheet.jsx`, `Toolbar.jsx`, `Tabs.jsx`, `AddModal.jsx`, `CreateTreeModal.jsx`, `AuthModal.jsx`, `SettingsPopover.jsx`, `HelpModal.jsx` |
| `firestore.rules` | Production Cloud Firestore security rules (public read for `isPublic == true`, owner/collaborator write enforcement, schema invariants) |

---

## 🎨 Design System (Current)

| Token | Light Mode | Dark Mode |
|---|---|---|
| Background (`--bg`) | `#eceeea` bone-white | `#0b0f0d` |
| Surface (`--surface`) | `#f8f9f6` | `#121816` |
| Ink (`--ink`) | `#0a0f0d` near-black | `#f1f3ee` |
| Accent (`--accent`) | `#e4002b` red | `#ff4560` |
| Muted (`--muted`) | `#4a524e` | `#a3aba6` |

**Fonts:**
- Display / names: `Bodoni Moda`, `Tiro Devanagari Hindi`
- Body: `Familjen Grotesk`, `Hind`
- All sourced from Google Fonts CDN

**Style rules:** Subtle corner curvature (`5px` on cards, `4px` on buttons/inputs/chips, `6px` on sheets/modals/popovers), crisp `1px` hairlines, zero gradients/blobs.

---

## ⚙️ Features (Current State — Version 8 Cloud + Modular Vite)

| Feature | Status |
|---|---|
| Editorial Landing Page (Hero, Metrics Strip, Feature Grid, Founder Spotlight, Builder Banner) | ✅ |
| Sticky Top Navbar (`Home`, `Interactive Tree`, `Create Your Own Tree`, Auth status, Share Link, `⋮` Settings) | ✅ |
| Floating Canvas Dock (`Viewing as`, `+`/`−` zoom, `%` readout, `Fit`) | ✅ |
| Interactive tree with 2D drag-to-pan & zoom | ✅ |
| Dynamic card height scaling (`138px` / `152px` / `168px`) synced with Text Size (`Default` / `Large` / `XL`) | ✅ |
| English ↔ Hindi language switch | ✅ |
| Hindi kinship terms with `जी` honorifics | ✅ |
| "See relations from" dropdown & Mode 2 Bilateral Orthogonal Flowchart | ✅ |
| Photo upload per person (compressed `160px` JPEG @ `0.72` quality, 750 KB cloud safety guard) | ✅ |
| Search with card highlighting & auto-scroll | ✅ |
| Edit name, Hindi name, DOB, note, "passed away" (enforced read-only when viewing another user's public tree) | ✅ |
| Automated English → Hindi transliteration / translation | ✅ |
| Global "+ Add Member" modal (Child, Spouse, Sibling, Parent, Root Branch) | ✅ |
| Multi-Tree Directory & Builder ("Create Your Own Tree" with Private-by-default toggle & JSON import) | ✅ |
| Firebase Authentication (Google Sign-In + Email/Password Sign-In & Sign-Up) | ✅ |
| Live Cloud Firestore Database (`gupta-family-tree-akg` in `asia-south1`) with real-time `onSnapshot` sync | ✅ |
| Dual Live Hosting (Firebase Hosting + GitHub Pages CI/CD) | ✅ |

---

## 📝 Change Log

Each entry records **what changed, why, and which files were affected**.

---

### Session 1 — Previous Claude Session (before Nov 5, 2026)

> *Reconstructed from `Gupta Family Tree Project Summary.md`*

| # | Request | Outcome | Files Changed |
|---|---|---|---|
| 1 | Build family tree site (ask questions first, allow photos later) | Initial build; family data collected via Q&A | `Gupta Family Tree.html` created |
| 2 | Minimalist, no-AI-slop style: distinct fonts, one dominant BG, one sharp accent | Complete visual redesign; Bodoni Moda + Familjen Grotesk + red accent | `.html` |
| 3 | Adjust page to text so nothing overflows or overlaps | Layout fixed; cards size to content | `.html` |
| 4 | Add language option | English ↔ Hindi toggle added | `.html` |
| 5 | Keep all wording respectful and parliamentary in every language | Copy reviewed and updated | `.html` |
| 6 | Bug fix: page appeared blank after language change | Script error introduced and fixed | `.html` |
| 7 | "Improve the webpage with more functionality" (web-artifacts-builder skill) | React rebuild (Version 6): pan/zoom, finder, backup/restore, search, photo upload, birthday panel, dark mode, add/remove/edit people | `.html` rebuilt as React bundle |

---

### Session 2 — Nov 5–7, 2026 (This Conversation)

| # | Date | Request | Outcome | Files Changed |
|---|---|---|---|---|
| 1 | 2026-11-05 | Read project & create a changes/context tracking file | This file created | `CHANGES.md` *(this file)* |
| 2 | 2026-11-05 | Accessibility & UI review | Static code analysis completed; full report in `A11Y-Review.md`. 3 critical issues, 4 serious, 4 moderate, 6 polish. | `A11Y-Review.md` |
| 3 | 2026-11-05 | Implement A11y & UI audit fixes | Implemented fixes for C1–C3, S1–S3, M1–M5, P1–P5 in `Gupta Family Tree.html`. Verified via headless Chrome CDP. | `Gupta Family Tree.html` |
| 4 | 2026-11-05 | Automated English → Hindi transliteration & Add Family Member functionality | Implemented dual-engine transliteration (Google Input Tools + offline phonetic Devanagari engine). Added global "+ Add Member" modal and "Add parent" in Sheet. | `Gupta Family Tree.html` |
| 5 | 2026-11-05 | Add Member pop-up bug fixes & duplicate prevention | Fixed pop-up close on submit, added rapid-click guard, backdrop dismissal, and duplicate person confirmation prompt. | `Gupta Family Tree.html` |
| 6 | 2026-11-05 | Remove duplicate copies of Anant Kumar Gupta & auto-deduplication engine | Built automatic `dedup(state)` engine cleaning duplicate records, remapping IDs, and deduplicating couples/kids/photos. | `Gupta Family Tree.html` |
| 7 | 2026-11-05 | Generation Management & DAG Layout Engine Overhaul | Rewrote generation solver, bottom-up parent centering, staggered bus lines, generation rails (`Gen 1...`), and branch hover highlighting. | `Gupta Family Tree.html` |
| 8 | 2026-11-05 | Bilateral Person-Centric Dynamic Flowchart & Extended Lineage (35 Members, Gen 0-4) | Added 17 extended family members (Badri Prasad & Haudi Devi root, Sukdev & Surati, Prabud Dayal branch, aunts/uncles) and dual-mode layout engine. | `Gupta Family Tree.html` |
| 9 | 2026-11-05 | Zero-Collision Subtree-Packing Layout, Multi-Version Storage Union & Complete Maternal Restoration (40 Members) | Replaced heuristic shifting with mathematical Subtree-Packing (`computeSubtreeLayout`), implemented `deepMergeTree` across historical localStorage keys, and restored all 40 canonical members. | `Gupta Family Tree.html`, `CHANGES.md` |
| 10 | 2026-11-05 | Directional Sequential Flowchart, Generation Tab Removal, Button Contrast & Layout Alignment | Rewrote Mode 2 directional routing, removed generation grid lines in focus view, fixed button contrast and top-bar overlap. | `Gupta Family Tree.html`, `CHANGES.md` |
| 11 | 2026-11-05 | Figma Design System Rules Doc (`CLAUDE.md`), New-User Guidance, Keyboard Shortcuts & A11y Overhaul | Created `CLAUDE.md`, added dismissible `.quick-guide` banner, `/` search shortcut, and `?` `HelpModal` keyboard guide. | `Gupta Family Tree.html`, `CLAUDE.md`, `CHANGES.md` |
| 12 | 2026-11-05 | Main Family Branch Centrality (Badri Prasad Patriarch) & Modular Aside Spouse Branches | Anchored Badri Prasad & Haudi Devi as the central main branch root and positioned in-law branches aside with bridge connectors. | `Gupta Family Tree.html`, `CHANGES.md` |
| 13 | 2026-11-05 | Distinct Connector Line Colors for Main Family Branch vs Other In-Law Branches | Styled main branch lines in bold red (`#e4002b`/`#ff4560`, 2px), in-law lines in neutral slate (`1.5px`), and cross-branch bridges in dashed slate. | `Gupta Family Tree.html`, `CHANGES.md` |
| 14 | 2026-11-06 | Red Line Removal, Leftward Paternal Ancestry Branching, Drag-to-Pan & In-Law Parent Hierarchy | Eliminated slicing horizontal lines, branched paternal ancestor siblings leftward in Mode 2, added 2D drag-to-pan on `.treewrap`, and made in-law subtrees recursive. | `Gupta Family Tree.html`, `CHANGES.md` |
| 15 | 2026-11-06 | Comprehensive Program Audit, UI Analysis & Accessibility (A11y) Evaluation | Audited all 40 members across Mode 1 & Mode 2, responsive viewports, and WCAG 2.1 contrast; documented in `COMPLETE-SYSTEM-AUDIT-REPORT.md`. | `COMPLETE-SYSTEM-AUDIT-REPORT.md`, `CHANGES.md` |
| 16 | 2026-11-06 | Three-Dot Accessibility & Settings Popover, Subtle Corner Curvature, Orthogonal Flowchart Routing & True Branch Integration | Added `⋮` Settings Popover (Language, Theme, Text Size, Contrast, Motion), subtle `4px–6px` border-radius, orthogonal Manhattan routing in Mode 2, and removed artificial "EXTENDED FAMILY" dump row. | `Gupta Family Tree.html`, `CLAUDE.md`, `CHANGES.md` |
| 17 | 2026-11-06 | Modular Vite Refactor & Multi-Module Architecture | Refactored the monolithic single-file `Gupta Family Tree.html` into a clean, maintainable Vite + React 18 ES-module project (`src/data/`, `src/i18n/`, `src/layout/`, `src/utils/`, `src/components/`, `src/styles/`). Configured `vite.config.js` with manual vendor chunk splitting (`react-vendor`, `firebase-vendor`). | `package.json`, `vite.config.js`, `index.html`, `src/**` |
| 18 | 2026-11-06 | Editorial Landing Page, Sticky Navbar, Floating Canvas Dock & Multi-Tree Builder | Designed and implemented `LandingPage.jsx` (Editorial Hero, 4-column Metrics Strip, 2×2 Feature Grid, Badri Prasad & Haudi Devi Spotlight, and Builder CTA), `Navbar.jsx` (`Home`, `Interactive Tree`, `Create Your Own Tree`, live member/generation badge, share link, `⋮` settings), `CanvasDock.jsx` (floating bottom-right HUD for zoom/fit/perspective), and `CreateTreeModal.jsx`. | `src/components/LandingPage.jsx`, `src/components/Navbar.jsx`, `src/components/CanvasDock.jsx`, `src/components/CreateTreeModal.jsx`, `src/styles/main.css` |
| 19 | 2026-11-06 | Firebase Auth, Cloud Firestore (`gupta-family-tree-akg`) & Dual Deployment (Firebase Hosting + GitHub Pages) | Provisioned Firebase project `gupta-family-tree-akg`, created Cloud Firestore `(default)` database in `asia-south1`, deployed `firestore.rules` & `firestore.indexes.json`, enabled Google + Email/Password + Anonymous Auth, wired `src/services/firebase.js` and `src/services/treeSync.js` with persistent IndexedDB multi-tab cache, deployed to Firebase Hosting (`https://gupta-family-tree-akg.web.app`), and configured GitHub Actions (`deploy.yml`) for automatic GitHub Pages deployment (`https://arpitkumar81008-cmd.github.io/family-tree/`). | `src/services/firebase.js`, `src/services/treeSync.js`, `src/components/AuthModal.jsx`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, `.github/workflows/deploy.yml` |
| 20 | 2026-11-07 | System Architecture & Deep Edge-Case Bug Fixes | **1.** Fixed infinite Firestore `onSnapshot` ↔ `saveUserTree` write loop via `isLocalMutationRef`, `snap.metadata.hasPendingWrites` guard, and `saveUserTreeDebounced` (1200ms). **2.** Removed hardcoded personal email/name from `AuthModal.jsx` and omitted `ownerEmail` from public Firestore documents. **3.** Fixed `dedup()` in `src/utils/deduplication.js` so importing or deduplicating a custom tree is a pure function that never overwrites the canonical `STORAGE_KEY` (`gupta-family-tree-v3`) in `localStorage`, and preserved `remap.get(viewer)`. **4.** Fixed multi-marriage child indexing in `buildFamilyIndex` (`src/data/familyData.js`) so a parent with multiple marriage entries retains all children instead of overwriting `children[id]`. **5.** Fixed custom-tree patriarch root walk-up, dynamic main/in-law branch header labels, and cycle-safe recursion guards (`visitedItems`) in `src/layout/engine.js`. **6.** Synced `cardHeight` (`138` / `152` / `168px`) dynamically with `textSize` (`normal` / `large` / `xlarge`) across `App.jsx`, `Canvas.jsx`, and `Card.jsx` so large-text mode never overlaps connectors. **7.** Unified `BackupPanel` in `Tabs.jsx` with `validateTreeData` schema validation and normalized empty Hindi names in `Sheet.jsx`. | `src/App.jsx`, `src/services/treeSync.js`, `src/services/firebase.js`, `src/utils/deduplication.js`, `src/utils/storage.js`, `src/data/familyData.js`, `src/layout/engine.js`, `src/components/Card.jsx`, `src/components/Canvas.jsx`, `src/components/Sheet.jsx`, `src/components/Tabs.jsx`, `src/components/AuthModal.jsx`, `CHANGES.md` |

---

## 🔖 How to Use This File

1. **At the start of each session** — read this file to restore full context.
2. **After every change** — add a row to the **Session Change Log** table above with: date, request summary, what was done, files affected.
3. **When features are verified** — update the "Last Verified State" section.
