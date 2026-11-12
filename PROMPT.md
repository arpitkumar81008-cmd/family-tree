# Finished prompt — paste this into your AI coding agent (Claude Code, etc.)

Run it from the root of the `family-tree` repo. Attach `REVIEW.md` or keep it in the repo root so the agent can read the finding IDs (S1, B2, U3, …).

---

## PROMPT

You are working on **VanshVriksha**, a bilingual (English/Hindi) family-tree web app: React 18 + Vite 6, Firebase Auth + Cloud Firestore, hosted on Firebase Hosting at https://vanshvriksha.web.app. Read `REVIEW.md` in the repo root first. It lists security findings (S1–S9), bugs (B1–B8), upgrades and UI issues (U1–U15) with file names. Fix them in the phases below, in order, committing after each phase with a clear message. Do not change features that already work. Keep English and Hindi dictionaries (`src/i18n/en.js`, `hi.js`) in sync for every new string.

### Ground rules
- Work on a new branch `review-fixes`. Never force-push and never rewrite git history yourself; tell me what to run for that.
- Do not print or commit secrets, `.env` files or real family data.
- After each phase run `npm ci`, `npm run build` and `node --test tests/`. If something fails, fix it or tell me exactly what failed. Do not skip or delete failing tests.
- Prefer small, reviewable diffs. Explain any change that alters behaviour users can see.
- If a requested fix needs something I must do in the Firebase console or Google Cloud (deploying rules, Cloud Functions, API key restrictions), do not guess. Write the exact steps in `DEPLOY_STEPS.md`.

### Phase 1 — Security (REVIEW S1–S6, S9)
1. Rewrite `firestore.rules`:
   - Remove `isShareCodeEditor()` from `allow update`, and remove `hasActiveShareCode()` from `allow get` and `allow list`.
   - Reads: public trees, the owner, UIDs in `collaboratorUids`, and **verified** invited emails only.
   - Writes: the owner or UIDs in `collaboratorUids`. Collaborators must not be able to change `ownerUid`, `isPublic`, sharing fields or `createdAt`.
   - Require `request.auth.token.email_verified == true` wherever email lists are used.
   - Keep the schema validation and size limits.
