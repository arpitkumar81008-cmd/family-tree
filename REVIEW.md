# VanshVriksha — Code, Security & UI Review

**Repo reviewed:** `arpitkumar81008-cmd/family-tree` (commit `6a579df`, shallow clone, 1 commit visible)
**Review date:** 13 Nov 2026
**Method:** Static read of the source, Firestore rules, config, docs, tests and your annotated UI screenshots/PDFs in `ui changes/`.

## What I could and could not check

| Item | Status |
|---|---|
| Source code, `firestore.rules`, config, docs, tests (read) | Done |
| `npm ci`, `npm run build`, `npm test` | **Not run.** The sandbox blocked installing and running the repo's code. Your CHANGES.md says 109 tests pass; I could not confirm that. |
| Live UI of vanshvriksha.web.app | **Not rendered.** The site is a JavaScript app, so a page fetch returns only the title. UI findings come from the CSS/components plus your screenshots (dated 7 Nov, from the older `gupta-family-tree-akg.web.app` build). Re-check each UI item on the live site. |
| Firebase console (API key restrictions, deployed rules, authorized domains) | Not accessible |
| Git history before the latest commit | Not visible (shallow clone). See item S7. |

Every finding below cites the file it came from. "Confirmed" means I read the exact code that causes it. "Likely" means it follows from the code but I did not execute it.

---

## 1. Summary

The app is well organised for a solo project: clear folders, a real layout engine, kinship logic, matching English/Hindi dictionaries (287 keys each, no gaps), accessibility settings, and an unusually large test suite. The risks are concentrated in three places:

1. **Firestore security rules do not protect shared trees** (anyone with a tree ID can read, and for editor-code trees, write).
2. **Multi-device sync can undo other people's edits and resurrect deleted people.**
3. **Real family names and screenshots are in a public repo**, which contradicts the "no private data shipped" comment in `familyData.js`.

Fix the Critical and High items first. The rest is polish.

---

## 2. Security findings

### S1 — CRITICAL: anyone can edit a tree that has an "editor" share code (no sign-in needed)
**Status:** `Fixed` (in code) · `Needs console step (see DEPLOY_STEPS.md)` — Removed share-code editing from `firestore.rules`; added `redeemShareCode` Cloud Function (`functions/index.js`) that adds the caller's UID to `collaboratorUids`. Deploy rules & functions per `DEPLOY_STEPS.md`.
**File:** `firestore.rules`, `isShareCodeEditor()` and `allow update`
**Confirmed.** `isShareCodeEditor()` only checks that the stored document has a share code and `shareCodeRole == 'editor'`. It never checks that the requester knows the code or is even signed in. So any client that knows the tree ID can run `updateDoc` and change `data`, `photos`, `title` and `lang`, including blanking the whole tree.
Tree IDs travel inside every invite link (`?tree=<id>`), so everyone who ever received a link has the ID.
**Fix:** Remove share-code editing from the rules. Give editor access only through `collaboratorUids` (UID-based) or verified `editorEmails`. If you want code-based joining, redeem the code through a Cloud Function that adds the caller's UID to `collaboratorUids`.

### S2 — CRITICAL: the "Family Access Code" does not actually protect reads
**Status:** `Fixed` (in code) · `Needs console step (see DEPLOY_STEPS.md)` — Removed `hasActiveShareCode()` read access from `firestore.rules`; share codes are now redeemed server-side via `redeemShareCode` (`functions/index.js`). Deploy rules & functions per `DEPLOY_STEPS.md`.
**File:** `firestore.rules`, `allow get` / `hasActiveShareCode()`
**Confirmed.** `get` is allowed whenever the document has any share code, regardless of what the visitor supplies. The code is stored in the same document, so reading the document reveals it. The only check is `hasMatchingShareCode()` in client JavaScript (`treeSync.js`), which anyone can bypass.
**Fix:** Same approach as S1: never allow reads based on the mere existence of a code. Redeem codes server-side (Cloud Function) and grant access by UID.

