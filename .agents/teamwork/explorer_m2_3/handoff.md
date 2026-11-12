# Handoff Report: Bilingual Localization Parity & Test Invariant Verification (Milestone M2)

## 1. Observation

### 1.1 Existing Localization State
- **File**: `src/i18n/en.js` (lines 1 to 261)
  - Contains exactly 257 keys ending at line 258:
    ```javascript
    257:   sharedWithYouBadge: "👨‍👩‍👧‍👦 Shared with you",
    258:   coEditorBadge: "✎ Family Editor"
    ```
- **File**: `src/i18n/hi.js` (lines 1 to 261)
  - Contains exactly 257 keys ending at line 258:
    ```javascript
    257:   sharedWithYouBadge: "👨‍👩‍👧‍👦 आपके साथ साझा",
    258:   coEditorBadge: "✎ पारिवारिक संपादक"
    ```
- Current mutual key parity:
  - Checked via `Object.keys(en)` and `Object.keys(hi)`:
    - Missing in Hindi: `0`
    - Missing in English: `0`
- Neither file currently contains the required full-screen mode keys.

### 1.2 Translation Engine Fallback Behavior
- **File**: `src/i18n/index.js` (lines 6–15)
  ```javascript
  export function createTranslator(lang = 'en') {
    const currentDict = DICTIONARIES[lang] || DICTIONARIES.en;
    return (key, ...args) => {
      const val = currentDict[key] ?? DICTIONARIES.en[key] ?? key;
      if (typeof val === 'function') {
        return val(...args);
      }
      return val;
    };
  }
  ```
  - When a key does not exist in `currentDict` or `DICTIONARIES.en`, `createTranslator` returns the literal `key` string.

### 1.3 Baseline Automated Test Execution (`npm test`)
- Command: `npm test` (executes `node --test tests/e2e-navigation.test.mjs`)
- Result: **109 pass, 0 fail** across 21 suites (duration ~3.8s).
- Line 589–597 of `tests/e2e-navigation.test.mjs` tests `T1-F7-01`:
  ```javascript
  it('T1-F7-01: Complete dictionary key parity between English and Hindi', () => {
    const enKeys = Object.keys(en);
    const hiKeys = Object.keys(hi);
    const missingInHi = enKeys.filter(k => !(k in hi));
    const missingInEn = hiKeys.filter(k => !(k in en));
    
    assert.deepEqual(missingInHi, [], `Missing keys in hi.js: ${missingInHi.join(', ')}`);
    assert.deepEqual(missingInEn, [], `Missing keys in en.js: ${missingInEn.join(', ')}`);
  });
  ```
  - Any key added to `en.js` without a corresponding key in `hi.js` (or vice-versa) instantly breaks `T1-F7-01`.

### 1.4 Mobile UX Test Suite Execution (`tests/e2e-mobile-ux.test.mjs`)
- Command: `node --test tests/e2e-mobile-ux.test.mjs`
- Result: **60 pass, 4 fail** out of 64 tests across 13 suites.
- Verbatim failures directly observed:
  1. **`T1-R2-01`** (line 274):
     ```
     ✖ T1-R2-01: Full-Screen mode toggle enters .is-fullscreen on root container
     AssertionError [ERR_ASSERTION]: Canvas container must include "is-fullscreen" class when isFullscreen prop is true
     ```
  2. **`T1-R2-03`** (line 340):
     ```
     ✖ T1-R2-03: Full-screen sizing: .treewrap-host.is-fullscreen occupies full viewport dimensions in CSS
     AssertionError [ERR_ASSERTION]: Stylesheet must define .is-fullscreen rule
     ```
  3. **`T1-R2-07`** (line 410):
     ```
     ✖ T1-R2-07: Bilingual translation key parity for full-screen mode in en.js and hi.js
     AssertionError [ERR_ASSERTION]: en.js must define key "fullscreenEnter"
     ```
  4. **`T3-PAIR-06`** (line 1021):
     ```
     ✖ T3-PAIR-06 [R2 + Bilingual]: Fullscreen toggle button displays correct bilingual labels in English and Hindi
     AssertionError [ERR_ASSERTION]: Expected "actual" to be strictly unequal to: 'fullscreenEnter'
     ```

### 1.5 Detailed Inventory of R2 Test Assertions in `tests/e2e-mobile-ux.test.mjs`
- **`T1-R2-01` (lines 274–305)**:
  - Invokes `renderComponentToHtml(Canvas, { ..., isFullscreen: true })`.
  - Asserts: `htmlFullscreen.includes('is-fullscreen')`.
  - Component target: `src/components/Canvas.jsx` root container `<div className="treewrap-host">` must render `className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}`.
