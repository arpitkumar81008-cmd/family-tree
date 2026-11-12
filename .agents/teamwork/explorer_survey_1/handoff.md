# Handoff Report: Mobile UX Enhancements — Navigation & Layout Survey (R1 & R2)

**Agent**: Explorer Survey 1 (Navigation & Layout)  
**Parent Orchestrator ID**: `8b2a6657-8cb7-498d-a97d-69939f005a64`  
**Date**: 2026-11-09T13:17:30Z  
**Status**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

### 1.1 Codebase & File Architecture
The Family Tree application is a React 18 single-page application bundled with Vite 6.0.7, backed by Firebase (Auth & Firestore) with 100% offline local storage resilience. The core navigation and canvas layout is implemented across the following files:

| File Path | Role & Content |
|---|---|
| `c:\B-Tech 1st year\Family Tree\src\App.jsx` | Root application orchestrator: renders `<Navbar>` (lines 932–969), manages view transitions (`currentView: 'home' \| 'tree'`), breadcrumbs, toolbar, canvas, modals, and `<MobileBottomNav>`. |
| `c:\B-Tech 1st year\Family Tree\src\components\Navbar.jsx` | Top navigation bar component (274 lines) containing brand, 3-way view switcher ("Home", "Demo Tree", "My Tree"), and action controls ("Copy link", "GitHub", "Sign in" / user pill, and Settings popover). |
| `c:\B-Tech 1st year\Family Tree\src\components\MobileBottomNav.jsx` | Fixed mobile bottom dock (68 lines) with 4 touch targets: Home, Demo, My Tree, and Menu. |
| `c:\B-Tech 1st year\Family Tree\src\components\Canvas.jsx` | Main canvas component (336 lines) wrapping `.treewrap-host`, `.treewrap`, SVG lines, cards, and `<CanvasDock>`. Handles mouse drag pan and scroll debouncing. |
| `c:\B-Tech 1st year\Family Tree\src\components\CanvasDock.jsx` | Bottom-right expandable control dock (143 lines) containing Zoom In/Out, Fit, Mode reset, and Directional Pan arrows. |
| `c:\B-Tech 1st year\Family Tree\src\components\Toolbar.jsx` | Toolbar above canvas (79 lines) containing person perspective dropdown, quick search input, and "+ Add Member" button. |
| `c:\B-Tech 1st year\Family Tree\src\styles\landing.css` | Styles for `.site-nav` (lines 4–128, 818–822, 917–959, 1034–1061, 1111–1133), `.treewrap-host`, and `.canvas-dock` (lines 621–768). |
| `c:\B-Tech 1st year\Family Tree\src\styles\components.css` | Styles for `.nav-view-switcher`, `.nav-tab` (lines 806–857), `.nav-status-badge` (lines 861–899), and `.mobile-bottom-nav` (lines 997–1085). |
| `c:\B-Tech 1st year\Family Tree\src\styles\tokens.css` | CSS variables: `--nav-height: 60px;`, `--transition-fast: 0.12s ease;`, color tokens, font families, and responsive root font sizes. |
| `c:\B-Tech 1st year\Family Tree\src\styles\tree.css` | Styles for `.treewrap` (lines 3–47), `.stage`, `.sizer`, cards, SVG lines, branch pills, and generation rails. |
| `c:\B-Tech 1st year\Family Tree\src\i18n\en.js` & `hi.js` | Localization dictionaries (261 entries). Verified 100% key parity required by test `T1-F7-01`. |
| `c:\B-Tech 1st year\Family Tree\tests\e2e-navigation.test.mjs` | 109 native Node tests (1,691 lines). All 109 tests currently pass (`npm test`). |

---

### 1.2 Top Navigation Bar Structure & Styling
In `src/components/Navbar.jsx`, the top navigation bar is mounted with the root element:
```jsx
<nav className="site-nav" aria-label="Primary">
```
Direct children inside `<nav className="site-nav">`:
1. **Brand Button** (`.nav-brand`, lines 105–120):
   - `.brand-crest`: Square crest containing "V" (`brand-crest`).
   - `.brand-text`: Contains `.brand-title` ("FAMILY TREE" or active tree title) and `.brand-sub` ("द्विभाषी वंश वृक्ष").