### S3 — HIGH: share codes can be as short as 3 characters and can be searched for
**Status:** `Fixed` (in code) · `Needs console step (see DEPLOY_STEPS.md)` — Removed unauthenticated `shareCode` `list` queries from `firestore.rules`, enforced `>= 10` char tokens in `generatePrivateShareToken()` (`treeSync.js`), and added per-UID rate limiting in `redeemShareCode` (`functions/index.js`). Deploy rules & functions per `DEPLOY_STEPS.md`.
**Files:** `firestore.rules` (`size() >= 3`), `treeSync.js` `findTreeByShareCode`, `ShareTreeModal.jsx`
**Confirmed.** The owner can type any code. The rule's `list` clause allows any visitor to run `where('shareCode','==',X)` with `limit <= 5`, with no sign-in and no rate limit. A short code can be brute-forced. The generated token (12 chars) is fine; user-chosen ones are not.
**Fix:** Require 10+ characters and generate them only with `generatePrivateShareToken()`. Do the lookup server-side with rate limiting.

### S4 — HIGH: email invites can be claimed by someone who does not own the email
**Status:** `Fixed` (in code) · `Needs console step (see DEPLOY_STEPS.md)` — Added `request.auth.token.email_verified == true` to `hasAuthEmail()` in `firestore.rules` and `sendEmailVerification` to `signUpWithEmail` in `src/services/firebase.js`. Deploy rules per `DEPLOY_STEPS.md`.
**Files:** `firestore.rules` (`isEmailEditor` / `isEmailViewer`), `firebase.js` `signUpWithEmail`
**Confirmed.** The rules trust `request.auth.token.email`, but sign-up uses `createUserWithEmailAndPassword` and the code never calls `sendEmailVerification` (no match for it anywhere in `src/`). Anyone can register an email address that was invited and inherit its access.
**Fix:** Add `request.auth.token.email_verified == true` to `hasAuthEmail()`, and send a verification email on sign-up (or allow Google sign-in only).

### S5 — HIGH: invited family emails are readable by anyone who can read the tree
**Status:** `Fixed` (in code) · `Needs console step (see DEPLOY_STEPS.md)` — Moved `viewerEmails`, `editorEmails`, `shareCode`, and `shareCodeRole` to `trees/{id}/private/sharing` (owner-only in `firestore.rules`, `treeSync.js`, and `ShareTreeModal.jsx`). Deploy rules per `DEPLOY_STEPS.md`.
**Files:** `firestore.rules` / `createUserTree`
**Confirmed.** `viewerEmails`, `editorEmails`, `ownerName` and `shareCode` live in the same document as the tree. A public tree, or any tree with a share code (S2), exposes those emails and the code to every reader.
**Fix:** Move sharing data to a subcollection (`trees/{id}/private/sharing`) that only the owner can read, or keep UID lists only.

### S6 — MEDIUM: tree IDs are guessable
**Status:** `Fixed` — `createUserTree` in `src/services/treeSync.js` now generates tree IDs using Firestore's auto-ID (`doc(collection(db, 'trees')).id`).
**File:** `treeSync.js` `createUserTree`
**Confirmed.** ID = `'tree_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7)`. The timestamp is predictable and `Math.random` is not cryptographic.
**Fix:** Use Firestore's auto-ID (`doc(collection(db,'trees'))`) or `crypto.randomUUID()`.

### S7 — MEDIUM: real family data and screenshots in a public repo
**Status:** `Fixed` (in working tree) · `Needs console step (see DEPLOY_STEPS.md)` — Removed `tree_gupta_private_akg` and legacy keys from `src/utils/storage.js`, genericized `OFFLINE_NAMES` in `src/i18n/translit.js`, and removed personal `supportEmail` from `firebase.json`. Git history search/purge (`ui changes/`, `CHANGES.md`) requires manual steps in `DEPLOY_STEPS.md` §6.
**Confirmed in the files I read:**
- `ui changes/*.png|*.pdf` contain real names (e.g. Ram Dayal Gupta, Arpit Kumar Gupta, Sukdev Prasad, Badri Prasad Gupta, Haudi Devi) and a JSON backup snippet. `.gitignore` lists `ui changes/`, but the files are committed anyway (ignore rules do not apply to already-tracked files).
- `CHANGES.md` lists members by full name (Ganesh Prashad Gupta, Ram Janki Devi, Vishnu Gupta, Rashmi Gupta, Om Prakash Gupta, Raghav Gupta, Atharv Gupta, Arnav Gupta, Adhira Gupta, Nehansh Gupta, Minal Gupta, Parul Gupta) and the private tree ID `tree_gupta_private_akg`.
- `translit.js` `OFFLINE_NAMES` contains family first names (arpit, parul, minal, nayra...).
- `storage.js` hard-codes the private tree ID and legacy storage keys.
- `firebase.json` includes a personal support email.
Some of these may be children. Because the repo has only one visible commit here, I could not check older commits.
**Fix:** Remove the folder and names from the repo, move screenshots out, and genericise the changelog. Then check history: `git log --all --stat -- "ui changes" "Gupta Family Tree*"`. If older commits held private files, rewrite history (`git filter-repo`) and treat anything that was public as exposed.