- **`T1-R2-02` (lines 307–338)**:
  - Invokes `renderComponentToHtml(Canvas, { ..., isFullscreen: false })`.
  - Asserts: `!htmlStandard.includes('treewrap-host is-fullscreen')`. Currently passes.
- **`T1-R2-03` (lines 340–354)**:
  - Reads `src/styles/tree.css` and `src/styles/landing.css`.
  - Asserts: `allCss.includes('.treewrap-host.is-fullscreen') || allCss.includes('.is-fullscreen')` AND `allCss.includes('fixed') && (allCss.includes('100dvh') || allCss.includes('100vh'))`.
- **`T1-R2-04` (lines 356–371)**:
  - Tests `Escape` key logic: `handleKeyDown({ key: 'Escape' }, true, onExit)` invokes `onExit()`. Non-Escape keys do not. Currently passes.
- **`T1-R2-05` (lines 373–396)**:
  - Invokes `renderComponentToHtml(CanvasDock, { zoom: 1.0, isFullscreen: false, onToggleFullscreen, t, lang: 'en', ... })`.
  - Asserts: `htmlDock.includes('fullscreen') || htmlDock.includes('Full') || htmlDock.includes('dock-btn')`.
- **`T1-R2-06` (lines 398–408)**:
  - Inspects `src/styles/components.css` and `src/styles/tree.css`.
  - Asserts modal z-index hierarchy: `componentsCss.includes('.modal-backdrop') || componentsCss.includes('.person-modal') || componentsCss.includes('z-index: 999') || componentsCss.includes('z-index: 1000')`. Currently passes.
- **`T1-R2-07` (lines 410–421)**:
  - Requires keys: `['fullscreenEnter', 'fullscreenExit', 'fullscreenEnterShort', 'fullscreenExitShort']`.
  - Asserts for each key:
    - `key in en`
    - `key in hi`
    - `typeof en[key] === 'string'`
    - `typeof hi[key] === 'string'`
    - `en[key].trim().length > 0`
    - `hi[key].trim().length > 0`
- **`T3-PAIR-06` (lines 1021–1029)**:
  - Asserts:
    - `tEn('fullscreenEnter') || en.fullscreenEnter` is truthy
    - `tHi('fullscreenEnter') || hi.fullscreenEnter` is truthy
    - `(tEn('fullscreenEnter') || en.fullscreenEnter) !== (tHi('fullscreenEnter') || hi.fullscreenEnter)`

---

## 2. Logic Chain

1. **Root cause of `T1-R2-07` failure**:
   - `tests/e2e-mobile-ux.test.mjs` line 414 checks `'fullscreenEnter' in en`.
   - As observed in § 1.1, `src/i18n/en.js` currently stops at line 258 (`coEditorBadge`), missing `fullscreenEnter`, `fullscreenExit`, `fullscreenEnterShort`, and `fullscreenExitShort`.
   - Therefore, `T1-R2-07` fails with `AssertionError: en.js must define key "fullscreenEnter"`.

2. **Root cause of `T3-PAIR-06` failure**:
   - `T3-PAIR-06` calls `tEn('fullscreenEnter')` and `tHi('fullscreenEnter')`.
   - By § 1.2, `createTranslator` falls back to the key string itself (`'fullscreenEnter'`) when a key is absent from both the requested dictionary and `DICTIONARIES.en`.
   - Both `tEn` and `tHi` return `'fullscreenEnter'`.
   - The assertion `assert.notEqual('fullscreenEnter', 'fullscreenEnter')` fails with strict inequality mismatch.

3. **Parity Preservation (`T1-F7-01`)**:
   - By § 1.3, `tests/e2e-navigation.test.mjs` line 592 verifies `enKeys.filter(k => !(k in hi)).length === 0` and `hiKeys.filter(k => !(k in en)).length === 0`.
   - Any additions to `en.js` must be strictly mirrored in `hi.js` with identical key identifiers.
   - Adding the 4 required keys to both files increases key count from 257 to 261 symmetrically, ensuring 100% mutual parity is preserved without regression.

4. **Hindi Authenticity & Devanagari Compliance**:
   - By `tests/e2e-navigation.test.mjs` line 1258 (`T2-F7-05`), Hindi tokens are tested for Devanagari script range (`/[\u0900-\u097F]/`).
   - The proposed Hindi translations use natural, culturally authentic Devanagari vocabulary matching existing terms:
     - `fullscreenEnter`: `"फुल स्क्रीन में देखें"` (Enter full screen)
     - `fullscreenExit`: `"फुल स्क्रीन से बाहर निकलें"` (Exit full screen)
     - `fullscreenEnterShort`: `"फुल स्क्रीन"` (Full screen)
     - `fullscreenExitShort`: `"बाहर निकलें"` (Exit)
   - These are distinct from English (`assert.notEqual` passes), non-empty strings, and within the Unicode Devanagari block.