2. **View Switcher Tabgroup** (`.nav-center.nav-view-switcher[role="tablist"]`, lines 122–169):
   - Button `id="nav-btn-home"`, `role="tab"`: text `{translate('navHome')}` ("Home" / "होम").
   - Button `id="nav-btn-demo"`, `role="tab"`: text `{translate('navDemoTree')}` ("Demo Tree" / "डेमो वृक्ष").
   - Button `id="nav-btn-mytree"`, `role="tab"`: text `{translate('navMyTree')}` ("My Private Tree" / "मेरा वृक्ष").
3. **Action Container** (`.nav-actions`, lines 171–268):
   - **Active Tree Status Badge** (`.stats-badge.nav-status-badge.active-tree-badge`, lines 173–200): Displays member count, generation count, and tree context (e.g., "15 members · 5 generations · Viewing: Sharma Family").
   - **"Copy Link" / "Share Tree" Button** (`.zbtn.nav-action-btn`, lines 202–211):
     `{copied ? translate('linkCopied') : \`🔗 \${translate('shareTreeBtn')}\`}` (displays "🔗 Copy link" or "Link copied!").
   - **"GitHub" Link** (`.zbtn.nav-action-btn.nav-github-link`, lines 213–222):
     `<a href="https://github.com/arpitkumar81008-cmd" target="_blank" ...>GitHub ↗</a>`.
   - **"Sign In" / User Pill + Sign Out** (lines 224–237):
     - Unauthenticated: `<button type="button" className="btn nav-action-btn" onClick={onOpenAuth}>{translate('signIn')}</button>` ("Sign in").
     - Authenticated: `<div className="nav-user"><span className="user-pill">{user.displayName}</span><button ... onClick={onSignOut}>{translate('signOut')}</button></div>`.
   - **Settings Popover Trigger** (`.settings-wrap`, lines 239–267):
     - Trigger button: `<button type="button" className="settings-btn" ...>⋮</button>`.
     - Popover dialog: `<SettingsPopover ... />` for Theme, Text Size, Contrast, Motion, Display Mode, and Language.

#### Desktop vs. Mobile Styling of `.site-nav`
- **Desktop** (`src/styles/landing.css`, lines 4–18):
  ```css
  .site-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    width: 100%;
    box-sizing: border-box;
    height: var(--nav-height); /* 60px */
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 clamp(20px, 3vw, 48px);
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  ```
- **Mobile Viewport Mode** (`:root[data-viewport="mobile"] .site-nav` lines 1034–1061, and `@media (max-width: 768px)` lines 1111–1133):
  ```css
  :root[data-viewport="mobile"] .site-nav,
  @media (max-width: 768px) {
    :root:not([data-viewport="laptop"]) .site-nav {
      height: auto;
      flex-wrap: wrap;
      padding: 10px 12px;
      gap: 8px;
    }
    :root:not([data-viewport="laptop"]) .nav-center {
      order: 3;
      width: 100%;
      justify-content: space-between;
      border-top: 1px solid var(--line);
      padding-top: 6px;
    }
    :root:not([data-viewport="laptop"]) .nav-tab {
      flex: 1;
      text-align: center;
      padding: 6px 8px;
      font-size: 12.5px;
    }
  }
  @media (max-width: 760px) {
    .brand-text,
    .stats-badge,
    .user-pill {
      display: none;
    }
  }
  ```
  **Key Impact**: On mobile devices, because `.site-nav` wraps `.nav-center` into a second line, the top bar occupies **~94px–108px** of vertical height. Along with `.mobile-bottom-nav` (~64px), a standard mobile screen (e.g. 667px–844px high) loses **over 25% of its vertical screen space** to navigation chrome.

---

### 1.3 Current Scrolling Mechanics
1. **Window / Document Scroll (`window.scrollY`)**:
   - The document root `body` has no `overflow: hidden`.
   - On the `home` view, the entire `LandingPage` scrolls vertically within `window`.
   - On the `tree` view, the `.page` container (lines 983–1128 of `App.jsx`) holds:
     `<Breadcrumbs>` (margin-bottom 16px) + `<header>` (h1 title) + `<Toolbar>` (search & controls) + `<Canvas>` + `<Tabs>` (Relationship Finder, Birthdays, Backup) + `<footer className="site-footer">`.
     Because all these components combined exceed viewport height, the window itself scrolls vertically.
   - When the window scrolls, `.site-nav` remains pinned at `top: 0` because it has `position: sticky; top: 0; z-index: 100;`. It never hides or collapses on scroll.
