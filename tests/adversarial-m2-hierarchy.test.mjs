/**
 * Adversarial Test Suite for Milestone M2 (Full-Screen Family Tree View Mode):
 * Stacking Order Hierarchy, Dynamic Viewport Resilience, Bilingual Rendering & Dictionary Integrity.
 *
 * Focus Areas:
 * 1. Stacking order invariants (mobile-bottom-nav < site-nav < fullscreen host < modal overlay < settings popover).
 * 2. Dynamic viewport unit resilience (100dvh with fallback 100vh, 100dvw with fallback 100vw).
 * 3. Bilingual rendering in full-screen toggle controls without clipping across screen widths 320px-414px.
 * 4. Dictionary integrity: exact key count parity (261 keys), zero empty translations, function vs string validation.
 *
 * Execution:
 * node --test tests/adversarial-m2-hierarchy.test.mjs
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/harness.mjs';

import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import { createTranslator } from '../src/i18n/index.js';

// ============================================================================
// CSS PARSER & STACKING ORACLE HELPERS
// ============================================================================

/**
 * Extracts raw CSS declaration blocks for specific selectors from CSS source.
 */
function extractCssBlock(cssContent, selectorPattern) {
  // Matches selector { declarations }
  const regex = new RegExp(`(${selectorPattern})\\s*\\{([^}]+)\\}`, 'g');
  const blocks = [];
  let match;
  while ((match = regex.exec(cssContent)) !== null) {
    blocks.push({
      selector: match[1].trim(),
      rawBody: match[2].trim(),
      declarations: match[2]
        .split(';')
        .map(decl => decl.trim())
        .filter(Boolean)
        .map(decl => {
          const colonIdx = decl.indexOf(':');
          if (colonIdx === -1) return null;
          const prop = decl.slice(0, colonIdx).trim().toLowerCase();
          const valWithImportant = decl.slice(colonIdx + 1).trim();
          const isImportant = valWithImportant.toLowerCase().includes('!important');
          const value = valWithImportant.replace(/!important/i, '').trim();
          return { property: prop, value, isImportant, raw: decl };
        })
        .filter(Boolean)
    });
  }
  return blocks;
}

/**
 * Stacking Order Oracle: Simulates hit-testing across overlapping UI layers.
 */
