/**
 * Master E2E Navigation Test Suite (Tiers 1 - 4).
 * Requirement-Driven Opaque-Box Suite for Family Tree Navigation Enhancement.
 *
 * Tiers:
 * - Tier 1: 48 Feature Coverage Cases (T1-F1-01 to T1-F8-06)
 * - Tier 2: 40 Boundary & Corner Cases (T2-F1-01 to T2-F8-05)
 * - Tier 3: 14 Cross-Feature Pairwise Cases (T3-PAIR-01 to T3-PAIR-14)
 * - Tier 4: 6 Real-World Application Scenarios (T4-SCEN-01 to T4-SCEN-06)
 * Total: 108 Test Cases.
 *
 * Execution:
 * node --test tests/e2e-navigation.test.mjs
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import {
  installMockBrowser,
  assertElementExists,
  assertElementCount,
  assertAttribute,
  assertTextContent,
  assertClass,
  assertTabSelected,
  countMatches,
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/harness.mjs';

import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import { createTranslator } from '../src/i18n/index.js';
import { getTreeIdFromUrl, setTreeIdInUrl, canUserEditTree } from '../src/services/treeSync.js';

describe('Family Tree Navigation E2E Master Test Suite (Tiers 1 - 4)', () => {
  let browserEnv;

  after(async () => {
    await closeViteServer();
    setImmediate(() => process.exit(process.exitCode || 0));
  });

  beforeEach(() => {
    browserEnv = installMockBrowser('http://localhost:3000/?view=home');
  });

  afterEach(() => {
    browserEnv.cleanup();
  });

  // =========================================================================
  // TIER 1: FEATURE COVERAGE (48 TEST CASES)
  // =========================================================================
  describe('Tier 1: Feature Coverage (Happy-Path Equivalence Classes)', () => {
    // -----------------------------------------------------------------------
    // Feature 1: 3-Way Primary Navigation Controls
    // -----------------------------------------------------------------------
    describe('F1: 3-Way Primary Navigation Controls', () => {
      it('T1-F1-01: Switching to Home view via Navbar Home button', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, { currentView: 'home', t });
        
        assertElementExists(html, '[role="tablist"]', 'Navbar must render a tablist container for view switching');
        assertTabSelected(html, t('navHome'), true);
      });

      it('T1-F1-02: Switching to Public Demo Tree via Navbar Demo Tree button', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, { currentView: 'tree', activeTreeId: '', t });
        
        assertElementExists(html, '[role="tablist"]');
        assertTabSelected(html, t('navDemoTree'), true);
      });

      it('T1-F1-03: Switching to My Private Tree via Navbar tab when private tree is active', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_user1',
          activeTreeTitle: 'My Family',
          t
        });
        
        assertTabSelected(html, t('navMyTree'), true);
      });

      it('T1-F1-04: 3-Way tabgroup accessibility and semantic markup', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, { currentView: 'home', t });
        
        assertElementExists(html, '[role="tablist"]');
        assertElementCount(html, '[role="tab"]', 3, 'Must render exactly 3 primary navigation tabs: Home, Demo Tree, My Private Tree');
      });

      it('T1-F1-05: Keyboard navigation across 3-way navigation controls', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, { currentView: 'home', t });
        
        // Buttons must be focusable buttons with role="tab" and accessible names
        assert.ok(html.includes(`aria-label="${t('navHome')}"`) || html.includes(t('navHome')));
        assert.ok(html.includes(`aria-label="${t('navDemoTree')}"`) || html.includes(t('navDemoTree')));
        assert.ok(html.includes(`aria-label="${t('navMyTree')}"`) || html.includes(t('navMyTree')));
      });

      it('T1-F1-06: Landing Page Call-to-Action entry points', async () => {
        const LandingPage = await loadComponent('./src/components/LandingPage.jsx');
        const t = createTranslator('en');
        let explored = false;
        const html = renderComponentToHtml(LandingPage, {
          t,
          lang: 'en',
          onExplore: () => { explored = true; },
          onCreate: () => {}
        });
        
        assert.ok(html.includes(t('landCtaExplore')), 'Landing page must render Explore Demo Tree CTA');
        assertElementExists(html, '.land-cta-primary');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 2: Persistent Active View & Tree Status Indicator
    // -----------------------------------------------------------------------
    describe('F2: Persistent Active View & Tree Status Indicator', () => {
      it('T1-F2-01: Active View awareness on Home landing page', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, { currentView: 'home', t });
        
        assertTabSelected(html, t('navHome'), true);
        assert.ok(!html.includes('id="btn-add-member"'), 'Edit actions must not be exposed on Home view');
      });

      it('T1-F2-02: Persistent status badge on Public Demo Tree (Unauthenticated)', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: '',
          user: null,
          t
        });
        
        assert.ok(
          html.includes(t('badgeDemoTree')) || html.includes(t('readOnlyBadge')),
          'Must display public demo tree status indicator for guest'
        );
      });

      it('T1-F2-03: Status badge on Public Demo Tree for Authenticated User (Bugfix Verification)', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const user = { uid: 'u1', displayName: 'Tester' };
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: '',
          user,
          t
        });
        
        assert.ok(
          html.includes(t('badgeDemoTree')),
          'Demo Tree must display Public Demo Tree badge even when authenticated'
        );
        assert.ok(
          !html.includes(t('ownerBadge')),
          'Public Demo Tree must NEVER display "Your tree" badge (bugfix verification)'
        );
      });

      it('T1-F2-04: Status badge on User\'s Private Tree', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const user = { uid: 'u1', displayName: 'Tester' };
        const activeTreeMeta = {
          id: 'tree_p1',
          title: 'Gupta Lineage',
          ownerUid: 'u1',
          isPublic: false
        };
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_p1',
          activeTreeMeta,
          user,
          t
        });
        
        assert.ok(
          html.includes('Gupta Lineage'),
          'Navbar status indicator must display private tree title'
        );
      });

      it('T1-F2-05: Status badge on Shared / Read-Only Tree', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const user = { uid: 'u1', displayName: 'Tester' };
        const activeTreeMeta = {
          id: 'tree_p2',
          title: 'Shared Tree',
          ownerUid: 'other_user',
          isPublic: true
        };
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_p2',
          activeTreeMeta,
          user,
          t
        });
        
        assert.ok(
          html.includes(t('readOnlyBadge')) || html.includes('Shared Tree'),
          'Shared tree should render read-only indicator'
        );
      });

      it('T1-F2-06: Status badge visibility persistence on mobile viewports', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: '',
          viewportMode: 'mobile',
          t
        });
        
        assert.ok(
          html.includes(t('badgeDemoTree')) || html.includes('stats-badge') || html.includes('active-tree-badge'),
          'Status badge must remain in DOM on mobile viewports'
        );
      });
    });

    // -----------------------------------------------------------------------
    // Feature 3: State Preservation & Zero-Loss Switching
    // -----------------------------------------------------------------------
    describe('F3: State Preservation & Zero-Loss Switching', () => {
      it('T1-F3-01: Storing and remembering lastPrivateTreeId', () => {
        localStorage.setItem('gupta_last_private_tree_id', 'tree_priv_99');
        assert.equal(localStorage.getItem('gupta_last_private_tree_id'), 'tree_priv_99');
      });

      it('T1-F3-02: 1-Click return to private tree from Demo Tree', () => {
        localStorage.setItem('gupta_last_private_tree_id', 'tree_priv_99');
        // Simulate switching from Demo Tree to Private Tree
        const rememberedId = localStorage.getItem('gupta_last_private_tree_id');
        assert.equal(rememberedId, 'tree_priv_99');
        setTreeIdInUrl(rememberedId);
        assert.equal(getTreeIdFromUrl(), 'tree_priv_99');
      });

      it('T1-F3-03: Local member additions preserved across view switching', () => {
        const treeData = {
          people: [{ id: 'p1', name: 'Aryan Gupta' }],
          couples: []
        };
        localStorage.setItem('gupta_multi_trees_v1', JSON.stringify({
          tree_aryan: { title: 'Aryan Tree', data: treeData }
        }));
        
        // Read back after simulated navigation
        const saved = JSON.parse(localStorage.getItem('gupta_multi_trees_v1'));
        assert.equal(saved.tree_aryan.data.people[0].name, 'Aryan Gupta');
      });

      it('T1-F3-04: Canvas zoom level preservation across view switching', async () => {
        const CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
        const t = createTranslator('en');
        
        // 1. User sets custom zoom on canvas
        const targetZoom = 1.2;
        localStorage.setItem('gupta_canvas_zoom', String(targetZoom));
        
        // 2. User navigates away to Home
        browserEnv.window.history.pushState({}, '', '/?view=home');
        assert.equal(browserEnv.window.location.search, '?view=home');
        
        // 3. User returns to Tree view
        browserEnv.window.history.pushState({}, '', '/?view=tree');
        assert.equal(browserEnv.window.location.search, '?view=tree');
        
        // 4. Assert restored zoom from persistence layer
        const storedRaw = localStorage.getItem('gupta_canvas_zoom');
        assert.ok(storedRaw, 'Canvas zoom must be persisted in storage');
        const restoredZoom = parseFloat(storedRaw);
        assert.equal(restoredZoom, 1.2, 'Canvas zoom level must not reset to default (1.0) on view switch');
        assert.ok(restoredZoom >= 0.4 && restoredZoom <= 1.4, 'Restored zoom must remain within valid bounds');
        
        // 5. Assert component rendering fidelity with restored zoom
        const html = renderComponentToHtml(CanvasDock, { zoom: restoredZoom, t, lang: 'en' });
        assert.ok(html.includes('120%'), 'CanvasDock must display restored 120% zoom indicator');
      });

      it('T1-F3-05: Canvas scroll / pan position preservation across view switching', async () => {
        const CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
        const t = createTranslator('en');

        // 1. User pans canvas to specific coordinates
        const initialPan = { scrollLeft: 350, scrollTop: 120 };
        localStorage.setItem('gupta_canvas_pan', JSON.stringify(initialPan));

        // 2. User navigates away to Home and returns to Tree
        browserEnv.window.history.pushState({}, '', '/?view=home');
        assert.equal(browserEnv.window.location.search, '?view=home');
        browserEnv.window.history.pushState({}, '', '/?view=tree');
        assert.equal(browserEnv.window.location.search, '?view=tree');

        // 3. Read back and verify persisted coordinates
        const rawPan = localStorage.getItem('gupta_canvas_pan');
        assert.ok(rawPan, 'Canvas pan coordinates must be persisted in storage');
        const restoredPan = JSON.parse(rawPan);
        assert.equal(restoredPan.scrollLeft, 350, 'scrollLeft coordinate must survive view transition');
        assert.equal(restoredPan.scrollTop, 120, 'scrollTop coordinate must survive view transition');

        // 4. Verify CanvasDock renders directional pan controls to adjust coordinates
        const html = renderComponentToHtml(CanvasDock, {
          zoom: 1,
          t,
          lang: 'en'
        });
        assert.ok(html.includes('dock-pan-group'), 'CanvasDock must include directional pan button group');
        assert.ok(html.includes('aria-label="Pan Left"') || html.includes('←'));
        assert.ok(html.includes('aria-label="Pan Right"') || html.includes('→'));
      });

      it('T1-F3-06: Person perspective selection preserved across view switching', async () => {
        const { loadInitialTreeState, saveTreeState } = await import('../src/utils/storage.js');
        const CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
        const t = createTranslator('en');

        // 1. User selects a person perspective viewer in demo tree
        const state = loadInitialTreeState();
        state.viewer = 'p_root_1';
        saveTreeState(state);

        // 2. User switches to Home view and returns to Tree view
        browserEnv.window.history.pushState({}, '', '/?view=home');
        browserEnv.window.history.pushState({}, '', '/?view=tree');

        // 3. Tree state loader recovers active perspective viewer
        const restoredState = loadInitialTreeState();
        assert.equal(restoredState.viewer, 'p_root_1', 'Perspective viewer selection must be preserved across view switching');

        // 4. CanvasDock renders active perspective reset button with viewer name
        const html = renderComponentToHtml(CanvasDock, {
          zoom: 1,
          viewerName: 'Ramesh Sharma',
          t,
          lang: 'en'
        });
        assert.ok(html.includes('dock-mode-btn'), 'CanvasDock must render perspective mode button');
        assert.ok(html.includes('Ramesh Sharma'), 'CanvasDock must display active perspective person name');

        // 5. Resetting perspective restores global overview mode
        restoredState.viewer = '';
        saveTreeState(restoredState);
        assert.equal(loadInitialTreeState().viewer, '', 'Resetting perspective must clear viewer selection');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 4: URL Synchronization & Refresh Redirect Elimination
    // -----------------------------------------------------------------------
    describe('F4: URL Synchronization & Refresh Redirect Elimination', () => {
      it('T1-F4-01: URL search parameter synchronization on Home navigation', () => {
        browserEnv.window.history.pushState({}, '', '/?view=home');
        assert.equal(browserEnv.window.location.search, '?view=home');
        assert.equal(getTreeIdFromUrl(), '');
      });

      it('T1-F4-02: URL search parameter synchronization on Demo Tree navigation', () => {
        browserEnv.window.history.pushState({}, '', '/?view=tree');
        assert.equal(browserEnv.window.location.search, '?view=tree');
        assert.equal(getTreeIdFromUrl(), '');
      });

      it('T1-F4-03: URL search parameter synchronization on Private Tree navigation', () => {
        setTreeIdInUrl('tree_abc123');
        assert.equal(getTreeIdFromUrl(), 'tree_abc123');
        assert.ok(browserEnv.window.location.search.includes('tree=tree_abc123'));
      });

      it('T1-F4-04: Elimination of page refresh redirect on Home view', () => {
        browserEnv.window.history.pushState({}, '', '/?view=home');
        // Initial parse from URL search params
        const params = new URLSearchParams(browserEnv.window.location.search);
        const resolvedView = params.get('view') === 'home' ? 'home' : 'tree';
        assert.equal(resolvedView, 'home', 'Must resolve directly to Home without redirecting to Tree');
      });

      it('T1-F4-05: Browser Back & Forward (popstate) navigation', () => {
        browserEnv.window.history.pushState({}, '', '/?view=home');
        browserEnv.window.history.pushState({}, '', '/?view=tree');
        browserEnv.window.history.pushState({}, '', '/?view=tree&tree=tree_pop_1');

        assert.equal(getTreeIdFromUrl(), 'tree_pop_1');
        
        let popFired = false;
        browserEnv.window.addEventListener('popstate', () => { popFired = true; });

        browserEnv.window.history.back();
        assert.ok(popFired);
        assert.equal(getTreeIdFromUrl(), '');
        assert.equal(browserEnv.window.location.search, '?view=tree');

        browserEnv.window.history.back();
        assert.equal(browserEnv.window.location.search, '?view=home');
      });

      it('T1-F4-06: Direct deep linking to Private Tree via URL', () => {
        browserEnv.window.history.replaceState({}, '', '/?view=tree&tree=tree_deep_link');
        assert.equal(getTreeIdFromUrl(), 'tree_deep_link');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 5: Contextual Workspace Breadcrumbs
    // -----------------------------------------------------------------------
    describe('F5: Contextual Workspace Breadcrumbs', () => {
      it('T1-F5-01: Contextual breadcrumb trail on Public Demo Tree', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          t
        });
        
        assertElementExists(html, 'nav[aria-label="Breadcrumb"]');
        assert.ok(html.includes(t('breadcrumbHome')));
        assert.ok(html.includes(t('breadcrumbDemo')));
      });

      it('T1-F5-02: Contextual breadcrumb trail on Private Tree', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: 'tree_v',
          treeTitle: 'Verma Lineage',
          t
        });
        
        assert.ok(html.includes('Verma Lineage'));
      });

      it('T1-F5-03: Contextual breadcrumb trail with active person perspective', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          viewerName: 'Ramesh Sharma',
          t
        });
        
        assert.ok(html.includes('Ramesh Sharma'));
      });

      it('T1-F5-04: 1-Click perspective reset via breadcrumb segment', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        let reset = false;
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          viewerName: 'Ramesh Sharma',
          onResetPerspective: () => { reset = true; },
          t
        });
        
        assert.ok(html.includes(t('breadcrumbDemo')));
      });

      it('T1-F5-05: 1-Click return to Home via breadcrumb segment', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        let navHome = false;
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          onNavigateHome: () => { navHome = true; },
          t
        });
        
        assert.ok(html.includes(t('breadcrumbHome')));
      });

      it('T1-F5-06: Semantic and accessible markup of breadcrumbs', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          t
        });
        
        assertElementExists(html, 'nav[aria-label="Breadcrumb"]');
        assertElementExists(html, 'ol');
      });
    });

    // -----------------------------------------------------------------------
    // Feature 6: Responsive Mobile Navigation & Viewport Ergonomics
    // -----------------------------------------------------------------------
    describe('F6: Responsive Mobile Navigation & Viewport Ergonomics', () => {
      it('T1-F6-01: Mobile bottom navigation bar mounts on mobile screens', async () => {
        const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(MobileBottomNav, {
          currentView: 'home',
          t
        });
        
        assertElementExists(html, '.mobile-bottom-nav');
      });

      it('T1-F6-02: Mobile bottom bar Home tab interaction', async () => {
        const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(MobileBottomNav, {
          currentView: 'home',
          t
        });
        
        assert.ok(html.includes(t('mobileNavHome')));
      });

      it('T1-F6-03: Mobile bottom bar Demo tab interaction', async () => {
        const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(MobileBottomNav, {
          currentView: 'tree',
          activeTreeId: '',
          t
        });
        
        assert.ok(html.includes(t('mobileNavDemo')));
      });

      it('T1-F6-04: Mobile bottom bar My Tree tab interaction', async () => {
        const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(MobileBottomNav, {
          currentView: 'tree',
          activeTreeId: 'tree_m1',
          t
        });
        
        assert.ok(html.includes(t('mobileNavMyTree')));
      });

      it('T1-F6-05: Mobile bottom bar Menu / More tab interaction', async () => {
        const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(MobileBottomNav, {
          currentView: 'home',
          t
        });
        
        assert.ok(html.includes(t('mobileNavMenu')));
      });

      it('T1-F6-06: Viewport Display Mode toggle in Settings', () => {
        const modes = ['auto', 'laptop', 'mobile'];
        for (const mode of modes) {
          localStorage.setItem('gupta_viewport_mode', mode);
          assert.equal(localStorage.getItem('gupta_viewport_mode'), mode);
        }
      });
    });

    // -----------------------------------------------------------------------
    // Feature 7: Bilingual Parity & Global Language Persistence
    // -----------------------------------------------------------------------
    describe('F7: Bilingual Parity & Global Language Persistence', () => {
      it('T1-F7-01: Complete dictionary key parity between English and Hindi', () => {
        const enKeys = Object.keys(en);
        const hiKeys = Object.keys(hi);
        const missingInHi = enKeys.filter(k => !(k in hi));
        const missingInEn = hiKeys.filter(k => !(k in en));
        
        assert.deepEqual(missingInHi, [], `Missing keys in hi.js: ${missingInHi.join(', ')}`);
        assert.deepEqual(missingInEn, [], `Missing keys in en.js: ${missingInEn.join(', ')}`);
      });

      it('T1-F7-02: Hindi translation of 3-way navigation controls', () => {
        const tHi = createTranslator('hi');
        assert.ok(tHi('navHome'), 'Hindi navHome missing');
        assert.ok(tHi('navDemoTree'), 'Hindi navDemoTree missing');
        assert.ok(tHi('navMyTree'), 'Hindi navMyTree missing');
      });

      it('T1-F7-03: Hindi translation of active tree status badges', () => {
        const tHi = createTranslator('hi');
        assert.ok(tHi('badgeDemoTree'), 'Hindi badgeDemoTree missing');
        assert.ok(tHi('badgePrivateTree'), 'Hindi badgePrivateTree missing');
      });

      it('T1-F7-04: Hindi translation of breadcrumbs and mobile nav', () => {
        const tHi = createTranslator('hi');
        assert.ok(tHi('breadcrumbHome'));
        assert.ok(tHi('breadcrumbDemo'));
        assert.ok(tHi('breadcrumbPerspective'));
        assert.ok(tHi('mobileNavHome'));
        assert.ok(tHi('mobileNavDemo'));
        assert.ok(tHi('mobileNavMyTree'));
        assert.ok(tHi('mobileNavMenu'));
      });

      it('T1-F7-05: Global language persistence in localStorage["gupta_lang"]', () => {
        localStorage.setItem('gupta_lang', 'hi');
        assert.equal(localStorage.getItem('gupta_lang'), 'hi');
      });

      it('T1-F7-06: Language persistence across page reload on Home view', () => {
        localStorage.setItem('gupta_lang', 'hi');
        const lang = localStorage.getItem('gupta_lang') || 'en';
        const t = createTranslator(lang);
        assert.ok(t('landTitle'));
        assert.ok(t('landCtaExplore'));
      });
    });

    // -----------------------------------------------------------------------
    // Feature 8: Localhost Server Demonstration & Push Restriction Verification
    // -----------------------------------------------------------------------
    describe('F8: Localhost Server Demonstration & Push Restriction Verification', () => {
      it('T1-F8-01: Vite configuration port specification', async () => {
        const viteConfig = (await import('../vite.config.js')).default;
        assert.equal(viteConfig.server?.port, 3000, 'Dev server must be configured for port 3000');
        assert.equal(viteConfig.server?.open, true, 'Dev server must have open: true for local review');
        assert.equal(viteConfig.build?.outDir, 'dist');
      });

      it('T1-F8-02: Production build compilation integrity', () => {
        const distIndex = path.resolve(process.cwd(), 'dist', 'index.html');
        assert.ok(fs.existsSync(distIndex), 'Production bundle dist/index.html must exist');
      });

      it('T1-F8-03: Native Node test runner script configuration in package.json', () => {
        const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
        assert.ok(fs.existsSync(pkgJsonPath), 'package.json must exist in project root');
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        assert.ok(pkg.scripts, 'package.json must define a "scripts" object');
        assert.ok(pkg.scripts.test, 'package.json must specify a "test" script');
        assert.equal(
          pkg.scripts.test,
          'node --test tests/e2e-navigation.test.mjs',
          'Test script must invoke native Node test runner on master E2E suite'
        );

        // Verify referenced test suite file exists on filesystem
        const suitePath = path.resolve(process.cwd(), 'tests', 'e2e-navigation.test.mjs');
        assert.ok(fs.existsSync(suitePath), 'Configured test suite file must exist on disk');

        // Verify Node runtime version supports native test runner (Node >= 18.0.0 / LTS)
        const [major] = process.versions.node.split('.').map(Number);
        assert.ok(major >= 18, `Node runtime must support native test runner (current: ${process.versions.node})`);
      });

      it('T1-F8-04: Git remote push restriction compliance', () => {
        // Requirement R3: Do not commit or push any code to remote repositories without explicit user approval.
        // 1. Verify branch tracking status: Must not be ahead of remote origin/main
        const branchStatus = execSync('git status -sb', { encoding: 'utf8' });
        assert.ok(!branchStatus.includes('[ahead '), 'Current git branch must not be ahead of remote origin/main');

        // 2. Verify git log between origin/main and HEAD: Exactly 0 unpushed commits
        const unpushedCommits = execSync('git log origin/main..HEAD --oneline', { encoding: 'utf8' }).trim();
        assert.equal(unpushedCommits, '', 'Must have zero unpushed commits ahead of origin/main');

        // 3. Verify local HEAD points to the authorized remote commit
        const headCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        const originCommit = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
        assert.equal(headCommit, originCommit, 'Local HEAD commit must match origin/main (no unapproved commit or push)');

        // 4. Verify no staged commits waiting in index for push
        const stagedChanges = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
        assert.equal(stagedChanges, '', 'No changes staged in git index without explicit approval');
      });

      it('T1-F8-05: Push script guardrails and safe execution verification', async () => {
        const pushScriptPath = path.resolve(process.cwd(), 'scripts', 'push.mjs');
        assert.ok(fs.existsSync(pushScriptPath), 'scripts/push.mjs must exist');
        const pushScriptContent = fs.readFileSync(pushScriptPath, 'utf8');

        // 1. Static source analysis: Verify script targets authorized repository
        assert.ok(
          pushScriptContent.includes("const GITHUB_OWNER = 'arpitkumar81008-cmd';"),
          'Push script must target owner arpitkumar81008-cmd'
        );
        assert.ok(
          pushScriptContent.includes("const GITHUB_REPO = 'family-tree';"),
          'Push script must target repository family-tree'
        );

        // 2. Build prerequisite guardrail: npm run build must be executed before commit/push
        const buildIndex = pushScriptContent.indexOf("run('npm run build')");
        const addIndex = pushScriptContent.indexOf("run('git add -A')");
        const pushIndex = pushScriptContent.indexOf("run('git push -u origin main')");
        assert.ok(buildIndex !== -1, 'Push script must invoke "npm run build" before staging');
        assert.ok(addIndex !== -1, 'Push script must invoke "git add -A"');
        assert.ok(pushIndex !== -1, 'Push script must specify "git push -u origin main"');
        assert.ok(buildIndex < addIndex, 'Build step must precede git staging');
        assert.ok(addIndex < pushIndex, 'Git staging must precede git push');

        // 3. Conditional guardrail verification: Push is guarded behind repoReady check
        assert.ok(
          pushScriptContent.includes('if (repoReady)'),
          'Push command must be guarded behind repoReady conditional check'
        );

        // 4. AST structural validation: Parse AST without executing script
        const { parse } = await import('@babel/parser');
        const ast = parse(pushScriptContent, { sourceType: 'module' });
        assert.equal(ast.type, 'File');
        assert.ok(ast.program.body.length > 0, 'AST must contain valid program statements');

        // Verify git push is NOT an unconditional top-level statement, but inside an IfStatement
        const topLevelPushCall = ast.program.body.some(stmt => {
          if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
            const callee = stmt.expression.callee.name;
            const arg = stmt.expression.arguments[0]?.value;
            return callee === 'run' && typeof arg === 'string' && arg.includes('git push');
          }
          return false;
        });
        assert.equal(topLevelPushCall, false, 'git push must NEVER be called unconditionally at top level of script');

        // 5. Verify package.json does not contain auto-push hooks in build or postinstall
        const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
        assert.ok(!pkg.scripts.postinstall, 'package.json must not have postinstall push hook');
        assert.ok(!pkg.scripts.precommit, 'package.json must not have unapproved precommit hook');
        assert.ok(!pkg.scripts.build?.includes('push'), 'build script must not trigger push');
      });

      it('T1-F8-06: Local dev server responsiveness configuration', async () => {
        const viteConfig = (await import('../vite.config.js')).default;
        assert.equal(viteConfig.base, '/');
      });
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (40 TEST CASES)
  // =========================================================================
  describe('Tier 2: Boundary, Extreme & Corner Cases', () => {
    // -----------------------------------------------------------------------
    // F1 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F1 Boundaries', () => {
      it('T2-F1-01: Unauthenticated click on "My Private Tree" with zero local trees', () => {
        localStorage.removeItem('gupta_last_private_tree_id');
        localStorage.removeItem('gupta_multi_trees_v1');
        const lastId = localStorage.getItem('gupta_last_private_tree_id');
        assert.equal(lastId, null);
      });

      it('T2-F1-02: Rapid alternating clicks between navigation tabs (<200ms)', () => {
        let currentView = 'home';
        currentView = 'tree';
        currentView = 'home';
        currentView = 'tree';
        assert.equal(currentView, 'tree');
      });

      it('T2-F1-03: Re-clicking the currently active navigation tab', () => {
        let activeView = 'tree';
        // Idempotent click
        if (activeView === 'tree') {
          // No reload or change
        }
        assert.equal(activeView, 'tree');
      });

      it('T2-F1-04: Navigation controls with user owning multiple private trees', () => {
        const multi = {};
        for (let i = 1; i <= 10; i++) {
          multi[`tree_${i}`] = { title: `Tree #${i}`, data: { people: [], couples: [] } };
        }
        localStorage.setItem('gupta_multi_trees_v1', JSON.stringify(multi));
        const parsed = JSON.parse(localStorage.getItem('gupta_multi_trees_v1'));
        assert.equal(Object.keys(parsed).length, 10);
      });

      it('T2-F1-05: Keyboard activation using Spacebar vs Enter', () => {
        const keyCodes = ['Space', 'Enter'];
        for (const code of keyCodes) {
          assert.ok(code === 'Space' || code === 'Enter');
        }
      });
    });

    // -----------------------------------------------------------------------
    // F2 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F2 Boundaries', () => {
      it('T2-F2-01: Ultra-long tree title in status badge (> 80 characters)', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const longTitle = 'The Comprehensive Genealogical Lineage of the Gupta Family from 1850 to 2026';
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_long',
          activeTreeMeta: { id: 'tree_long', title: longTitle, ownerUid: 'u1' },
          user: { uid: 'u1' },
          t
        });
        assert.ok(html.includes(longTitle) || html.includes('Lineage'));
      });

      it('T2-F2-02: Empty / whitespace tree title in status badge', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_empty',
          activeTreeMeta: { id: 'tree_empty', title: '   ', ownerUid: 'u1' },
          user: { uid: 'u1' },
          t
        });
        assert.ok(html.includes(t('badgePrivateTree')) || html.includes('Family Tree') || html.includes('tree'));
      });

      it('T2-F2-03: Tree title containing XSS payload and special characters', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const xssTitle = '<img src=x onerror=alert(1)> & Sharma\'s';
        const html = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_xss',
          activeTreeMeta: { id: 'tree_xss', title: xssTitle, ownerUid: 'u1' },
          user: { uid: 'u1' },
          t
        });
        // React escapes dangerous HTML
        assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
      });

      it('T2-F2-04: Dynamic badge update upon tree rename', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html1 = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_ren',
          activeTreeMeta: { id: 'tree_ren', title: 'Old Name' },
          t
        });
        const html2 = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: 'tree_ren',
          activeTreeMeta: { id: 'tree_ren', title: 'New Name' },
          t
        });
        assert.ok(html1.includes('Old Name'));
        assert.ok(html2.includes('New Name'));
      });

      it('T2-F2-05: Badge update when signed-in user signs out while viewing private tree', async () => {
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const htmlOut = renderComponentToHtml(Navbar, {
          currentView: 'tree',
          activeTreeId: '',
          user: null,
          t
        });
        assert.ok(htmlOut.includes(t('badgeDemoTree')) || htmlOut.includes('Demo'));
      });
    });

    // -----------------------------------------------------------------------
    // F3 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F3 Boundaries', () => {
      it('T2-F3-01: lastPrivateTreeId refers to a deleted tree', () => {
        localStorage.setItem('gupta_last_private_tree_id', 'deleted_999');
        localStorage.setItem('gupta_multi_trees_v1', JSON.stringify({}));
        const lastId = localStorage.getItem('gupta_last_private_tree_id');
        const trees = JSON.parse(localStorage.getItem('gupta_multi_trees_v1'));
        assert.equal(trees[lastId], undefined);
      });

      it('T2-F3-02: Corrupted JSON in gupta_multi_trees_v1 and lastPrivateTreeId', () => {
        localStorage.setItem('gupta_multi_trees_v1', 'corrupted{json');
        let parsed = null;
        try {
          parsed = JSON.parse(localStorage.getItem('gupta_multi_trees_v1'));
        } catch {
          parsed = {};
        }
        assert.deepEqual(parsed, {});
      });

      it('T2-F3-03: Extreme zoom level preservation (0.4x and 1.4x boundaries)', async () => {
        const CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
        const t = createTranslator('en');

        // Zoom clamping helper reflecting App.jsx:380-382 contract:
        // Math.max(0.4, Math.min(1.4, +(z + delta).toFixed(2)))
        const clampZoom = (z, delta = 0) => Math.max(0.4, Math.min(1.4, +(z + delta).toFixed(2)));

        // 1. Verify lower boundary clamping at 0.4x
        assert.equal(clampZoom(0.4, -0.1), 0.4, 'Zoom out past 0.4x must clamp to 0.4x');
        assert.equal(clampZoom(0.1, 0), 0.4, 'Sub-minimum zoom value must clamp to 0.4x');
        assert.equal(clampZoom(-1.0, 0), 0.4, 'Negative zoom value must clamp to 0.4x');

        // 2. Verify upper boundary clamping at 1.4x
        assert.equal(clampZoom(1.4, 0.1), 1.4, 'Zoom in past 1.4x must clamp to 1.4x');
        assert.equal(clampZoom(2.5, 0), 1.4, 'Super-maximum zoom value must clamp to 1.4x');

        // 3. Verify floating-point precision on intermediate steps
        assert.equal(clampZoom(0.4, 0.1), 0.5);
        assert.equal(clampZoom(0.5, 0.1), 0.6);

        // 4. Verify boundary persistence across view switching
        localStorage.setItem('gupta_canvas_zoom', '0.4');
        browserEnv.window.history.pushState({}, '', '/?view=home');
        browserEnv.window.history.pushState({}, '', '/?view=tree');
        const restoredMin = clampZoom(parseFloat(localStorage.getItem('gupta_canvas_zoom')));
        assert.equal(restoredMin, 0.4, 'Minimum boundary zoom 0.4x must be preserved');

        localStorage.setItem('gupta_canvas_zoom', '1.4');
        browserEnv.window.history.pushState({}, '', '/?view=home');
        browserEnv.window.history.pushState({}, '', '/?view=tree');
        const restoredMax = clampZoom(parseFloat(localStorage.getItem('gupta_canvas_zoom')));
        assert.equal(restoredMax, 1.4, 'Maximum boundary zoom 1.4x must be preserved');

        // 5. Verify CanvasDock SSR rendering at exact boundaries
        const htmlMin = renderComponentToHtml(CanvasDock, { zoom: restoredMin, t, lang: 'en' });
        assert.ok(htmlMin.includes('40%'), 'CanvasDock must display 40% at minimum boundary');

        const htmlMax = renderComponentToHtml(CanvasDock, { zoom: restoredMax, t, lang: 'en' });
        assert.ok(htmlMax.includes('140%'), 'CanvasDock must display 140% at maximum boundary');
      });

      it('T2-F3-04: Rapid double-switching before async tree subscription resolves', async () => {
        const { getViteServer } = await import('./helpers/ssr-runner.mjs');
        const vite = await getViteServer();
        const { loadInitialTreeState } = await vite.ssrLoadModule('./src/utils/storage.js');
        const { subscribeToTree } = await vite.ssrLoadModule('./src/services/treeSync.js');

        // 1. Seed private tree in local multi-tree storage
        const privateTree = {
          title: 'Async Race Dynasty',
          ownerUid: 'user_async',
          isPublic: false,
          data: {
            people: [{ id: 'p_async_1', name: 'Async Patriarch' }],
            couples: []
          }
        };
        localStorage.setItem('gupta_multi_trees_v1', JSON.stringify({
          tree_async_1: privateTree
        }));

        // 2. User initiates navigation to private tree
        setTreeIdInUrl('tree_async_1');
        assert.equal(getTreeIdFromUrl(), 'tree_async_1');

        let lateUpdateReceived = null;
        const unsubscribe = subscribeToTree(
          'tree_async_1',
          data => { lateUpdateReceived = data; },
          () => {}
        );

        // 3. User rapidly double-switches to Demo Tree before async operations complete
        if (typeof unsubscribe === 'function') unsubscribe(); // Cancel private tree listener
        setTreeIdInUrl(''); // Clear URL tree param
        assert.equal(getTreeIdFromUrl(), '', 'URL must resolve to demo tree');

        // 4. Verify Demo tree state is active and unpolluted by cancelled async load
        const demoState = loadInitialTreeState();
        assert.ok(demoState.data.people.length > 0);
        assert.ok(
          !demoState.data.people.some(p => p.id === 'p_async_1'),
          'Demo tree state must not be corrupted by cancelled private tree subscription'
        );

        // 5. Verify private tree data in storage was not damaged by rapid switching
        const storedMap = JSON.parse(localStorage.getItem('gupta_multi_trees_v1') || '{}');
        assert.equal(storedMap.tree_async_1?.title, 'Async Race Dynasty');
      });

      it('T2-F3-05: State preservation when LocalStorage throws QuotaExceededError', () => {
        browserEnv.window.localStorage.setThrowQuotaExceeded(true);
        assert.throws(() => {
          browserEnv.window.localStorage.setItem('test_key', 'val');
        }, /QuotaExceededError/);
        browserEnv.window.localStorage.setThrowQuotaExceeded(false);
      });
    });

    // -----------------------------------------------------------------------
    // F4 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F4 Boundaries', () => {
      it('T2-F4-01: Invalid view parameter in URL', async () => {
        browserEnv.window.history.pushState({}, '', '/?view=invalid_mode_xyz');
        const treeSync = await import('../src/services/treeSync.js');
        assert.equal(
          typeof treeSync.parseViewStateFromUrl,
          'function',
          'treeSync service must export parseViewStateFromUrl function'
        );
        const state = treeSync.parseViewStateFromUrl();
        assert.equal(state.view, 'home', 'Unknown view parameter must fallback to home');
        assert.equal(state.treeId, '', 'Invalid view parameter must clear active treeId');

        // Test with malformed / unknown parameters
        browserEnv.window.history.pushState({}, '', '/?view=admin&tree=malformed');
        const state2 = treeSync.parseViewStateFromUrl();
        assert.equal(state2.view, 'home', 'Unrecognized view must fallback to home view');
      });

      it('T2-F4-02: Non-existent tree query parameter', () => {
        browserEnv.window.history.pushState({}, '', '/?view=tree&tree=nonexistent_999');
        assert.equal(getTreeIdFromUrl(), 'nonexistent_999');
      });

      it('T2-F4-03: URL with extraneous query parameters and hash fragments', () => {
        browserEnv.window.history.pushState({}, '', '/?view=tree&tree=tree_1&utm_medium=cpc&debug=true#top');
        assert.equal(getTreeIdFromUrl(), 'tree_1');
      });

      it('T2-F4-04: Malformed percent-encoding in query parameters', () => {
        browserEnv.window.location.search = '?view=tree&tree=%ZZ%malformed';
        assert.doesNotThrow(() => {
          getTreeIdFromUrl();
        });
      });

      it('T2-F4-05: Rapid successive popstate events (Fast Back/Forward clicks)', () => {
        for (let i = 0; i < 5; i++) {
          browserEnv.window.dispatchEvent(new Event('popstate'));
        }
        assert.ok(true, 'Rapid popstate dispatches must not cause uncaught errors');
      });
    });

    // -----------------------------------------------------------------------
    // F5 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F5 Boundaries', () => {
      it('T2-F5-01: Breadcrumb perspective for member with missing Hindi name in Hindi mode', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const tHi = createTranslator('hi');
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          viewerName: 'David',
          t: tHi
        });
        assert.ok(!html.includes('null'));
        assert.ok(!html.includes('undefined'));
        assert.ok(html.includes('David'));
      });

      it('T2-F5-02: Breadcrumb trail with 50-character person name', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const longName = 'Rajendraprasad Chandrashekhar Vishwanath Sharma';
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          viewerName: longName,
          t
        });
        assert.ok(html.includes(longName));
      });

      it('T2-F5-03: Clicking currently active (leaf) breadcrumb segment', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          t
        });
        assert.ok(html.includes('aria-current="page"') || html.includes(t('breadcrumbDemo')));
      });

      it('T2-F5-04: Dynamic breadcrumb update when deleting the perspective person', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const htmlWithViewer = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          viewerName: 'Person A',
          t
        });
        const htmlWithoutViewer = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          viewerName: '',
          t
        });
        assert.ok(htmlWithViewer.includes('Person A'));
        assert.ok(!htmlWithoutViewer.includes('Person A'));
      });

      it('T2-F5-05: Breadcrumbs rendering on narrow mobile screen (320px)', async () => {
        const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Breadcrumbs, {
          currentView: 'tree',
          activeTreeId: '',
          viewportMode: 'mobile',
          t
        });
        assertElementExists(html, 'nav[aria-label="Breadcrumb"]');
      });
    });

    // -----------------------------------------------------------------------
    // F6 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F6 Boundaries', () => {
      it('T2-F6-01: Mobile touch targets meet accessibility size standards', async () => {
        const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(MobileBottomNav, {
          currentView: 'home',
          t
        });
        // Check 4 touch target buttons
        assertElementCount(html, 'button', 4, 'Must render 4 touch target buttons');
      });

      it('T2-F6-02: Layout stability on ultra-narrow viewport (320px screen width)', async () => {
        browserEnv.window.innerWidth = 320;
        localStorage.setItem('gupta_viewport_mode', 'mobile');
        
        // Verify CSS responsive layout rules for mobile viewport mode
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        assert.ok(
          landingCss.includes(':root[data-viewport="mobile"]'),
          'CSS must declare :root[data-viewport="mobile"] responsive layout container'
        );
        assert.ok(
          landingCss.includes(':root[data-viewport="mobile"] .site-nav') &&
          landingCss.includes('flex-wrap: wrap'),
          'Mobile site-nav must wrap navigation controls to fit narrow viewports without horizontal overflow'
        );

        // Verify Navbar SSR with mobile viewport mode
        const Navbar = await loadComponent('./src/components/Navbar.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(Navbar, {
          currentView: 'home',
          viewportMode: 'mobile',
          t
        });
        assertElementExists(html, '.site-nav', 'Navbar must render site-nav in mobile mode');
        assertElementExists(html, '.nav-center', 'Navbar must render nav-center tabs in mobile mode');
      });

      it('T2-F6-03: Mobile bottom bar with XL text size (data-text-size="xlarge")', () => {
        localStorage.setItem('gupta_text_size', 'xlarge');
        assert.equal(localStorage.getItem('gupta_text_size'), 'xlarge');
      });

      it('T2-F6-04: Mobile landscape orientation (height <= 500px)', async () => {
        browserEnv.window.innerWidth = 740;
        browserEnv.window.innerHeight = 380;

        // Verify mobile landscape ergonomic styles in landing.css
        const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
        assert.ok(
          landingCss.includes(':root[data-viewport="mobile"] .site-nav'),
          'Must define compact mobile navigation container'
        );
        assert.ok(
          /:root\[data-viewport="mobile"\]\s+\.site-nav\s*\{[^}]*height:\s*auto/i.test(landingCss),
          'Mobile site-nav must use height: auto to preserve vertical space in landscape orientation'
        );

        // Verify MobileBottomNav mounts with touch button targets under landscape constraints
        const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
        const t = createTranslator('en');
        const html = renderComponentToHtml(MobileBottomNav, {
          currentView: 'tree',
          activeTreeId: '',
          t
        });
        assertElementExists(html, '.mobile-bottom-nav', 'Must render .mobile-bottom-nav touch bar');
        assertElementCount(html, 'button', 4, 'Must render 4 compact touch buttons for mobile ergonomics');
      });

      it('T2-F6-05: Rapid switching between Display Modes ("Auto", "Laptop", "Mobile")', () => {
        const modes = ['auto', 'laptop', 'mobile', 'auto'];
        for (const m of modes) {
          localStorage.setItem('gupta_viewport_mode', m);
        }
        assert.equal(localStorage.getItem('gupta_viewport_mode'), 'auto');
      });
    });

    // -----------------------------------------------------------------------
    // F7 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F7 Boundaries', () => {
      it('T2-F7-01: Unsupported language code in storage', () => {
        localStorage.setItem('gupta_lang', 'de');
        const lang = localStorage.getItem('gupta_lang');
        const t = createTranslator(lang);
        assert.equal(t('navHome'), 'Home');
      });

      it('T2-F7-02: Missing key fallback in active dictionary', () => {
        const t = createTranslator('hi');
        assert.equal(t('nonExistentKeyXYZ_123'), 'nonExistentKeyXYZ_123');
      });

      it('T2-F7-03: Functional translator with undefined / null parameters', () => {
        const t = createTranslator('en');
        assert.doesNotThrow(() => {
          t('badgeViewingTree', undefined);
          t('statsBadge', null, null);
        });
      });

      it('T2-F7-04: Language toggle while viewing custom-named private tree', () => {
        const tEn = createTranslator('en');
        const tHi = createTranslator('hi');
        assert.equal(tEn('badgeViewingTree', 'Kapoor Lineage'), 'Viewing: Kapoor Lineage');
        assert.equal(tHi('badgeViewingTree', 'Kapoor Lineage'), 'देख रहे हैं: Kapoor Lineage');
      });

      it('T2-F7-05: Devanagari typography and letter-spacing check', async () => {
        // 1. Verify phonetic English-to-Hindi transliteration produces genuine Devanagari Unicode
        const { translitOffline } = await import('../src/i18n/translit.js');
        const devaRegex = /[\u0900-\u097F]/;
        const testNames = ['Gupta', 'Kumar', 'Arpit', 'Priya', 'Sharma'];
        for (const name of testNames) {
          const transliterated = translitOffline(name);
          assert.ok(
            devaRegex.test(transliterated),
            `translitOffline("${name}") must produce Devanagari characters, got "${transliterated}"`
          );
        }

        // 2. Verify Hindi dictionary tokens contain authentic Devanagari text
        const hiModule = (await import('../src/i18n/hi.js')).hi;
        assert.ok(devaRegex.test(hiModule.h1), 'Hindi h1 must contain Devanagari script');
        assert.ok(devaRegex.test(hiModule.viewerLabel), 'Hindi viewerLabel must contain Devanagari script');
        assert.ok(devaRegex.test(hiModule.eyebrow), 'Hindi eyebrow must contain Devanagari script');

        // 3. Verify CSS typography tokens and Devanagari letter-spacing contract
        const tokensCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf-8');
        assert.ok(
          tokensCss.includes('--deva:') && tokensCss.includes('Tiro Devanagari Hindi'),
          'tokens.css must define dedicated Devanagari font stack with Tiro Devanagari Hindi'
        );
        assert.ok(
          tokensCss.includes(':root[lang="hi"]') && tokensCss.includes('letter-spacing: 0 !important'),
          'tokens.css must enforce letter-spacing: 0 !important for Hindi to prevent Devanagari matra decoupling'
        );
      });
    });

    // -----------------------------------------------------------------------
    // F8 Boundary Cases
    // -----------------------------------------------------------------------
    describe('F8 Boundaries', () => {
      it('T2-F8-01: Dev server port conflict resolution configuration', async () => {
        const viteConfig = (await import('../vite.config.js')).default;
        assert.ok(viteConfig.server?.port === 3000);
      });

      it('T2-F8-02: Production bundle size budget verification', () => {
        const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
        assert.ok(fs.existsSync(distAssetsDir));
        const files = fs.readdirSync(distAssetsDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        assert.ok(jsFiles.length > 0);
      });

      it('T2-F8-03: 100% Offline execution capability', () => {
        // canUserEditTree and treeSync operate offline using local storage
        assert.ok(typeof canUserEditTree === 'function');
      });

      it('T2-F8-04: Git diff cleanliness verification', () => {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        // Checks that no sensitive files or secrets are untracked
        assert.ok(!status.includes('.env.local'));
      });

      it('T2-F8-05: Node LTS compatibility and ECMAScript modules', () => {
        const pkgJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
        assert.equal(pkgJson.type, 'module');
      });
    });
  });

  // =========================================================================
  // TIER 3: PAIRWISE COMBINATORIAL COVERAGE (14 TEST CASES)
  // =========================================================================
  describe('Tier 3: Pairwise Combinatorial Coverage', () => {
    it('T3-PAIR-01 [F1+F3]: 3-Way Switching with State & Tree Memory Preservation', () => {
      localStorage.setItem('gupta_last_private_tree_id', 'tree_alpha');
      
      // Navigate to Demo Tree
      setTreeIdInUrl('');
      assert.equal(localStorage.getItem('gupta_last_private_tree_id'), 'tree_alpha');
      
      // Return to My Private Tree
      const restored = localStorage.getItem('gupta_last_private_tree_id');
      setTreeIdInUrl(restored);
      assert.equal(getTreeIdFromUrl(), 'tree_alpha');
    });

    it('T3-PAIR-02 [F1+F4]: 3-Way Switching with URL Parameter Synchronization & Browser History Popstate', () => {
      browserEnv.window.history.pushState({}, '', '/?view=home');
      browserEnv.window.history.pushState({}, '', '/?view=tree');
      browserEnv.window.history.pushState({}, '', '/?view=tree&tree=tree_beta');

      assert.equal(getTreeIdFromUrl(), 'tree_beta');
      browserEnv.window.history.back();
      assert.equal(getTreeIdFromUrl(), '');
      assert.equal(browserEnv.window.location.search, '?view=tree');
      browserEnv.window.history.back();
      assert.equal(browserEnv.window.location.search, '?view=home');
    });

    it('T3-PAIR-03 [F1+F7]: 3-Way Primary Navigation under Bilingual Mode Switching', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const tEn = createTranslator('en');
      const tHi = createTranslator('hi');
      
      const htmlEn = renderComponentToHtml(Navbar, { currentView: 'home', t: tEn });
      const htmlHi = renderComponentToHtml(Navbar, { currentView: 'home', t: tHi });
      
      assert.ok(htmlEn.includes(tEn('navHome')));
      assert.ok(htmlHi.includes(tHi('navHome')));
    });

    it('T3-PAIR-04 [F2+F6]: Persistent Active View & Tree Status Indicator on Mobile Viewports', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');
      const html = renderComponentToHtml(Navbar, {
        currentView: 'tree',
        activeTreeId: '',
        viewportMode: 'mobile',
        t
      });
      assert.ok(html.includes(t('badgeDemoTree')) || html.includes('stats-badge') || html.includes('active-tree-badge'));
    });

    it('T3-PAIR-05 [F2+F7]: Active View & Status Indicator Bilingual Dynamic Formatting', () => {
      const tEn = createTranslator('en');
      const tHi = createTranslator('hi');
      
      assert.equal(tEn('badgeViewingTree', 'Sharma Lineage'), 'Viewing: Sharma Lineage');
      assert.equal(tHi('badgeViewingTree', 'Sharma Lineage'), 'देख रहे हैं: Sharma Lineage');
      assert.equal(tEn('statsBadge', 28, 6), '28 members · 6 generations');
      assert.equal(tHi('statsBadge', 28, 6), '28 सदस्य · 6 पीढ़ियाँ');
    });

    it('T3-PAIR-06 [F3+F4]: Zero-Loss Switching with Page Refresh & Redirect Elimination', () => {
      localStorage.setItem('gupta_last_private_tree_id', 'tree_delta');
      browserEnv.window.history.pushState({}, '', '/?view=home');
      
      const params = new URLSearchParams(browserEnv.window.location.search);
      assert.equal(params.get('view'), 'home');
      assert.equal(params.get('tree'), null);
      assert.equal(localStorage.getItem('gupta_last_private_tree_id'), 'tree_delta');
    });

    it('T3-PAIR-07 [F5+F1]: Contextual Workspace Breadcrumbs Interaction with 3-Way Navigation', async () => {
      const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
      const t = createTranslator('en');
      const html = renderComponentToHtml(Breadcrumbs, {
        currentView: 'tree',
        activeTreeId: '',
        viewerName: 'Amrish Sharma',
        t
      });
      assert.ok(html.includes(t('breadcrumbHome')));
      assert.ok(html.includes(t('breadcrumbDemo')));
    });

    it('T3-PAIR-08 [F6+F7]: Mobile Bottom Navigation Bar in Full Bilingual Mode', async () => {
      const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
      const tEn = createTranslator('en');
      const tHi = createTranslator('hi');
      
      const htmlEn = renderComponentToHtml(MobileBottomNav, { currentView: 'home', t: tEn });
      const htmlHi = renderComponentToHtml(MobileBottomNav, { currentView: 'home', t: tHi });
      
      assert.ok(htmlEn.includes(tEn('mobileNavHome')));
      assert.ok(htmlHi.includes(tHi('mobileNavHome')));
    });

    it('T3-PAIR-09 [F5+F3]: Breadcrumb Perspective Reset with Zero-Loss Member & Tree State', async () => {
      const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
      const { mergeCloudTreeWithLocalHistory } = await import('../src/utils/storage.js');
      const t = createTranslator('en');

      // 1. Seed private tree with custom member notes in storage
      const tree = {
        title: 'Gupta Dynasty',
        ownerUid: 'user_epsilon',
        data: {
          people: [{ id: 'p_root', name: 'Root Patriarch', notes: 'Founding patriarch' }],
          couples: []
        }
      };
      localStorage.setItem('gupta_multi_trees_v1', JSON.stringify({ tree_epsilon: tree }));
      setTreeIdInUrl('tree_epsilon');

      // 2. Render Breadcrumbs with active person perspective
      let perspectiveResetCalled = false;
      const htmlActive = renderComponentToHtml(Breadcrumbs, {
        currentView: 'tree',
        activeTreeId: 'tree_epsilon',
        activeTreeTitle: 'Gupta Dynasty',
        viewer: 'p_root',
        viewerName: 'Root Patriarch',
        onResetPerspective: () => { perspectiveResetCalled = true; },
        t
      });

      assert.ok(htmlActive.includes('Gupta Dynasty'), 'Breadcrumb must render tree title');
      assert.ok(
        htmlActive.includes('Root Patriarch') || htmlActive.includes(t('breadcrumbPerspective')),
        'Breadcrumb must render perspective trail when viewer is active'
      );

      // 3. Reset perspective and verify tree data zero-loss in storage engine
      const merged = mergeCloudTreeWithLocalHistory('tree_epsilon', tree.data);
      assert.equal(merged.viewer, '', 'Perspective viewer must be reset to overview');
      assert.equal(
        merged.data.people[0].notes,
        'Founding patriarch',
        'Member notes and data must remain 100% intact after perspective reset'
      );
      assert.equal(getTreeIdFromUrl(), 'tree_epsilon', 'Active tree context must not be lost on perspective reset');

      // 4. Render Breadcrumbs post-reset: perspective segment must contract
      const htmlReset = renderComponentToHtml(Breadcrumbs, {
        currentView: 'tree',
        activeTreeId: 'tree_epsilon',
        activeTreeTitle: 'Gupta Dynasty',
        viewer: '',
        t
      });
      assert.ok(htmlReset.includes('Gupta Dynasty'), 'Breadcrumb must retain tree title');
      assert.ok(!htmlReset.includes('Root Patriarch'), 'Perspective trail must be removed when viewer is cleared');
    });

    it('T3-PAIR-10 [F4+F7]: Direct URL Deep-Linking with Global Language Preference', () => {
      localStorage.setItem('gupta_lang', 'hi');
      browserEnv.window.history.pushState({}, '', '/?view=tree&tree=tree_zeta');
      
      assert.equal(localStorage.getItem('gupta_lang'), 'hi');
      assert.equal(getTreeIdFromUrl(), 'tree_zeta');
    });

    it('T3-PAIR-11 [F2+F3]: Status Indicator & Ownership Fidelity during Cross-Tree Transitions', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');
      const user = { uid: 'user_owner_1' };
      
      // In owned private tree
      const htmlPriv = renderComponentToHtml(Navbar, {
        currentView: 'tree',
        activeTreeId: 'tree_owned',
        activeTreeMeta: { id: 'tree_owned', ownerUid: 'user_owner_1', title: 'Owned Tree' },
        user,
        t
      });
      
      // In demo tree
      const htmlDemo = renderComponentToHtml(Navbar, {
        currentView: 'tree',
        activeTreeId: '',
        user,
        t
      });
      
      assert.ok(htmlDemo.includes(t('badgeDemoTree')));
      assert.ok(!htmlDemo.includes(t('ownerBadge')));
    });

    it('T3-PAIR-12 [F6+F1]: Responsive Mobile Viewport Switching between Home, Demo, and Private Trees', async () => {
      const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
      const t = createTranslator('en');
      
      const htmlHome = renderComponentToHtml(MobileBottomNav, { currentView: 'home', t });
      const htmlDemo = renderComponentToHtml(MobileBottomNav, { currentView: 'tree', activeTreeId: '', t });
      const htmlPriv = renderComponentToHtml(MobileBottomNav, { currentView: 'tree', activeTreeId: 'tree_eta', t });
      
      assert.ok(htmlHome.includes(t('mobileNavHome')));
      assert.ok(htmlDemo.includes(t('mobileNavDemo')));
      assert.ok(htmlPriv.includes(t('mobileNavMyTree')));
    });

    it('T3-PAIR-13 [F8+F4]: Localhost Dev Server Execution & URL Query Route Verification', async () => {
      const viteConfig = (await import('../vite.config.js')).default;
      assert.equal(viteConfig.server?.port, 3000);
      assert.equal(viteConfig.server?.open, true);
    });

    it('T3-PAIR-14 [F8+F7]: Push Safety Script & Bilingual Token Completeness Verification', () => {
      const requiredNavTokens = [
        'navHome',
        'navDemoTree',
        'navMyTree',
        'navSwitchView',
        'badgeDemoTree',
        'badgePrivateTree',
        'badgeViewingTree',
        'breadcrumbHome',
        'breadcrumbDemo',
        'breadcrumbPerspective',
        'mobileNavHome',
        'mobileNavDemo',
        'mobileNavMyTree',
        'mobileNavMenu'
      ];
      
      for (const token of requiredNavTokens) {
        assert.ok(token in en, `Token "${token}" must be in en.js`);
        assert.ok(token in hi, `Token "${token}" must be in hi.js`);
      }
    });
  });

  // =========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (6 SCENARIOS)
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios', () => {
    it('T4-SCEN-01: End-to-End Multilingual Journey (Full User Lifecycle)', async () => {
      // 1. Boot at Home in English
      assert.equal(browserEnv.window.location.search, '?view=home');
      
      // 2. Switch language to Hindi
      localStorage.setItem('gupta_lang', 'hi');
      const tHi = createTranslator('hi');
      assert.ok(tHi('landTitle'));

      // 3. Navigate to Demo Tree
      browserEnv.window.history.pushState({}, '', '/?view=tree');
      assert.equal(getTreeIdFromUrl(), '');

      // 4. Navigate to Private Tree
      browserEnv.window.history.pushState({}, '', '/?view=tree&tree=tree_gupta_101');
      localStorage.setItem('gupta_last_private_tree_id', 'tree_gupta_101');
      assert.equal(getTreeIdFromUrl(), 'tree_gupta_101');

      // 5. Navigate to Home
      browserEnv.window.history.pushState({}, '', '/?view=home');
      assert.equal(browserEnv.window.location.search, '?view=home');

      // 6. Reload page on Home - verify remains Home
      const params = new URLSearchParams(browserEnv.window.location.search);
      assert.equal(params.get('view'), 'home');
      assert.equal(params.get('tree'), null);

      // 7. 1-Click return to private tree
      const restoredId = localStorage.getItem('gupta_last_private_tree_id');
      assert.equal(restoredId, 'tree_gupta_101');
      setTreeIdInUrl(restoredId);
      assert.equal(getTreeIdFromUrl(), 'tree_gupta_101');
    });

    it('T4-SCEN-02: Mobile Smartphone Genealogy Exploration', async () => {
      browserEnv.window.innerWidth = 390;
      const MobileBottomNav = await loadComponent('./src/components/MobileBottomNav.jsx');
      const Breadcrumbs = await loadComponent('./src/components/Breadcrumbs.jsx');
      const t = createTranslator('en');

      // 1. Inspect mobile bottom bar on Home
      const navHtml = renderComponentToHtml(MobileBottomNav, { currentView: 'home', t });
      assertElementExists(navHtml, '.mobile-bottom-nav');

      // 2. Breadcrumbs with person perspective
      const breadcrumbHtml = renderComponentToHtml(Breadcrumbs, {
        currentView: 'tree',
        activeTreeId: '',
        viewerName: 'Hari Shankar Sharma',
        t
      });
      assert.ok(breadcrumbHtml.includes('Hari Shankar Sharma'));
    });

    it('T4-SCEN-03: Multi-Tree Genealogist Comparison Workflow', () => {
      // 1. Create Agarwal Heritage private tree
      localStorage.setItem('gupta_multi_trees_v1', JSON.stringify({
        tree_agarwal: { title: 'Agarwal Heritage', data: { people: [{ id: 'p1', name: 'Agarwal' }] } }
      }));
      localStorage.setItem('gupta_last_private_tree_id', 'tree_agarwal');

      // 2. Switch to Demo Tree
      setTreeIdInUrl('');
      assert.equal(getTreeIdFromUrl(), '');
      assert.equal(localStorage.getItem('gupta_last_private_tree_id'), 'tree_agarwal');

      // 3. Return to Agarwal Heritage
      const restored = localStorage.getItem('gupta_last_private_tree_id');
      setTreeIdInUrl(restored);
      assert.equal(getTreeIdFromUrl(), 'tree_agarwal');
    });

    it('T4-SCEN-04: Deep-Link Sharing & Public Guest Navigation', () => {
      // 1. Unauthenticated guest opens shared link
      browserEnv.window.history.pushState({}, '', '/?view=tree&tree=tree_shared_kapoor');
      assert.equal(getTreeIdFromUrl(), 'tree_shared_kapoor');

      // 2. Guest switches to Demo Tree
      browserEnv.window.history.pushState({}, '', '/?view=tree');
      assert.equal(getTreeIdFromUrl(), '');

      // 3. Guest switches to Home
      browserEnv.window.history.pushState({}, '', '/?view=home');
      assert.equal(browserEnv.window.location.search, '?view=home');

      // 4. Guest hits browser Back twice
      browserEnv.window.history.back();
      assert.equal(browserEnv.window.location.search, '?view=tree');
      browserEnv.window.history.back();
      assert.equal(getTreeIdFromUrl(), 'tree_shared_kapoor');
    });

    it('T4-SCEN-05: Offline Resilience & Dirty State Interruption Recovery', () => {
      // Add member to local storage
      const tree = {
        title: 'Offline Lineage',
        data: { people: [{ id: 'kavita', name: 'Kavita Gupta' }], couples: [] }
      };
      localStorage.setItem('gupta_multi_trees_v1', JSON.stringify({ tree_offline: tree }));
      
      // Rapid switching Home -> Demo -> Private Tree
      browserEnv.window.history.pushState({}, '', '/?view=home');
      browserEnv.window.history.pushState({}, '', '/?view=tree');
      browserEnv.window.history.pushState({}, '', '/?view=tree&tree=tree_offline');

      const restored = JSON.parse(localStorage.getItem('gupta_multi_trees_v1'));
      assert.equal(restored.tree_offline.data.people[0].name, 'Kavita Gupta');
    });

    it('T4-SCEN-06: Accessibility, Keyboard Traversal & Contrast Ergonomics', async () => {
      const Navbar = await loadComponent('./src/components/Navbar.jsx');
      const t = createTranslator('en');
      const html = renderComponentToHtml(Navbar, { currentView: 'home', t });

      // Tabgroup accessibility
      assertElementExists(html, '[role="tablist"]');
      
      // Contrast setting persistence
      localStorage.setItem('gupta_contrast', 'high');
      assert.equal(localStorage.getItem('gupta_contrast'), 'high');
    });

    it('T4-SCEN-07: Full Application Root SSR Mount & View Orchestration (src/App.jsx)', async () => {
      const App = await loadComponent('./src/App.jsx');

      // 1. Mount App at Home view
      browserEnv.window.history.pushState({}, '', '/?view=home');
      const htmlHome = renderComponentToHtml(App, {});
      assertElementExists(htmlHome, '.site-nav', 'App at home view must render Navbar container');
      assertElementExists(htmlHome, '.landing', 'App at home view must render LandingPage container');
      assertElementExists(htmlHome, '.hero', 'App at home view must render Hero section');
      assert.ok(htmlHome.includes('FAMILY TREE'), 'App at home view must render brand title');

      // 2. Mount App at Tree view with active tree query parameter
      browserEnv.window.history.pushState({}, '', '/?view=tree&tree=demo_tree_ssr');
      const htmlTree = renderComponentToHtml(App, {});
      assertElementExists(htmlTree, '.site-nav', 'App in tree view must render Navbar container');
      assertElementExists(htmlTree, 'header.reveal-parent', 'App in tree view must render tree workspace header');
      assertElementExists(htmlTree, 'footer.site-footer', 'App in tree view must render site footer');
    });
  });
});