2. Move sharing data (`viewerEmails`, `editorEmails`, `shareCode`, `shareCodeRole`) out of the readable tree document into an owner-only subcollection (for example `trees/{id}/private/sharing`), and update `treeSync.js`, `ShareTreeModal.jsx` and the types accordingly.
3. Replace client-side share-code checks with a **Cloud Function** (callable) that validates the code (minimum 10 characters, generated only by `generatePrivateShareToken()`), rate-limits attempts, and adds the caller's UID to the right list. Add the function under `functions/` and wire the client to call it. If you cannot deploy functions from here, write the code and the deploy steps.
4. Generate tree IDs with Firestore auto-IDs (`doc(collection(db, 'trees')).id`) instead of `Date.now()` + `Math.random()`.
5. Send a verification email on email sign-up, add a "Forgot password" flow (`sendPasswordResetEmail`) in `AuthModal.jsx`, and disable anonymous auth in `firebase.json`.
6. Add `headers` to the hosting blocks in `firebase.json`: `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, a reasonable `Content-Security-Policy` (allow Firebase, Google Fonts and `inputtools.google.com` only if you keep it), and long-cache headers for `/assets/**`.
7. Add an `AbortController` timeout (about 2 seconds) to `transliterateToHindi` so a slow network never blocks tree creation.
8. Write Firestore rules tests with `@firebase/rules-unit-testing` (run with the emulator) covering: stranger read/write (denied), signed-out access to a coded tree (denied), unverified-email access (denied), owner and collaborator access (allowed), collaborator trying to change sharing fields (denied).

### Phase 2 — Privacy clean-up (REVIEW S7, S8)
1. Delete the `ui changes/` folder from the working tree (`git rm -r`). Remove it from the repo only; do not touch my local copy outside git.
2. Remove real family names, the private tree ID `tree_gupta_private_akg`, the legacy `gupta-family-tree-v*` merge code, and my personal email from source, `CHANGES.md`, `README.md`, `translit.js` (`OFFLINE_NAMES`), `storage.js` and `firebase.json`. Use generic examples.
3. Replace the demo dataset in `src/data/familyData.js` with a clearly **fictional** family (about 25 people, 4–5 generations, Indian names, no real people and no real dates of birth, no children with birth dates). Update README/CLAUDE.md wording to match.
4. Output the exact git commands I should run to search history for the removed files and, if needed, purge them with `git filter-repo`. Do not run those commands.

### Phase 3 — Bug fixes (REVIEW B1–B8)
1. **B1:** fix `const photos = parsed.photos && typeof parsed.photos === 'object' ...` in `CreateTreeModal.jsx`, and move the whole import into the `try/catch` so errors show a message. Add a test that imports a backup with photos.
2. **B2/B3:** make the cloud document the source of truth for signed-in users. Stop overlaying the local cache on cloud snapshots (`mergeCloudTreeWithLocalHistory`). Use the local cache only when offline or when the cloud has no document. Save with `runTransaction` and a `version` number (or split people and couples into subcollections), and handle a version conflict by reloading and re-applying the user's change. Add tests for: rename on device B shows on A, delete on B does not come back on A, unlinking a parent persists.
3. **B4:** save `data` and `photos` separately. If a save fails, show a visible "Not saved" banner with a Retry button. Optionally move photos to Firebase Storage and store URLs.
4. **B5:** keep one debounce timer per tree ID and flush on `pagehide` and `visibilitychange`.
5. **B6:** strengthen `validateTreeData` in `schema.js`: unique IDs, a child belongs to at most one couple, no ancestor cycles, string length limits, 5000-entry limit, size under about 900 KB. Return specific error messages, and use it in both import paths.
6. **B7:** memoize `computeTreeLayout` on a structural key so editing notes or dates does not recompute the layout. Add a benchmark test with 1,000 people.
7. **B8:** fix `Card.jsx` aria-label trailing comma, make the carousel `setState` updater pure, delete `public/index.html`, add a React error boundary in `main.jsx` with a friendly "Something went wrong — Reload" screen.

### Phase 4 — Project health (REVIEW §4)
1. Change `"test"` in `package.json` to `node --test tests/` and make sure every test file is discovered and passing.
2. Add `.github/workflows/ci.yml`: `npm ci`, `npm run build`, `npm test` on push and pull request.
3. Add ESLint (`eslint-plugin-react`, `react-hooks`) and Prettier, and fix the new warnings that are easy to fix.
4. Update `README.md` and `CLAUDE.md` so file paths, versions (Vite 6, Firebase from `package.json`), domains and the demo-family description are correct. Remove the claim that `src/utils/image.js` exists unless you create it.
5. Fix landing copy that contradicts features (`en.js`/`hi.js`: "saved in this browser only", "multi-tree on the roadmap", "100% works offline").
6. Add `<meta name="description">`, Open Graph and Twitter tags, `theme-color`, and a web app manifest to `index.html`. Add a service worker with `vite-plugin-pwa` and self-host the fonts so the "works offline" claim is true.
7. Lazy-load Canvas, large modals and Firestore code with `React.lazy`/dynamic `import()` and report the bundle size before and after.

### Phase 5 — UI (REVIEW U1–U15)
Use the existing design tokens in `src/styles/tokens.css`. Do not add a new UI library. Check each change in light, dark and high-contrast themes, English and Hindi, at 360×800 and 1440×900.
1. **Cards (U1):** minimum 14 px name, 12 px relation, 11 px tag; at zoom below 60% show initials only; add a "zoom to person" action.
2. **Canvas (U2):** fit-to-content with padding on first load, generation labels in the margin, optional mini-map for trees over 100 people.
3. **Backup tab (U3):** one-column form with labels above fields, full-width text areas (min 8 rows), "Download .json" as the primary action and "Upload file" as an alternative to pasting.
4. **Relationship finder (U4):** two equal columns on desktop, stacked on mobile; show the result as a highlighted card with the Hindi term.
5. **Navbar (U5):** one height/radius token for all buttons; move the status pill and user name into the account menu.
6. **Hero and spotlight (U6, U7):** smaller `clamp()` heading, neutral copy with no real person's name, a real avatar and years in the spotlight cards.
7. **Buttons and contrast (U8, U9):** primary buttons never look disabled; borders at least 3:1 and text at least 4.5:1 in all themes; run axe and fix violations.
8. **Mobile (U13):** use `100dvh`, safe-area insets and verify the bottom bar does not cover the tree.
9. **Loading/errors (U14):** skeleton while loading, a clear "Not allowed / Not found" screen with Retry.
10. **Strings (U15):** move hard-coded English into `en.js` and `hi.js`.
11. Optional if time allows: add parent/spouse/child buttons on a selected card (U11), and search by nickname/birth year with auto-pan (U12).

### Definition of done
- `npm run build` and `node --test tests/` pass; Firestore rules tests pass in the emulator.
- Lighthouse on the landing page and on a tree page: accessibility ≥ 95 and no console errors.
- `REVIEW.md` now has a short "Status" column or note per finding (Fixed / Needs console step / Skipped, with a reason).
- `DEPLOY_STEPS.md` lists the manual steps I must do: deploy rules and functions, restrict the API key by referrer, enable App Check, purge history if needed.
- Finish with a short summary: what changed, what still needs me, and any test you could not run.