2. **Canvas / Container Scroll (`.treewrap` in `src/components/Canvas.jsx`)**:
   - The tree canvas container `.treewrap` has its own internal scrolling:
     ```css
     .treewrap {
       position: relative;
       width: 100%;
       background: var(--surface);
       border-top: 1px solid var(--line);
       border-bottom: 1px solid var(--line);
       overflow: auto;
       height: calc(100vh - 210px);
       min-height: 540px;
       margin-block: 16px;
       user-select: none;
       touch-action: pan-x pan-y;
     }
     @media (max-width: 768px) {
       :root:not([data-viewport="laptop"]) .treewrap {
         height: 66vh;
         min-height: 420px;
       }
     }
     ```
   - Inside `.treewrap`, the canvas content `.sizer` (width `layout.W * zoom`, height `layout.H * zoom`) overflows both horizontally and vertically.
   - **Desktop**: Panning is accomplished via `mousedown` / `mousemove` / `mouseup` event listeners in `Canvas.jsx` (lines 60–99), or directional pan buttons in `CanvasDock.jsx`.
   - **Mobile**: Single-touch dragging inside `.treewrap` natively scrolls `treewrap.scrollLeft` and `treewrap.scrollTop` through browser-default `touch-action: pan-x pan-y`.
   - **Current State**: There are currently **zero touch event listeners** (`touchstart`, `touchmove`, `touchend`) anywhere in the application.

---

### 1.4 Test Suite Safeguards & Critical Constraints
1. **Existing Test Suite Verification**:
   - Command: `npm test` (`node --test tests/e2e-navigation.test.mjs`).
   - Result: All 109 tests passed (0 failed, 0 skipped, runtime ~7.6s).
2. **Specific Regex & AST Matchers in `e2e-navigation.test.mjs`**:
   - `T2-F6-02` (lines 1150–1158): Directly reads `src/styles/landing.css` via `fs.readFileSync` and asserts:
     - `landingCss.includes(':root[data-viewport="mobile"]')`
     - `landingCss.includes(':root[data-viewport="mobile"] .site-nav') && landingCss.includes('flex-wrap: wrap')`
   - `T2-F6-04` (lines 1187–1190): Directly asserts regex on `landing.css`:
     - `/:root\[data-viewport="mobile"\]\s+\.site-nav\s*\{[^}]*height:\s*auto/i.test(landingCss)`
   - `T1-F7-01` (lines 589–598): Asserts strict key parity between `src/i18n/en.js` and `src/i18n/hi.js`. Any new key added for full-screen mode or collapsible navigation MUST be added to **both** files.
   - `T1-F1-01` through `T1-F1-05`, `T1-F2-06`, `T2-F6-02`: Render `Navbar.jsx` with `{ currentView: 'home', viewportMode: 'mobile', t }` and assert that `.site-nav`, `.nav-center`, and `[role="tablist"]` exist in SSR markup. Any collapsing mechanism must ensure `Navbar` continues to render standard DOM in SSR and does not crash when window/DOM APIs are unavailable.

---

## 2. Logic Chain

### 2.1 Logic for R1: Collapsible Top Navigation Bar on Mobile
1. **Requirement Interpretation**:
   - User Request: *"On mobile devices, when scrolling upwards, the top bar containing 'Copy Link', 'GitHub', 'Sign In', 'Home', and 'Demo Tree' must collapse into a small size or become invisible to reduce screen clutter and provide more screen real estate when viewing the family tree. It must become visible only when scrolling down. Either collapsing into a compact bar or becoming invisible is acceptable."*
   - In touch UI terminology, when a user swipes upward on the screen to scroll down into content or deeper into the family tree, the header is collapsed. When the user swipes downward to scroll back toward the top, the header is restored.
   - For complete UX stability, we must handle scroll direction changes with **hysteresis (deadzone threshold of 10px–15px)** to prevent rapid flickering during small finger jitters or micro-movements.
2. **Dual Scroll Context Awareness**:
   - Because the Family Tree application has both page scroll (`window.scrollY`) and canvas pan scroll (`.treewrap.scrollTop`), a user viewing the family tree may scroll either the outer page or the inner `.treewrap`.
   - Therefore, scroll direction detection must monitor `window` scroll, and when the user interacts with `.treewrap`, sync collapse state so that viewing the tree immediately yields maximum screen real estate.