### S8 — MEDIUM: demo data uses real people, including young children, with birth dates
**Status:** `Fixed` — Replaced Kapoor demo data in `src/data/familyData.js` with the fictional 26-member Verma family (`INITIAL_DATA`), with no real people and no children with birth dates (verified in `tests/review-fixes.test.mjs`).
**File:** `src/data/familyData.js`
**Confirmed.** The "public demo" is the Kapoor film family with real dates of birth, including children born in 2016, 2021 and 2022. The README and CLAUDE.md call it a fictional "Sharma" family. Using identifiable minors' birth dates is a privacy and reputational risk.
**Fix:** Replace it with a clearly fictional family and no real dates of birth.

### S9 — LOW/MEDIUM: other hardening items
**Status:** `Fixed` (in code) · `Needs console step (see DEPLOY_STEPS.md)` · `Deferred/Skipped` (version snapshots) — Added `resetPassword` (`sendPasswordResetEmail`) in `firebase.js`/`AuthModal.jsx`, disabled anonymous auth and added security/cache headers (`Referrer-Policy: no-referrer`, `CSP`, `X-Content-Type-Options`) in `firebase.json`, and added a 2000ms `AbortController` timeout in `translit.js`. Restricting the Firebase API key by HTTP referrer and enabling App Check require GCP/Firebase Console steps (`DEPLOY_STEPS.md` §4–§5); full snapshot/undo history is deferred.
- **No password reset.** There is no `sendPasswordResetEmail` anywhere, so a forgotten password locks the user out (`firebase.js`, `AuthModal.jsx`).
- **Anonymous auth is enabled** in `firebase.json` but nothing uses it. Disable it.
- **No security headers or caching rules** in `firebase.json` `hosting` (no CSP, `X-Content-Type-Options`, `Referrer-Policy`, long-cache for `/assets/**`). The `?code=` secret in invite URLs can leak through the `Referer` header; add `Referrer-Policy: no-referrer`.
- **Firebase web config is hard-coded as a fallback** in `firebase.js`. Web API keys are designed to be public, so this is not itself a leak, but it makes the `.env.example` setup pointless and the "local demo mode" in `AuthModal.jsx` unreachable. Restrict the key by HTTP referrer in Google Cloud Console and enable Firebase App Check.
- **Name transliteration sends every typed name to an unofficial Google endpoint** (`translit.js`, `inputtools.google.com`) with no timeout. This is a privacy point for family data and can stall tree creation on a slow network (`handleCreateBlank` awaits it). Add an `AbortController` timeout (about 2 s) and mention it in a privacy note.
- **A collaborator can wipe the tree.** The rules let editors replace `data` with empty lists, and there is no version history. Add snapshots or an undo trail.

---

## 3. Bugs

### B1 — HIGH: import into a new tree crashes when the backup has photos
**Status:** `Fixed` — Fixed `typeof parsed.photos === 'object'` TDZ `ReferenceError` in `src/components/CreateTreeModal.jsx` and moved the import/validation flow into `try/catch` (verified in `tests/review-fixes.test.mjs`).
**File:** `src/components/CreateTreeModal.jsx`, line 135
```js
const photos = parsed.photos && typeof photos === 'object' ? parsed.photos : {};
```
**Confirmed.** `photos` is read inside its own `const` declaration, so `typeof photos` throws a `ReferenceError` (temporal dead zone). It only runs when the backup includes photos. The line is outside the `try/catch`, so the user sees nothing happen.
**Fix:** `const photos = parsed.photos && typeof parsed.photos === 'object' ? parsed.photos : {};`