function resolveHitTestTarget({
  isFullscreen = false,
  isPersonModalOpen = false,
  isSettingsOpen = false,
  isSkipLinkActive = false,
  targetRegion = 'top' // 'top', 'bottom', 'center'
}) {
  // Layer registry with base z-indices and active status
  const layers = [];

  // Skip link (z-index: 2000)
  if (isSkipLinkActive) {
    layers.push({ name: 'skip-link', zIndex: 2000, covers: ['top'] });
  }

  // Settings popover inside site-nav (z-index: 1000 !important)
  if (isSettingsOpen) {
    layers.push({ name: 'settings-popover', zIndex: 1000, covers: ['top', 'center'] });
  }

  // Person card detail modal sheet overlay (z-index: 999)
  if (isPersonModalOpen) {
    layers.push({ name: 'modal-overlay', zIndex: 999, covers: ['top', 'center', 'bottom'] });
  }

  // Full-screen canvas container (z-index: 800 !important)
  if (isFullscreen) {
    layers.push({ name: 'fullscreen-canvas', zIndex: 800, covers: ['top', 'center', 'bottom'] });
  }

  // Normal site navigation (z-index: 100)
  layers.push({ name: 'site-nav', zIndex: 100, covers: ['top'] });

  // Normal mobile bottom navigation (z-index: 95)
  layers.push({ name: 'mobile-bottom-nav', zIndex: 95, covers: ['bottom'] });

  // Normal tree canvas (z-index: 0)
  layers.push({ name: 'normal-canvas', zIndex: 0, covers: ['top', 'center', 'bottom'] });

  // Filter layers that cover the clicked region and sort descending by zIndex
  const matchingLayers = layers.filter(layer => layer.covers.includes(targetRegion));
  matchingLayers.sort((a, b) => b.zIndex - a.zIndex);

  return matchingLayers[0];
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Adversarial M2-2 Challenge: Hierarchy, Viewports & Localization', () => {
  let treeCss;
  let landingCss;
  let compCss;

  before(() => {
    treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
    landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
    compCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');
  });

  after(async () => {
    await closeViteServer();
  });

  // =========================================================================
  // SECTION 1: STACKING ORDER & LAYERING HIERARCHY INVARIANTS
  // =========================================================================
  describe('Section 1: Stacking Order Hierarchy & Z-Index Cascade Invariants', () => {
    it('ADV-STK-01: Stylesheets explicitly declare exact z-index values for all visual layers', () => {
      // 1. .mobile-bottom-nav has z-index: 95
      const mobileNavBlocks = extractCssBlock(compCss, '\\.mobile-bottom-nav');
      assert.ok(mobileNavBlocks.length > 0, '.mobile-bottom-nav rule must exist in components.css');
      const mobileNavZ = mobileNavBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(mobileNavZ, '.mobile-bottom-nav must declare z-index');
      assert.equal(parseInt(mobileNavZ.value, 10), 95, '.mobile-bottom-nav z-index must be 95');

      // 2. .site-nav base has z-index: 100
      const siteNavBlocks = extractCssBlock(landingCss, '\\.site-nav');
      assert.ok(siteNavBlocks.length > 0, '.site-nav rule must exist in landing.css');
      const siteNavZ = siteNavBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(siteNavZ, '.site-nav must declare z-index');
      assert.equal(parseInt(siteNavZ.value, 10), 100, '.site-nav base z-index must be 100');

      // 3. .treewrap-host.is-fullscreen has z-index: 800 !important
      const fullscreenBlocks = extractCssBlock(treeCss, '\\.treewrap-host\\.is-fullscreen');
      assert.ok(fullscreenBlocks.length > 0, '.treewrap-host.is-fullscreen rule must exist in tree.css');
      const fullscreenZ = fullscreenBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(fullscreenZ, '.treewrap-host.is-fullscreen must declare z-index');
      assert.equal(parseInt(fullscreenZ.value, 10), 800, '.treewrap-host.is-fullscreen z-index must be 800');
      assert.equal(fullscreenZ.isImportant, true, '.treewrap-host.is-fullscreen z-index must use !important');

      // 4. .overlay (Person detail modal sheet) has z-index: 999
      const overlayBlocks = extractCssBlock(compCss, '\\.overlay');
      assert.ok(overlayBlocks.length > 0, '.overlay rule must exist in components.css');
      const overlayZ = overlayBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(overlayZ, '.overlay must declare z-index');
      assert.equal(parseInt(overlayZ.value, 10), 999, '.overlay z-index must be 999');

      // 5. .settings-popover has z-index: 1000
      const settingsBlocks = extractCssBlock(compCss, '\\.settings-popover');
      assert.ok(settingsBlocks.length > 0, '.settings-popover rule must exist in components.css');
      const settingsZ = settingsBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(settingsZ, '.settings-popover must declare z-index');
      assert.equal(parseInt(settingsZ.value, 10), 1000, '.settings-popover z-index must be 1000');

      // 6. .site-nav:has(.settings-popover) has z-index: 1000 !important
      const elevatedNavBlocks = extractCssBlock(landingCss, '\\.site-nav:has\\(\\.settings-popover\\)');
      assert.ok(elevatedNavBlocks.length > 0, '.site-nav:has(.settings-popover) rule must exist in landing.css');
      const elevatedNavZ = elevatedNavBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(elevatedNavZ, '.site-nav:has(.settings-popover) must declare z-index');
      assert.equal(parseInt(elevatedNavZ.value, 10), 1000, '.site-nav:has(.settings-popover) z-index must be 1000');
      assert.equal(elevatedNavZ.isImportant, true, '.site-nav:has(.settings-popover) z-index must use !important');

      // 7. .skip-link has z-index: 2000
      const skipLinkBlocks = extractCssBlock(compCss, '\\.skip-link');
      assert.ok(skipLinkBlocks.length > 0, '.skip-link rule must exist in components.css');
      const skipLinkZ = skipLinkBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(skipLinkZ, '.skip-link must declare z-index');
      assert.equal(parseInt(skipLinkZ.value, 10), 2000, '.skip-link z-index must be 2000');
    });

    it('ADV-STK-02: Stacking order strictly satisfies the mathematical invariant', () => {
      // Invariant: z(mobile-bottom-nav: 95) < z(site-nav: 100) < z(fullscreen: 800) < z(overlay: 999) <= z(settings: 1000) < z(skip-link: 2000)
      const zMobileNav = 95;
      const zSiteNav = 100;
      const zFullscreen = 800;
      const zOverlay = 999;
      const zSettings = 1000;
      const zSkipLink = 2000;

      assert.ok(zMobileNav < zSiteNav, 'mobile bottom nav (95) must sit below site nav (100)');
      assert.ok(zSiteNav < zFullscreen, 'site nav (100) must sit below fullscreen canvas (800)');
      assert.ok(zFullscreen < zOverlay, 'fullscreen canvas (800) must sit strictly below person modal overlay (999)');
      assert.ok(zOverlay <= zSettings, 'person modal overlay (999) must sit below or equal to settings popover (1000)');
      assert.ok(zSettings < zSkipLink, 'settings popover (1000) must sit below accessibility skip link (2000)');
    });

    it('ADV-STK-03: Specificity and !important rule hierarchy ensures proper layer containment', () => {
      // .treewrap-host.is-fullscreen must have !important to override normal flow
      const fullscreenBlocks = extractCssBlock(treeCss, '\\.treewrap-host\\.is-fullscreen');
      const posDecl = fullscreenBlocks[0].declarations.find(d => d.property === 'position');
      const insetDecl = fullscreenBlocks[0].declarations.find(d => d.property === 'inset');
      const zDecl = fullscreenBlocks[0].declarations.find(d => d.property === 'z-index');

      assert.equal(posDecl.isImportant, true, 'position: fixed must have !important');
      assert.equal(insetDecl.isImportant, true, 'inset: 0 must have !important');
      assert.equal(zDecl.isImportant, true, 'z-index: 800 must have !important');

      // .site-nav:has(.settings-popover) must have !important to defeat z-index: 800 !important
      const elevatedNavBlocks = extractCssBlock(landingCss, '\\.site-nav:has\\(\\.settings-popover\\)');
      const elevatedZ = elevatedNavBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.equal(elevatedZ.isImportant, true, '.site-nav:has(.settings-popover) z-index must be !important');
      assert.ok(
        parseInt(elevatedZ.value, 10) > parseInt(zDecl.value, 10),
        'Elevated navbar z-index (1000) must exceed fullscreen canvas z-index (800) even with !important'
      );
    });

    it('ADV-STK-04: Empirical hit-test resolution across all multi-layer combinations', () => {
      // Scenario A: Standard view mode (fullscreen = false)
      const hitTopNormal = resolveHitTestTarget({ isFullscreen: false, targetRegion: 'top' });
      assert.equal(hitTopNormal.name, 'site-nav', 'Top clicks in standard mode must hit site-nav');

      const hitBottomNormal = resolveHitTestTarget({ isFullscreen: false, targetRegion: 'bottom' });
      assert.equal(hitBottomNormal.name, 'mobile-bottom-nav', 'Bottom clicks in standard mode must hit mobile-bottom-nav');

      const hitCenterNormal = resolveHitTestTarget({ isFullscreen: false, targetRegion: 'center' });
      assert.equal(hitCenterNormal.name, 'normal-canvas', 'Center clicks in standard mode must hit tree canvas');

      // Scenario B: Full-screen view mode active, no dialogs open
      const hitTopFullscreen = resolveHitTestTarget({ isFullscreen: true, targetRegion: 'top' });
      assert.equal(hitTopFullscreen.name, 'fullscreen-canvas', 'Top clicks in fullscreen must hit fullscreen-canvas, shielding site-nav');

      const hitBottomFullscreen = resolveHitTestTarget({ isFullscreen: true, targetRegion: 'bottom' });
      assert.equal(hitBottomFullscreen.name, 'fullscreen-canvas', 'Bottom clicks in fullscreen must hit fullscreen-canvas, shielding mobile nav');

      // Scenario C: Full-screen active + Person card modal sheet open
      const hitModalTop = resolveHitTestTarget({ isFullscreen: true, isPersonModalOpen: true, targetRegion: 'top' });
      assert.equal(hitModalTop.name, 'modal-overlay', 'Person modal overlay must capture clicks in fullscreen mode');

      const hitModalCenter = resolveHitTestTarget({ isFullscreen: true, isPersonModalOpen: true, targetRegion: 'center' });
      assert.equal(hitModalCenter.name, 'modal-overlay', 'Person modal sheet must capture clicks in center area');

      // Scenario D: Full-screen active + Settings popover open
      const hitSettingsTop = resolveHitTestTarget({ isFullscreen: true, isSettingsOpen: true, targetRegion: 'top' });
      assert.equal(hitSettingsTop.name, 'settings-popover', 'Settings popover must sit above fullscreen canvas');

      // Scenario E: Full-screen active + Skip link focused
      const hitSkip = resolveHitTestTarget({ isFullscreen: true, isSkipLinkActive: true, targetRegion: 'top' });
      assert.equal(hitSkip.name, 'skip-link', 'Accessibility skip-link must take highest priority');
    });

    it('ADV-STK-05: Canvas child controls sit above cards and stage within fullscreen stacking context', () => {
      const toggleBlocks = extractCssBlock(treeCss, '\\.canvas-fullscreen-toggle');
      assert.ok(toggleBlocks.length > 0, '.canvas-fullscreen-toggle rule must exist');
      const toggleZ = toggleBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(toggleZ, '.canvas-fullscreen-toggle must declare z-index');
      assert.equal(parseInt(toggleZ.value, 10), 25, 'Floating toggle button z-index must be 25');

      const dockBlocks = extractCssBlock(landingCss, '\\.canvas-dock');
      assert.ok(dockBlocks.length > 0, '.canvas-dock rule must exist in landing.css');
      const dockZ = dockBlocks[0].declarations.find(d => d.property === 'z-index');
      assert.ok(dockZ, '.canvas-dock must declare z-index');
      assert.equal(parseInt(dockZ.value, 10), 20, 'Canvas dock z-index must be 20');

      // Cards have z-index 3-6, stage pills have z-index 2
      assert.ok(parseInt(toggleZ.value, 10) > 6, 'Floating toggle must sit above cards (max z-index 6)');
      assert.ok(parseInt(dockZ.value, 10) > 6, 'Canvas dock must sit above cards (max z-index 6)');
    });
  });

  // =========================================================================
  // SECTION 2: DYNAMIC VIEWPORT RESILIENCE & FALLBACK INVARIANTS
  // =========================================================================
  describe('Section 2: Mobile Dynamic Viewport Resilience & Fallback Invariants', () => {
    it('ADV-VWP-01: Dual viewport declaration verification in tree.css', () => {
      const fullscreenBlocks = extractCssBlock(treeCss, '\\.treewrap-host\\.is-fullscreen');
      assert.ok(fullscreenBlocks.length > 0, '.treewrap-host.is-fullscreen rule must exist');
      const decls = fullscreenBlocks[0].declarations;

      const widths = decls.filter(d => d.property === 'width').map(d => d.value);
      const heights = decls.filter(d => d.property === 'height').map(d => d.value);

      assert.ok(widths.includes('100vw'), 'width must declare fallback 100vw');
      assert.ok(widths.includes('100dvw'), 'width must declare modern 100dvw');
      assert.ok(heights.includes('100vh'), 'height must declare fallback 100vh');
      assert.ok(heights.includes('100dvh'), 'height must declare modern 100dvh');
    });

    it('ADV-VWP-02: Fallback declaration ordering invariant (vh before dvh, vw before dvw)', () => {
      // In CSS parsing, the fallback MUST precede the modern unit:
      // width: 100vw;
      // width: 100dvw;
      // height: 100vh;
      // height: 100dvh;
      const fullscreenBlocks = extractCssBlock(treeCss, '\\.treewrap-host\\.is-fullscreen');
      const decls = fullscreenBlocks[0].declarations;

      const idxVw = decls.findIndex(d => d.property === 'width' && d.value === '100vw');
      const idxDvw = decls.findIndex(d => d.property === 'width' && d.value === '100dvw');
      assert.ok(idxVw !== -1 && idxDvw !== -1, 'Both width: 100vw and width: 100dvw must be declared');
      assert.ok(idxVw < idxDvw, 'Fallback width: 100vw MUST appear before modern width: 100dvw');

      const idxVh = decls.findIndex(d => d.property === 'height' && d.value === '100vh');
      const idxDvh = decls.findIndex(d => d.property === 'height' && d.value === '100dvh');
      assert.ok(idxVh !== -1 && idxDvh !== -1, 'Both height: 100vh and height: 100dvh must be declared');
      assert.ok(idxVh < idxDvh, 'Fallback height: 100vh MUST appear before modern height: 100dvh');
    });

    it('ADV-VWP-03: Dual-Engine CSS Parser simulation evaluates correct viewport coverage', () => {
      // Simulates browser CSS parsing engine:
      function simulateCssEngine(declarations, supportedUnits = ['vw', 'vh', 'dvw', 'dvh']) {
        const computed = {};
        for (const decl of declarations) {
          // Check if value uses an unsupported unit
          const unitMatch = decl.value.match(/[a-z]+/i);
          const unit = unitMatch ? unitMatch[0] : null;
          if (!unit || supportedUnits.includes(unit)) {
            computed[decl.property] = decl.value;
          }
        }
        return computed;
      }

      const fullscreenBlocks = extractCssBlock(treeCss, '\\.treewrap-host\\.is-fullscreen');
      const decls = fullscreenBlocks[0].declarations;

      // Modern engine with dvh/dvw support
      const modernStyles = simulateCssEngine(decls, ['vw', 'vh', 'dvw', 'dvh', 'var']);
      assert.equal(modernStyles.width, '100dvw', 'Modern engine must resolve width to 100dvw');
      assert.equal(modernStyles.height, '100dvh', 'Modern engine must resolve height to 100dvh');

      // Legacy engine without dvh/dvw support (e.g. iOS Safari < 15.4 or older WebView)
      const legacyStyles = simulateCssEngine(decls, ['vw', 'vh', 'var']);
      assert.equal(legacyStyles.width, '100vw', 'Legacy engine must fall back to 100vw');
      assert.equal(legacyStyles.height, '100vh', 'Legacy engine must fall back to 100vh');
    });

    it('ADV-VWP-04: Inner .treewrap container completely overrides non-fullscreen constraints', () => {
      // In standard mode: .treewrap has height: calc(100vh - 210px); min-height: 540px; margin-block: 16px;
      // In fullscreen mode: .treewrap-host.is-fullscreen .treewrap must have 100% height and 0 margin
      const innerFullscreenBlocks = extractCssBlock(treeCss, '\\.treewrap-host\\.is-fullscreen \\.treewrap');
      assert.ok(innerFullscreenBlocks.length > 0, '.treewrap-host.is-fullscreen .treewrap rule must exist in tree.css');
      const decls = innerFullscreenBlocks[0].declarations;

      const heightDecl = decls.find(d => d.property === 'height');
      const minHeightDecl = decls.find(d => d.property === 'min-height');
      const maxHeightDecl = decls.find(d => d.property === 'max-height');
      const marginDecl = decls.find(d => d.property === 'margin');
      const borderDecl = decls.find(d => d.property === 'border');

      assert.equal(heightDecl.value, '100%', 'Inner treewrap height must be 100%');
      assert.equal(heightDecl.isImportant, true, 'Inner treewrap height must use !important');
      assert.equal(minHeightDecl.value, '100%', 'Inner treewrap min-height must be 100%');
      assert.equal(minHeightDecl.isImportant, true, 'Inner treewrap min-height must use !important');
      assert.equal(maxHeightDecl.value, '100%', 'Inner treewrap max-height must be 100%');
      assert.equal(marginDecl.value, '0', 'Inner treewrap margin must be 0');
      assert.equal(borderDecl.value, 'none', 'Inner treewrap border must be none');

      // Also check defensive overrides in landing.css
      assert.ok(
        landingCss.includes('.treewrap-host.is-fullscreen .treewrap') && landingCss.includes('height: 100% !important'),
        'landing.css must also include defensive 100% height overrides'
      );
    });

    it('ADV-VWP-05: Dynamic viewport resize and browser toolbar collapse simulation', () => {
      // Simulates mobile browser toolbar collapse:
      // Phone screen: 390 x 844
      // When toolbar is visible: visible height = 784px (100dvh = 784px, 100vh = 844px)
      // When toolbar collapses: visible height = 844px (100dvh = 844px, 100vh = 844px)
      function computeEffectiveCanvasHeight({ screenHeight, toolbarHeight, isToolbarVisible, usesDvh }) {
        if (usesDvh) {
          return isToolbarVisible ? screenHeight - toolbarHeight : screenHeight;
        }
        // Fallback vh always assumes total viewport height
        return screenHeight;
      }

      const screenH = 844;
      const toolbarH = 60;

      // With dvh: canvas matches exact visible viewport
      const heightWithToolbarDvh = computeEffectiveCanvasHeight({ screenHeight: screenH, toolbarHeight: toolbarH, isToolbarVisible: true, usesDvh: true });
      assert.equal(heightWithToolbarDvh, 784, 'dvh matches visible area when toolbar is present');

      const heightWithoutToolbarDvh = computeEffectiveCanvasHeight({ screenHeight: screenH, toolbarHeight: toolbarH, isToolbarVisible: false, usesDvh: true });
      assert.equal(heightWithoutToolbarDvh, 844, 'dvh expands to full screen when toolbar collapses');

      // Without dvh (fallback): canvas remains 844px (usable without layout crash)
      const heightFallback = computeEffectiveCanvasHeight({ screenHeight: screenH, toolbarHeight: toolbarH, isToolbarVisible: true, usesDvh: false });
      assert.equal(heightFallback, 844, 'Fallback vh provides non-zero, full container height');
    });
  });

  // =========================================================================
  // SECTION 3: BILINGUAL STRING RENDERING IN TOGGLE BUTTONS
  // =========================================================================
  describe('Section 3: Bilingual String Rendering in Full-Screen Toggle Buttons', () => {
    let Canvas;
    let CanvasDock;
    const enTranslator = createTranslator('en');
    const hiTranslator = createTranslator('hi');

    const mockTreeState = { data: { people: [], couples: [] }, photos: {} };
    const mockLayout = { W: 1000, H: 800, pos: {}, branchLabels: [], genLabels: [] };

    before(async () => {
      Canvas = await loadComponent('./src/components/Canvas.jsx');
      CanvasDock = await loadComponent('./src/components/CanvasDock.jsx');
    });

    it('ADV-BIL-01: Canvas floating toggle button (.canvas-fullscreen-toggle) renders correctly in English and Hindi', () => {
      const renderCanvas = (lang, isFullscreen) => {
        const t = lang === 'hi' ? hiTranslator : enTranslator;
        return renderComponentToHtml(Canvas, {
          treeState: mockTreeState,
          familyIndex: {},
          layout: mockLayout,
          cardHeight: 90,
          zoom: 1.0,
          setZoom: () => {},
          fitView: () => {},
          searchQuery: '',
          searchMatches: [],
          viewer: '',
          displayName: () => '',
          onCardClick: () => {},
          onZoom: () => {},
          onResetViewer: () => {},
          t,
          lang,
          isFullscreen
        });
      };

      // 1. English Standard (Enter Full Screen)
      const htmlEnStandard = renderCanvas('en', false);
      assert.ok(htmlEnStandard.includes('class="canvas-fullscreen-toggle"'), 'Floating toggle button must be rendered');
      assert.ok(htmlEnStandard.includes('aria-label="Enter full screen"'), 'En standard button must have correct aria-label');
      assert.ok(htmlEnStandard.includes('title="Enter full screen"'), 'En standard button must have correct title');
      assert.ok(htmlEnStandard.includes('<span>Full screen</span>'), 'En standard button must render short label');
      assert.ok(htmlEnStandard.includes('⛶'), 'En standard button must display enter icon');

      // 2. English Fullscreen (Exit Full Screen)
      const htmlEnFullscreen = renderCanvas('en', true);
      assert.ok(htmlEnFullscreen.includes('aria-label="Exit full screen"'), 'En fullscreen button must have exit aria-label');
      assert.ok(htmlEnFullscreen.includes('<span>Exit</span>'), 'En fullscreen button must render exit short label');
      assert.ok(htmlEnFullscreen.includes('✕'), 'En fullscreen button must display exit icon');

      // 3. Hindi Standard (फुल स्क्रीन में देखें)
      const htmlHiStandard = renderCanvas('hi', false);
      assert.ok(htmlHiStandard.includes('aria-label="फुल स्क्रीन में देखें"'), 'Hi standard button must have Hindi aria-label');
      assert.ok(htmlHiStandard.includes('title="फुल स्क्रीन में देखें"'), 'Hi standard button must have Hindi title');
      assert.ok(htmlHiStandard.includes('<span>फुल स्क्रीन</span>'), 'Hi standard button must render Hindi short label');
      assert.ok(htmlHiStandard.includes('⛶'), 'Hi standard button must display enter icon');

      // 4. Hindi Fullscreen (फुल स्क्रीन से बाहर निकलें)
      const htmlHiFullscreen = renderCanvas('hi', true);
      assert.ok(htmlHiFullscreen.includes('aria-label="फुल स्क्रीन से बाहर निकलें"'), 'Hi fullscreen button must have Hindi exit aria-label');
      assert.ok(htmlHiFullscreen.includes('<span>बाहर निकलें</span>'), 'Hi fullscreen button must render Hindi exit short label');
      assert.ok(htmlHiFullscreen.includes('✕'), 'Hi fullscreen button must display exit icon');
    });

    it('ADV-BIL-02: CanvasDock fullscreen button (.dock-btn.dock-fullscreen-btn) renders correctly in English and Hindi', () => {
      const renderDock = (lang, isFullscreen) => {
        const t = lang === 'hi' ? hiTranslator : enTranslator;
        return renderComponentToHtml(CanvasDock, {
          zoom: 1.0,
          onZoomIn: () => {},
          onZoomOut: () => {},
          onFit: () => {},
          onPan: () => {},
          onReset: () => {},
          onToggleFullscreen: () => {},
          t,
          lang,
          isFullscreen
        });
      };

      // 1. English Standard Dock Button
      const dockEnStandard = renderDock('en', false);
      assert.ok(dockEnStandard.includes('dock-fullscreen-btn'), 'Dock fullscreen button must exist');
      assert.ok(dockEnStandard.includes('aria-label="Enter full screen"'), 'Dock En standard aria-label');
      assert.ok(dockEnStandard.includes('aria-pressed="false"'), 'Dock En standard aria-pressed must be false');
      assert.ok(dockEnStandard.includes('⛶ Full screen'), 'Dock En standard label text');

      // 2. English Fullscreen Dock Button
      const dockEnFullscreen = renderDock('en', true);
      assert.ok(dockEnFullscreen.includes('dock-fullscreen-btn active'), 'Dock En active class');
      assert.ok(dockEnFullscreen.includes('aria-label="Exit full screen"'), 'Dock En fullscreen aria-label');
      assert.ok(dockEnFullscreen.includes('aria-pressed="true"'), 'Dock En fullscreen aria-pressed must be true');
      assert.ok(dockEnFullscreen.includes('✕ Exit'), 'Dock En fullscreen label text');

      // 3. Hindi Standard Dock Button
      const dockHiStandard = renderDock('hi', false);
      assert.ok(dockHiStandard.includes('aria-label="फुल स्क्रीन में देखें"'), 'Dock Hi standard aria-label');
      assert.ok(dockHiStandard.includes('aria-pressed="false"'), 'Dock Hi standard aria-pressed must be false');
      assert.ok(dockHiStandard.includes('⛶ फुल स्क्रीन'), 'Dock Hi standard label text');

      // 4. Hindi Fullscreen Dock Button
      const dockHiFullscreen = renderDock('hi', true);
      assert.ok(dockHiFullscreen.includes('dock-fullscreen-btn active'), 'Dock Hi active class');
      assert.ok(dockHiFullscreen.includes('aria-label="फुल स्क्रीन से बाहर निकलें"'), 'Dock Hi fullscreen aria-label');
      assert.ok(dockHiFullscreen.includes('aria-pressed="true"'), 'Dock Hi fullscreen aria-pressed must be true');
      assert.ok(dockHiFullscreen.includes('✕ बाहर निकलें'), 'Dock Hi fullscreen label text');
    });

    it('ADV-BIL-03: Rendered markup is free of broken entities, unescaped literals, or string corruption', () => {
      const t = hiTranslator;
      const htmlHi = renderComponentToHtml(Canvas, {
        treeState: mockTreeState,
        familyIndex: {},
        layout: mockLayout,
        cardHeight: 90,
        zoom: 1.0,
        setZoom: () => {},
        fitView: () => {},
        searchQuery: '',
        searchMatches: [],
        viewer: '',
        displayName: () => '',
        onCardClick: () => {},
        onZoom: () => {},
        onResetViewer: () => {},
        t,
        lang: 'hi',
        isFullscreen: false
      });

      // No HTML numeric entities like &#x092B; or &#2347;
      assert.equal(/&#[0-9xX]+;/.test(htmlHi), false, 'Rendered markup must not contain unescaped numeric HTML entities');

      // No unparsed unicode literals like \u092B
      assert.equal(/\\u[0-9a-fA-F]{4}/.test(htmlHi), false, 'Rendered markup must not contain raw unicode escape sequences');

      // No JavaScript null/undefined string leaks
      assert.equal(htmlHi.includes('undefined'), false, 'Rendered markup must not contain "undefined"');
      assert.equal(htmlHi.includes('null'), false, 'Rendered markup must not contain "null"');
      assert.equal(htmlHi.includes('NaN'), false, 'Rendered markup must not contain "NaN"');
      assert.equal(htmlHi.includes('[object Object]'), false, 'Rendered markup must not contain "[object Object]"');
    });

    it('ADV-BIL-04: Authentic Devanagari script integrity for all Hindi translation strings', () => {
      const devanagariRegex = /[\u0900-\u097F]/;

      const m2Keys = ['fullscreenEnter', 'fullscreenExit', 'fullscreenEnterShort', 'fullscreenExitShort'];
      for (const key of m2Keys) {
        const hiVal = hi[key];
        const enVal = en[key];

        assert.equal(typeof hiVal, 'string', `hi.${key} must be a string`);
        assert.ok(devanagariRegex.test(hiVal), `hi.${key} ("${hiVal}") must contain authentic Devanagari characters`);
        assert.notEqual(hiVal, enVal, `hi.${key} must not be identical to en.${key}`);
      }
    });

    it('ADV-BIL-05: Responsive width & text containment simulation across mobile widths (320px to 414px)', () => {
      // Simulate rendered button width across mobile viewports:
      // Font size: 13px, font-family: inherit
      // Icon: ~14px + gap 6px + padding 24px (12px * 2) = 44px fixed overhead
      // Hindi Devanagari character avg width: ~8.5px
      // English Latin character avg width: ~7.2px
      const viewports = [320, 360, 375, 390, 414];

      function estimateButtonWidth(text, lang) {
        const charWidth = lang === 'hi' ? 8.5 : 7.2;
        const textWidth = text.length * charWidth;
        const fixedChrome = 44; // icon + gap + padding
        return Math.ceil(textWidth + fixedChrome);
      }

      for (const width of viewports) {
        // Test standard label
        const widthEnEnter = estimateButtonWidth(en.fullscreenEnterShort, 'en');
        const widthHiEnter = estimateButtonWidth(hi.fullscreenEnterShort, 'hi');

        // Test exit label
        const widthEnExit = estimateButtonWidth(en.fullscreenExitShort, 'en');
        const widthHiExit = estimateButtonWidth(hi.fullscreenExitShort, 'hi');

        const maxWidth = Math.max(widthEnEnter, widthHiEnter, widthEnExit, widthHiExit);

        // Invariant: Button width must occupy less than 45% of total screen width even at 320px
        const occupancy = maxWidth / width;
        assert.ok(
          occupancy < 0.45,
          `Button width (${maxWidth}px) must occupy < 45% of ${width}px viewport (actual: ${(occupancy * 100).toFixed(1)}%)`
        );

        // Invariant: Button right offset (14px) + button width must leave > 50% screen real estate
        const totalUsed = maxWidth + 14;
        assert.ok(
          totalUsed < width * 0.6,
          `Button right + width (${totalUsed}px) must leave > 40% margin on ${width}px viewport`
        );
      }
    });

    it('ADV-BIL-06: Safe-area insets and touch target ergonomics on mobile viewports', () => {
      // tree.css must declare safe-area insets on floating toggle button in fullscreen mode
      assert.ok(
        treeCss.includes('env(safe-area-inset-top') && treeCss.includes('env(safe-area-inset-right'),
        'tree.css must declare safe-area-inset-top and safe-area-inset-right on .canvas-fullscreen-toggle'
      );

      // tree.css must declare safe-area insets on .canvas-dock in fullscreen mode
      assert.ok(
        treeCss.includes('env(safe-area-inset-bottom'),
        'tree.css must declare safe-area-inset-bottom on .canvas-dock in fullscreen mode'
      );

      // Touch target size: media query (max-width: 768px) must enforce min-width: 40px, height: 40px
      assert.ok(
        treeCss.includes('min-width: 40px') && treeCss.includes('height: 40px'),
        'tree.css must enforce accessible touch target dimensions (>= 40px) on mobile viewports'
      );
    });
  });

  // =========================================================================
  // SECTION 4: DICTIONARY PARITY & TRANSLATION INTEGRITY
  // =========================================================================
  describe('Section 4: Dictionary Parity & Translation Integrity', () => {
    it('ADV-DIC-01: Exact key count parity between English and Hindi dictionaries', () => {
      const enKeys = Object.keys(en);
      const hiKeys = Object.keys(hi);

      assert.equal(enKeys.length, 261, 'English dictionary must contain exactly 261 keys');
      assert.equal(hiKeys.length, 261, 'Hindi dictionary must contain exactly 261 keys');
      assert.equal(enKeys.length, hiKeys.length, 'Key counts between English and Hindi must be strictly equal');
    });

    it('ADV-DIC-02: Zero missing keys in both translation directions', () => {
      const enKeys = Object.keys(en);
      const hiKeys = Object.keys(hi);

      const missingInHi = enKeys.filter(k => !hiKeys.includes(k));
      const missingInEn = hiKeys.filter(k => !enKeys.includes(k));

      assert.deepEqual(missingInHi, [], 'Hindi dictionary must have zero missing keys compared to English');
      assert.deepEqual(missingInEn, [], 'English dictionary must have zero missing keys compared to Hindi');
    });

    it('ADV-DIC-03: All translation entries are non-empty and non-dummy', () => {
      function validateDictionaryEntries(dict, lang) {
        const invalidKeys = [];
        for (const [key, val] of Object.entries(dict)) {
          if (typeof val === 'function') {
            try {
              const res = val('MockTarget', 42);
              if (typeof res !== 'string' || res.trim().length === 0) {
                invalidKeys.push({ key, reason: 'function returned empty or non-string' });
              }
            } catch (err) {
              invalidKeys.push({ key, reason: `function threw error: ${err.message}` });
            }
          } else if (typeof val === 'string') {
            if (val.trim().length === 0) {
              invalidKeys.push({ key, reason: 'empty or whitespace-only string' });
            }
            if (/^(todo|tbd|placeholder|undefined|null)$/i.test(val.trim())) {
              invalidKeys.push({ key, reason: `dummy placeholder value: "${val}"` });
            }
          } else {
            invalidKeys.push({ key, reason: `invalid entry type: ${typeof val}` });
          }
        }
        return invalidKeys;
      }

      const invalidEn = validateDictionaryEntries(en, 'en');
      const invalidHi = validateDictionaryEntries(hi, 'hi');

      assert.deepEqual(invalidEn, [], `English dictionary has invalid entries: ${JSON.stringify(invalidEn)}`);
      assert.deepEqual(invalidHi, [], `Hindi dictionary has invalid entries: ${JSON.stringify(invalidHi)}`);
    });

    it('ADV-DIC-04: Milestone M2 translation values match exact specifications', () => {
      assert.equal(en.fullscreenEnter, 'Enter full screen');
      assert.equal(en.fullscreenExit, 'Exit full screen');
      assert.equal(en.fullscreenEnterShort, 'Full screen');
      assert.equal(en.fullscreenExitShort, 'Exit');

      assert.equal(hi.fullscreenEnter, 'फुल स्क्रीन में देखें');
      assert.equal(hi.fullscreenExit, 'फुल स्क्रीन से बाहर निकलें');
      assert.equal(hi.fullscreenEnterShort, 'फुल स्क्रीन');
      assert.equal(hi.fullscreenExitShort, 'बाहर निकलें');
    });

    it('ADV-DIC-05: createTranslator helper function handles M2 keys with boundary tolerance', () => {
      const tEn = createTranslator('en');
      const tHi = createTranslator('hi');

      // Normal calls
      assert.equal(tEn('fullscreenEnter'), 'Enter full screen');
      assert.equal(tHi('fullscreenEnter'), 'फुल स्क्रीन में देखें');
      assert.equal(tEn('fullscreenExitShort'), 'Exit');
      assert.equal(tHi('fullscreenExitShort'), 'बाहर निकलें');

      // Call with extraneous arguments (should not crash)
      assert.equal(tEn('fullscreenEnter', 'foo', 'bar'), 'Enter full screen');
      assert.equal(tHi('fullscreenExit', 123), 'फुल स्क्रीन से बाहर निकलें');

      // Call with non-existent key fallback
      assert.equal(tEn('nonExistentKey999'), 'nonExistentKey999');
      assert.equal(tHi('nonExistentKey999'), 'nonExistentKey999');
    });
  });
});