3. **Guardrails for User Intent & Accessibility**:
   - **At Top of Page (`scrollY <= 10px`)**: Top bar must ALWAYS be visible when near or at the top of the page.
   - **Settings Popover Open (`isSettingsOpen === true`)**: If the user has opened the settings menu (lines 239–267 of `Navbar.jsx`), do NOT collapse the top bar.
   - **Active Keyboard Focus (`:focus-within`)**: If any button or link inside `.site-nav` is focused via keyboard/screen reader, the top bar must stay visible.
   - **Desktop Viewport Exclusion**: On desktop viewports (`window.innerWidth > 768px` without `data-viewport="mobile"`), collapsing must remain disabled so desktop navigation is never disrupted.
4. **Optimal CSS Transition Approach**:
   - Applying `transform: translateY(-100%)` and `opacity: 0` with `transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease` to `.site-nav.is-collapsed` on mobile:
     - Causes zero layout reflows (GPU composited via transform).
     - Keeps the sticky position anchor intact so when it reappears (`transform: translateY(0)`), the page doesn't jump.
     - Sets `pointer-events: none` while collapsed so invisible buttons cannot accidentally be tapped.

---

### 2.2 Logic for R2: Full-Screen Mode for Mobile Family Tree
1. **Mobile Platform Reality & API Limitations**:
   - The W3C HTML5 Fullscreen API (`element.requestFullscreen()`) is supported on desktop browsers and Android Chrome, but is **NOT supported for arbitrary `<div>` elements on iPhone Safari (iOS)** (WebKit restricts `requestFullscreen` to `<video>` elements on iPhones).
   - Therefore, a pure `requestFullscreen()` call will fail or throw on iOS devices.
   - A robust production implementation must use a **two-tier architecture**:
     - **Core Tier (CSS Immersive Viewport)**: A full-viewport fixed overlay (`position: fixed; inset: 0; z-index: 500; width: 100vw; height: 100dvh; background: var(--surface)`) applied to `.treewrap-host`. This works reliably 100% of the time across all iOS, Android, and desktop browsers without permission prompts.
     - **Progressive Enhancement Tier**: If `document.fullscreenEnabled` and `element.requestFullscreen` exist (e.g. Android Chrome), invoke the native API simultaneously, and listen to `fullscreenchange` events for bidirectional sync.
2. **Container Scope for Full-Screen**:
   - In `src/components/Canvas.jsx`, lines 199–331:
     ```jsx
     <div className="treewrap-host">
       <div ref={containerRef} className="treewrap">...</div>
       <CanvasDock ... />
     </div>
     ```
   - Scoping full-screen mode to `.treewrap-host` ensures that:
     - The `.treewrap` container expands to 100% width and 100% height.
     - The `<CanvasDock>` (zoom in/out, fit, pan controls) remains visible and functional inside the full-screen view.
     - Navbar, Breadcrumbs, Page Header, Toolbar, Bottom Tabs, and Footer are occluded/hidden behind the full-screen container.
3. **Toggle Control Placement**:
   - To satisfy Acceptance Criterion *"A dedicated toggle control allows mobile users to enter and exit full-screen mode when viewing the family tree"*:
     - **In `<CanvasDock>` controls tray**: Add a dedicated button `dock-btn dock-fullscreen-btn` (`⛶ Fullscreen` / `✕ Exit`).
     - **Floating Button on Canvas**: When viewing the tree on mobile or when in full-screen, display a floating pill button in the top-right corner of the canvas:
       - Normal view: `⛶ Fullscreen` (Hindi: `⛶ पूर्ण स्क्रीन`).
       - Fullscreen view: `✕ Exit Fullscreen` (Hindi: `✕ बाहर निकलें`).
     - **Escape Key Listener**: Pressing `Escape` exits full-screen mode cleanly.
4. **Clean Restoration Guarantee**:
   - Exiting full-screen mode simply toggles `isFullscreen` to `false` (and calls `document.exitFullscreen()` if active).
   - Because `zoom` is stored in React state/localStorage and `.treewrap` pan coordinates (`scrollLeft`, `scrollTop`) are preserved in `localStorage["gupta_canvas_pan"]`, the tree view is restored with zero coordinate drift or layout deformation.

---

## 3. Caveats

1. **iOS Safari Viewport Bar Behavior**:
   On iOS Safari, address bars and bottom toolbars collapse and expand based on window scroll. Using CSS `100dvh` (dynamic viewport height) ensures that `.treewrap-host.is-fullscreen` accounts for dynamic Safari toolbar changes without vertical clipping or letterboxing. Fallback `100vh` must be retained for older browsers.