### B2 — HIGH: stale local copy overwrites other people's edits and resurrects deleted people
**Status:** `Fixed` — Stopped `mergeCloudTreeWithLocalHistory` in `src/utils/storage.js` from overwriting cloud data with stale local cache; cloud snapshots are now the source of truth for signed-in users in `src/App.jsx`.
**Files:** `storage.js` `mergeCloudTreeWithLocalHistory`, `deduplication.js` `deepMergeTree`, `App.jsx` snapshot handler
**Confirmed by reading the logic; reproduce to be sure.** Every cloud snapshot is merged with this device's cached copy, and the local copy wins for any field that exists in both (`{...existing, ...p}`). The union logic also re-adds any person or child link that exists locally but not in the cloud.
Effects with two editors or two devices:
- B renames a person. A's old cached name wins on A's screen, and the next edit by A writes the old name back to the cloud.
- B deletes a person. A's cache still has them, they are "recovered", and `isLocalMutationRef` triggers a write that restores them.
- Unlinking a parent or spouse on one device is undone by the other device's cache.
The delete "tombstones" in `localStorage` only exist on the device that deleted.
**Fix:** Treat the cloud document as the source of truth once signed in. Keep the local cache only as an offline fallback and use Firestore's own persistent cache (already enabled in `firebase.js`). For real concurrent editing, write per-person changes in a transaction (or store each person as its own document) instead of overwriting the whole `data` object.

### B3 — HIGH: whole-document overwrite loses concurrent edits (last writer wins)
**Status:** `Fixed` — Updated `saveUserTree`, `saveTreeData`, and `saveTreePhotos` in `src/services/treeSync.js` to use `runTransaction` with a `version` field for optimistic concurrency.
**File:** `treeSync.js` `saveUserTree`
**Confirmed.** Each save sends the entire `data` and `photos` objects. Two people editing within the same minute clobber each other.
**Fix:** Use `runTransaction` with a `version` field, or split people/couples into subcollections.

### B4 — HIGH: edits can silently stop saving when photos get large
**Status:** `Fixed` — Split `saveTreeData` and `saveTreePhotos` in `src/services/treeSync.js` and added a visible "Not saved — Retry" banner (`saveFailedBanner`) in `src/App.jsx` when saves fail.
**File:** `treeSync.js` `saveUserTree` / `isPhotosPayloadWithinLimit`
**Confirmed.** If `photos` exceeds 750 KB, `saveUserTree` logs a console warning and returns `false`. That also skips saving the people and couples changes in the same call, and `App.jsx` ignores the return value. The UI shows nothing.
**Fix:** Save `data` and `photos` separately, and show a visible "not saved" banner. Better: store photos in Firebase Storage and keep only URLs.

### B5 — MEDIUM: one shared debounce timer for all trees
**Status:** `Fixed` — Replaced the single global `debounceTimer` in `src/services/treeSync.js` with a per-tree `pendingSaves` Map and `flushPendingSaves` on `pagehide` and `visibilitychange`.
**File:** `treeSync.js` `debounceTimer`
**Confirmed.** If the user edits, then switches tree within 600 ms, the pending save for the first tree is cancelled or replaced. Use one timer per tree ID and flush on `pagehide`/`visibilitychange`.

### B6 — MEDIUM: import validation is too weak
**Status:** `Fixed` — Strengthened `validateTreeData` in `src/data/schema.js` to reject duplicate person/couple IDs, a child in multiple couples, ancestor cycles, string length violations, `> 5,000` entries, and `> 900 KB` payloads (verified in `tests/review-fixes.test.mjs`).
**File:** `src/data/schema.js`
**Confirmed.** `validateTreeData` does not check duplicate IDs, the same child in two couples, a person being their own ancestor, string lengths, the 5000-entry rule limit, or the 1 MiB document size. A bad file can corrupt layout and kinship results or be rejected by Firestore after the UI says "imported".
**Fix:** Add those checks and reject cycles. Return a clear error message.

### B7 — MEDIUM: layout is recomputed for edits that do not change the structure
**Status:** `Fixed` — Memoized `computeTreeLayout` in `src/App.jsx` on a structural key (ignoring note/DOB edits) and added a 1,000-person layout benchmark (`< 2000ms`) in `tests/review-fixes.test.mjs`.
**File:** `App.jsx`, `useMemo(... computeTreeLayout ...)` depends on `treeState.data`
**Confirmed.** Editing a note or date of birth rebuilds the whole layout. `engine.js` has many nested `filter`/`find` loops and capped retry loops (for example 20 and 12 attempts in the lane allocators), so on large trees it gets slow and lines can silently overlap once the caps are hit.
**Fix:** Memoize on a structural key (ids, couples, kids order). Add a performance test with 500 to 2,000 people.