5. **Interface Contract for Implementation Worker**:
   - For `T1-R2-01` and `T1-R2-02`: In `src/components/Canvas.jsx`, wrap the container with:
     `<div className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}>`
   - For `T1-R2-03`: In `src/styles/tree.css`, add the fixed viewport rule:
     ```css
     .treewrap-host.is-fullscreen {
       position: fixed;
       inset: 0;
       z-index: 800;
       width: 100vw;
       width: 100dvw;
       height: 100vh;
       height: 100dvh;
       background: var(--surface);
       margin: 0;
     }
     ```
   - For `T1-R2-05`: In `src/components/CanvasDock.jsx`, accept `isFullscreen` and `onToggleFullscreen` props, and render a dock button with `t(isFullscreen ? 'fullscreenExit' : 'fullscreenEnter')`.

---

## 3. Caveats

- **Scope boundaries**: Explorer M2-3 is strictly read-only. Source files (`src/i18n/en.js`, `src/i18n/hi.js`, `src/components/Canvas.jsx`, `src/components/CanvasDock.jsx`, `src/styles/tree.css`) have NOT been modified.
- **Machine patch delivery**: The exact code diff for `en.js` and `hi.js` has been prepared and validated in `.agents/teamwork/explorer_m2_3/i18n_fullscreen.patch` for the M2 implementation worker to apply.
- **Remaining test failures**: `T1-R2-01` and `T1-R2-03` depend on JSX class toggling in `Canvas.jsx` and CSS in `tree.css`. Those are owned by the M2 implementation worker.

---

## 4. Conclusion

### 4.1 Exact Proposed Translations
Add the following 4 keys to `src/i18n/en.js` (after `coEditorBadge` at line 258):
```javascript
  fullscreenEnter: "Enter full screen",
  fullscreenExit: "Exit full screen",
  fullscreenEnterShort: "Full screen",
  fullscreenExitShort: "Exit"
```

Add the following 4 keys to `src/i18n/hi.js` (after `coEditorBadge` at line 258):
```javascript
  fullscreenEnter: "फुल स्क्रीन में देखें",
  fullscreenExit: "फुल स्क्रीन से बाहर निकलें",
  fullscreenEnterShort: "फुल स्क्रीन",
  fullscreenExitShort: "बाहर निकलें"
```

### 4.2 Impact Matrix
| Test Case | Description | Current Status | Status Post-Patch |
|---|---|---|---|
| `T1-F7-01` | Full dictionary key parity (109-test master navigation suite) | PASS (257/257 keys) | PASS (261/261 keys, 0 missing) |
| `T1-R2-07` | Bilingual translation key parity for full-screen mode | FAIL (missing keys) | PASS (all 4 keys verified) |
| `T3-PAIR-06` | Fullscreen toggle button displays distinct bilingual labels | FAIL (equality collision) | PASS (En != Hi) |
| `T1-R2-01` | Container `is-fullscreen` class toggle in `Canvas.jsx` | FAIL (Canvas JSX not updated) | Worker to implement |
| `T1-R2-03` | CSS viewport sizing in `tree.css` | FAIL (CSS rule not added) | Worker to implement |
| `npm test` | Regression suite | PASS (109/109 pass) | PASS (109/109 pass) |

---

## 5. Verification Method

To independently verify these conclusions:

1. **Verify Key Parity in Node**:
   ```powershell
   node -e "import('./src/i18n/en.js').then(e => import('./src/i18n/hi.js').then(h => { const enK = Object.keys(e.en); const hiK = Object.keys(h.hi); const mHi = enK.filter(k => !hiK.includes(k)); const mEn = hiK.filter(k => !enK.includes(k)); console.log('Parity:', mHi.length === 0 && mEn.length === 0, 'Count:', enK.length); }))"
   ```
   - Must output: `Parity: true Count: 257` (currently) and `Count: 261` (post-patch).

2. **Run Master Regression Test Suite**:
   ```powershell
   npm test
   ```
   - Must pass all 109 tests across 21 suites cleanly.

3. **Run Mobile UX Test Suite**:
   ```powershell
   node --test tests/e2e-mobile-ux.test.mjs
   ```
   - Post-patch, `T1-R2-07` and `T3-PAIR-06` will pass immediately.

4. **Invalidation Conditions**:
   - Any spelling discrepancy between key names in `en.js` and `hi.js`.
   - Returning empty string or non-string values.
   - Any value equality where `en[key] === hi[key]`.