2. **Scroll Direction Terminology**:
   In English, "scrolling upwards" is sometimes used colloquially to mean "finger moving up" (`scrollY` increasing) and sometimes "content moving down" (`scrollY` decreasing). Our proposed implementation adheres to the mobile standard (finger swipe up / advancing deeper into content collapses the bar; finger swipe down / returning toward top reveals the bar), while exposing clean configuration parameters and handling the top-of-page boundary (`scrollY <= 10px`) where the bar is always visible.
3. **Testing in Headless / Node SSR Environments**:
   `tests/e2e-navigation.test.mjs` runs in a Node.js SSR environment where `window` is mocked via `tests/helpers/window-mock.mjs`. Any scroll listeners or full-screen handlers must check `typeof window !== 'undefined'` and attach event listeners only inside `useEffect`, ensuring zero breakage during SSR or automated testing.

---

## 4. Conclusion & Concrete Implementation Recommendations

### 4.1 Recommendation for R1: Collapsible Top Navigation Bar

#### A. State Management in `Navbar.jsx`
Implement collapsible state directly in `src/components/Navbar.jsx` (or passed down from `App.jsx`):
```jsx
// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';

// Inside Navbar component:
const [isCollapsed, setIsCollapsed] = useState(false);
const lastScrollYRef = useRef(0);

useEffect(() => {
  if (typeof window === 'undefined') return;

  const isMobile = () =>
    window.innerWidth <= 768 ||
    document.documentElement.getAttribute('data-viewport') === 'mobile';

  const handleScroll = () => {
    if (!isMobile()) {
      if (isCollapsed) setIsCollapsed(false);
      return;
    }

    // Do not collapse if settings popover is open
    if (isSettingsOpen) {
      setIsCollapsed(false);
      return;
    }

    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const diff = currentScrollY - lastScrollYRef.current;

    // At or near top of page: always show
    if (currentScrollY <= 10) {
      setIsCollapsed(false);
    } else if (diff > 12) {
      // Swiping up / scrolling down deeper into page: collapse top bar
      setIsCollapsed(true);
    } else if (diff < -12) {
      // Swiping down / scrolling up toward top: reveal top bar
      setIsCollapsed(false);
    }

    lastScrollYRef.current = currentScrollY;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, [isSettingsOpen, isCollapsed]);
```

In the JSX of `Navbar.jsx`, line 104:
```jsx
<nav
  className={`site-nav${isCollapsed ? ' is-collapsed' : ''}`}
  aria-label="Primary"
  aria-hidden={isCollapsed}
>
```

#### B. CSS Additions in `src/styles/landing.css`
Append to `src/styles/landing.css` (keeping existing rules intact to preserve tests `T2-F6-02` and `T2-F6-04`):
```css
/* Collapsible top navigation bar on mobile (Requirement R1) */
@media (max-width: 768px) {
  :root:not([data-viewport="laptop"]) .site-nav {
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.22s ease;
  }
  :root:not([data-viewport="laptop"]) .site-nav.is-collapsed {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }
}

:root[data-viewport="mobile"] .site-nav {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;
}

:root[data-viewport="mobile"] .site-nav.is-collapsed {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}

/* Maintain accessibility: keep visible when an element inside has focus */
.site-nav:focus-within {
  transform: translateY(0) !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}
```

---

### 4.2 Recommendation for R2: Full-Screen Viewing Mode

#### A. Component Implementation in `src/components/Canvas.jsx`
Manage full-screen state in `src/components/Canvas.jsx`:
```jsx
// src/components/Canvas.jsx
const [isFullscreen, setIsFullscreen] = useState(false);
const hostRef = useRef(null);

const toggleFullscreen = async () => {
  const next = !isFullscreen;
  setIsFullscreen(next);

  // Progressive enhancement: Fullscreen API if supported
  if (typeof document !== 'undefined') {
    if (next) {
      try {
        if (hostRef.current?.requestFullscreen && document.fullscreenEnabled) {
          await hostRef.current.requestFullscreen();
        }
      } catch {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {}
    }
  }

  // Auto-fit or preserve pan coordinates
  setTimeout(() => {
    fitView?.();
  }, 100);
};

// Sync with native fullscreen changes (e.g. user presses hardware Escape or swipes away)
useEffect(() => {
  const onFullscreenChange = () => {
    setIsFullscreen(Boolean(document.fullscreenElement));
  };
  const onKeyDown = e => {
    if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    }
  };

  document.addEventListener('fullscreenchange', onFullscreenChange);
  window.addEventListener('keydown', onKeyDown);
  return () => {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    window.removeEventListener('keydown', onKeyDown);
  };
}, [isFullscreen]);
```