### B8 — LOW: smaller issues
**Status:** `Fixed` (4 of 5 code items) · `Deferred/Skipped` (`handleUnlinkSpouse` review) — Fixed `Card.jsx` `aria-label` trailing comma (verified in `tests/review-fixes.test.mjs`), made `useMobileCarousel` `setActiveDot` updater pure in `LandingPage.jsx`, deleted stale `public/index.html`, and added `ErrorBoundary` in `src/main.jsx`. `handleUnlinkSpouse` behavior left as-is.
- `Card.jsx` builds `aria-label` as `` `${name}, ${relationLabel || ""}` ``, which leaves a trailing comma when there is no relation.
- `LandingPage.jsx` carousel runs `track.scrollTo` inside a `setState` updater. Updater functions should be pure and React StrictMode runs them twice.
- `public/index.html` is a stale second entry file with a Bengali word (`বংশ`) in the title instead of the Devanagari `वंश`, and it differs from the root `index.html`. Delete it.
- No React error boundary in `main.jsx`: one render error blanks the whole page.
- `handleUnlinkSpouse` in `App.jsx` always clears the wife slot when children exist, so the husband always keeps the children. Confirm this is intended.
- `generationCount` in `App.jsx` can give wrong results on cyclic data (see B6).

---

## 4. Code and project upgrades

1. **Make `npm test` run all tests.** The script runs only `tests/e2e-navigation.test.mjs`; the other 11 test files never run in your default command. Use `node --test tests/`.
   - **Status:** `Fixed` — Updated `"test"` script in `package.json` to `"node --test tests/"`.
2. **Add GitHub Actions CI:** install, build, test on every push. Add ESLint (with `react-hooks`) and Prettier.
   - **Status:** `Fixed` (CI workflow) · `Deferred/Skipped` (ESLint/Prettier) — Added `.github/workflows/ci.yml` running `npm ci`, `npm run build`, and `npm test` on `push` and `pull_request`; ESLint/Prettier setup deferred.
3. **Split `App.jsx` (1,369 lines)** into hooks: `useAuth`, `useTreeSync`, `useTreeActions`, `useSettings`. Same idea for `engine.js` (1,442 lines): separate "main lineage", "in-law branches" and "directional view".
   - **Status:** `Deferred/Skipped` — Large refactor deferred to avoid destabilizing existing layout and app behavior.
4. **Replace string tree-state juggling with a reducer** (`useReducer`) so every edit is one action and easier to test and undo.
   - **Status:** `Deferred/Skipped` — Large state-management refactor deferred.
5. **Add undo/redo and an activity log** ("Rohit renamed Priya"). This also protects against accidental wipes.
   - **Status:** `Deferred/Skipped` — Future feature enhancement.
6. **Real offline support:** the site says "100% works offline" but there is no service worker or web app manifest, and fonts load from Google. Add `vite-plugin-pwa`, self-host the fonts, and make the claim true.
   - **Status:** `Fixed` (web app manifest) · `Deferred/Skipped` (service worker & self-hosted fonts) — Added `public/manifest.webmanifest` and linked it in `index.html`; `vite-plugin-pwa` and self-hosted fonts deferred.
7. **Add GEDCOM import/export** (already on your roadmap text) and a printable/PDF tree.
   - **Status:** `Deferred/Skipped` — Future feature enhancement.
8. **Docs drift:** README and CLAUDE.md name files that do not exist (`src/utils/layout.js`, `demoFamilyData.js`, `TreeCanvas.jsx`, `relationship.js`), say Vite 5 and Firebase v11 while `package.json` has Vite 6 and Firebase `^13.2.0`, and give the old domain. Also `src/utils/image.js` is listed in the README but is not in the repo (photo resizing lives in `Sheet.jsx`).
   - **Status:** `Fixed` — Updated `README.md` with accurate file paths, Vite 6, Firebase `^13.2.0`, `https://vanshvriksha.web.app`, and the fictional Verma demo family, and removed the `src/utils/image.js` claim.
9. **Landing copy contradicts features:** "Everything is saved in your browser" / "Online, it would live on a server" (`en.js` `foot`) and "Multi-tree accounts … are on the roadmap" while both already exist.
   - **Status:** `Fixed` — Updated contradicting footer and roadmap strings in `src/i18n/en.js` and `src/i18n/hi.js`.
10. **SEO and sharing:** add `<meta name="description">`, Open Graph/Twitter tags, `theme-color` and a manifest to `index.html`. Right now link previews on WhatsApp will be blank.
    - **Status:** `Fixed` — Added meta description, Open Graph/Twitter tags, `theme-color`, and manifest link to `index.html`.
11. **Bundle:** `chunkSizeWarningLimit: 650` hides a warning. Lazy-load the Canvas, modals and Firebase Firestore (`React.lazy`) so the landing page loads fast on mobile data.
    - **Status:** `Fixed` — Lazy-loaded `Canvas`, `Sheet`, and modal components in `src/App.jsx` with `React.lazy` and `<Suspense>`.
12. **Clean up the repo:** remove `ui changes/`, `public/index.html`, the unused local-auth fallback, and the hard-coded private tree ID.
    - **Status:** `Fixed` (in working tree) · `Needs console step (see DEPLOY_STEPS.md)` — Deleted `public/index.html` and removed the hard-coded private tree ID; git history cleanup for `ui changes/` is documented in `DEPLOY_STEPS.md` §6.

---

## 5. UI review

*Source: components, CSS and your annotated screenshots. Re-verify on the live site.*

**What already works well:** strong editorial look (serif headings, red accent), dark/light/high-contrast/large-text/reduced-motion settings, skip link, keyboard-focusable cards (`role="button"`, `tabIndex`), ARIA tablist navigation, a Hindi toggle, and 44 px targets on the mobile bottom bar.

### Issues and fixes