In `Canvas.jsx` JSX:
```jsx
<div
  ref={hostRef}
  className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}
>
  {/* Dedicated floating toggle button on mobile / fullscreen */}
  <button
    type="button"
    className="canvas-fullscreen-toggle"
    aria-label={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
    title={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
    onClick={toggleFullscreen}
  >
    <span aria-hidden="true">{isFullscreen ? '✕' : '⛶'}</span>
    <span className="fullscreen-label">
      {isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
    </span>
  </button>

  <div ref={containerRef} className="treewrap" ...>
    ...
  </div>

  <CanvasDock
    ...
    isFullscreen={isFullscreen}
    onToggleFullscreen={toggleFullscreen}
  />
</div>
```

#### B. Button in `CanvasDock.jsx`
In `src/components/CanvasDock.jsx`, add a full-screen toggle button to `.dock-controls-tray` (after the Fit button, line 119):
```jsx
<button
  type="button"
  className={`dock-btn text dock-fullscreen-btn${isFullscreen ? ' active' : ''}`}
  tabIndex={isExpanded ? 0 : -1}
  aria-label={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
  title={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
  onClick={onToggleFullscreen}
>
  {isFullscreen ? `✕ ${t('exitFullscreen')}` : `⛶ ${t('enterFullscreen')}`}
</button>
```

#### C. CSS Additions in `src/styles/tree.css` and `src/styles/landing.css`
```css
/* Full-screen Canvas Viewport Overlay (Requirement R2) */
.treewrap-host.is-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 500 !important;
  width: 100vw !important;
  height: 100vh !important;
  height: 100dvh !important;
  margin: 0 !important;
  padding: 0 !important;
  background: var(--surface) !important;
}

.treewrap-host.is-fullscreen .treewrap {
  height: 100% !important;
  max-height: 100% !important;
  min-height: 100% !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
}

/* Floating Full-Screen Toggle Button */
.canvas-fullscreen-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 25;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--ink);
  border-radius: var(--radius-xs);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: all var(--transition-fast);
}

.canvas-fullscreen-toggle:hover {
  background: var(--line);
}

.treewrap-host.is-fullscreen .canvas-fullscreen-toggle {
  top: 16px;
  right: 16px;
  z-index: 520;
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.treewrap-host.is-fullscreen .canvas-fullscreen-toggle:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
```

#### D. Translation Keys in `src/i18n/en.js` & `hi.js`
To maintain the required 100% key parity tested by `T1-F7-01`:
- In `src/i18n/en.js`:
  ```javascript
  enterFullscreen: "Full Screen",
  exitFullscreen: "Exit Full Screen",
  ```
- In `src/i18n/hi.js`:
  ```javascript
  enterFullscreen: "पूर्ण स्क्रीन",
  exitFullscreen: "पूर्ण स्क्रीन से बाहर निकलें",
  ```

---

## 5. Verification Method

To independently verify these findings and recommendations:

1. **Verify Existing Integrity**:
   Run the project test command to confirm baseline passing status:
   ```bash
   npm test
   ```
   *Expected result*: 109 tests passed, 0 failed.

2. **Verify Component Paths & DOM Elements**:
   - Inspect `src/components/Navbar.jsx` lines 104–268 to verify presence of `site-nav`, `nav-brand`, `nav-center`, and `nav-actions`.
   - Inspect `src/styles/landing.css` lines 1034–1061 and 1111–1133 to verify existing mobile breakpoint rules.
   - Inspect `src/styles/tree.css` lines 3–20 to verify `.treewrap` container styles.

3. **Verify Proposed Invariants**:
   - The test suite checks `fs.readFileSync('src/styles/landing.css')` for exact substrings `:root[data-viewport="mobile"] .site-nav` and `height: auto`. Any CSS modifications must keep these declarations intact.
   - The test suite checks dictionary parity between `en.js` and `hi.js`. Any translation key added must be present in both files.

4. **Invalidation Conditions**:
   - If `npm test` fails any of the 109 tests after implementing R1/R2, this analysis is invalidated and requires immediate adjustment.
   - If mobile navigation tabs (`#nav-btn-home`, `#nav-btn-demo`, `#nav-btn-mytree`) or status badges are omitted from the SSR output of `Navbar.jsx`, Tier 1 and Tier 2 tests will fail.

---
*Report completed by Explorer Survey 1. Ready for handoff to Orchestrator.*