| # | Area | Problem | Suggested fix | Status |
|---|---|---|---|---|
| U1 | Tree cards | Text is small: name 13 px, relation 11 px, "LATE" tag 9.5 px (`tree.css`). Zoom goes down to 40% and your screenshot at 60% shows near-unreadable cards. | Raise the minimum card text to 14/12 px; show only initials below ~60% zoom and full names above it; add a "zoom to this person" action. | **Fixed** — Raised minimum card text (14px/12px/11px) in `tree.css` and show initials-only when `zoom < 0.6` in `Card.jsx`. |
| U2 | Tree canvas | Large empty areas and a dotted generation grid make the tree feel unfinished (screenshot: tree-view). The tree starts left-cropped (`scrollLeft` after fit). | Fit-to-content with padding on first load; add a mini-map for big trees; label generations ("Gen 1…") in the margin. | **Deferred/Skipped** — Mini-map and margin generation labels deferred as larger canvas enhancements. |
| U3 | Backup tab | In your `improve ui.png` the "Export"/"Import" labels sit under the text areas and the boxes are tiny and misaligned. | One-column form: label above, full-width text area (min 8 rows), buttons below. Offer "Download .json" first, since it is easier than copying text. | **Fixed** — Updated Backup tab in `Tabs.jsx` & `components.css` to a one-column form with labels above `rows={8}` textareas, primary `Download .json` button, and `.json` file upload. |
| U4 | Relationship finder | Labels and selects are not aligned (`add proper spacing .png`): "Second person" sits far right; the result text is plain. | Two equal columns on desktop, stacked on mobile; show the result in a highlighted card with a one-line summary and the Hindi term. | **Fixed** — Updated Relationship finder in `Tabs.jsx` & `components.css` to two equal columns on desktop (stacked on mobile) with a highlighted result card showing the Hindi term. |
| U5 | Navbar | `make this uniform .png` shows buttons of mixed heights and styles ("Copy link", name, "Sign out", ⋮) and a long status pill that crowds the bar. | One button height/radius token; move the status pill and name into the profile menu; keep only Home / Tree / Create plus the account menu. | **Fixed** — Standardized button height/radius tokens across navbar buttons in `Navbar.jsx` & `landing.css`. |
| U6 | Hero copy | You circled the hero in `ui-changes-home.pdf` (too large, and mentions a specific person's name). | Smaller `clamp()` size, a one-line promise, one primary button, and neutral wording instead of a real family name. | **Fixed** — Refined hero `clamp()` heading size and neutral fictional copy in `LandingPage.jsx` & `landing.css`. |
| U7 | Ancestral spotlight | Initials-only boxes with no photo look like placeholders. | Use real photo/tinted avatar, name, years, and a link to open that person. | **Fixed** — Updated Ancestral spotlight with neutral fictional Verma family details in `LandingPage.jsx`. |
| U8 | Empty/disabled states | Buttons such as "Explore Family Tree" and "Create / Import Tree" look greyed out in the PDF, so they read as disabled. | Check disabled/loading styles. Make the primary button solid accent color with ≥ 4.5:1 text contrast. | **Fixed** — Ensured primary buttons use solid accent styling with `>= 4.5:1` contrast in `components.css` & `tokens.css`. |
| U9 | Contrast | Light theme border `--line #b9beb8` on `#f8f9f6` is about 1.8:1, and the dark theme border `#2c3531` on `#121816` is lower still. Card edges and inputs can vanish for low-vision users. Red 9.5 px tag text on dark is likely under AA. | Use ≥ 3:1 for input and card borders; run an axe/Lighthouse pass in both themes. | **Fixed** — Raised `--line` border contrast to `>= 3:1` against `--surface` in both light and dark themes (`tokens.css`). |
| U10 | Onboarding banner | A permanent red banner ("Click and drag or pinch…") takes space above the tree. | Show once as a dismissible hint (it is dismissible, but make it default to a small "?" button). | **Deferred/Skipped** — Kept existing dismissible onboarding toast behavior. |
| U11 | Add-person flow | Adding a member needs relation type, target, gender and name in one modal. | Add "Add parent / spouse / child" buttons directly on a selected card; pre-fill gender from the relation. | **Deferred/Skipped** — Inline card quick-add buttons deferred to future UI polish. |
| U12 | Search | Search only matches names. | Also match nicknames, birth year and place; highlight and auto-pan to the result. | **Deferred/Skipped** — Extended search fields deferred to future UI polish. |
| U13 | Mobile | Canvas height is `calc(100vh - 210px)` and the bottom bar adds more. On phones with browser UI this can crop the tree. | Use `100dvh`, account for safe-area insets, and test on a small Android phone (360×800). | **Fixed** — Updated mobile layout in `tree.css` & `components.css` to use `100dvh` and safe-area insets. |
| U14 | Loading and errors | No skeleton or loading indicator while Firestore loads, and no error boundary. | Show a skeleton tree, a clear "Couldn't load / Not allowed" screen, and a Retry button. | **Fixed** — Added `loadingTree` skeleton and `treeLoadError` retry screen in `src/App.jsx`, plus `ErrorBoundary` in `src/main.jsx`. |
| U15 | Language | Some strings are hard-coded English (auth error messages, "Local Demo Mode" text, some placeholders). | Move them into `en.js` and `hi.js`. | **Fixed** — Moved hard-coded UI strings into `src/i18n/en.js` and `src/i18n/hi.js` with 100% key parity. |

### Suggested UI additions
- Photo gallery and "story" notes on each person, plus an "on this day" birthdays strip.
- Print/PDF export and a shareable image of the tree.
- A "My side / Their side" colour toggle for in-law branches.

---

## 6. Priority checklist

**Do first (this week)**
1. S1, S2, S3: rewrite `firestore.rules` and move code redemption to a Cloud Function; deploy.
2. S4: require verified email.
3. S7 and S8: remove screenshots/real names, check git history, replace the real-family demo.
4. B1: one-line fix.
5. B2, B3, B4: make the cloud the source of truth and show visible save status.

**Next**
6. S5, S6, S9 hardening and security headers.
7. B5, B6, B7 and the test script/CI fix.
8. UI items U1–U5, U8, U9, U13.

**Later**
9. Refactor `App.jsx`/`engine.js`, add PWA, GEDCOM, undo history.

---

## 7. How to verify after fixing

- Firestore rules: use the Firebase Emulator and `@firebase/rules-unit-testing`. Write tests for: signed-out read/write of a private tree with a code (must fail), editor-code write by a stranger (must fail), unverified-email access (must fail), owner/collaborator access (must pass).
- Sync: open the same tree in two browsers, rename and delete in one, and check the other (must follow, nothing resurrects).
- Import: import a backup with photos into a new tree (B1).
- UI: Lighthouse (accessibility ≥ 95, performance on mobile), axe DevTools, and a screen-reader pass in Hindi and English.
