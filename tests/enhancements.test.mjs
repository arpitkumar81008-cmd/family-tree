import test from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../src/i18n/en.js';
import { hi } from '../src/i18n/hi.js';
import { createTranslator } from '../src/i18n/index.js';
import { INITIAL_DATA, buildFamilyIndex } from '../src/data/familyData.js';
import { computeTreeLayout } from '../src/layout/engine.js';
import {
  loadComponent,
  renderComponentToHtml,
  closeViteServer,
  getViteServer
} from './helpers/ssr-runner.mjs';

function setupBrowserGlobals(search = '') {
  const store = new Map();
  const localStorageMock = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  };
  globalThis.localStorage = localStorageMock;
  globalThis.window = {
    location: {
      origin: 'https://vanshvriksha.web.app',
      pathname: '/',
      search
    },
    history: {
      replaceState: () => {},
      pushState: () => {}
    },
    localStorage: localStorageMock,
    innerWidth: 1280,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  };
  return store;
}

test('Bilingual parity: 100% key parity between en.js and hi.js', () => {
  const enKeys = Object.keys(en);
  const hiKeys = Object.keys(hi);
  assert.deepEqual(
    enKeys.filter(k => !hiKeys.includes(k)),
    [],
    'All English keys must exist in Hindi'
  );
  assert.deepEqual(
    hiKeys.filter(k => !enKeys.includes(k)),
    [],
    'All Hindi keys must exist in English'
  );
});

test('Kapoor Demo Lineage: INITIAL_DATA has Kapoor family & in-law branches', () => {
  const names = INITIAL_DATA.people.map(p => p.name);
  assert.ok(names.includes('Prithviraj Kapoor'), 'Includes Prithviraj Kapoor');
  assert.ok(names.includes('Raj Kapoor'), 'Includes Raj Kapoor');
  assert.ok(names.includes('Ranbir Kapoor'), 'Includes Ranbir Kapoor');
  assert.ok(names.includes('Alia Bhatt'), 'Includes Alia Bhatt');
  assert.ok(names.includes('Raha Kapoor'), 'Includes Raha Kapoor');
  assert.ok(INITIAL_DATA.people.every(p => p.id && p.name && p.hi), 'All members have id, name, and Hindi name');
});

test('Tab Visibility: Navbar, MobileBottomNav, CreateTreeModal, and LandingPage respect hasPrivateTree', async () => {
  setupBrowserGlobals('');
  const t = createTranslator('en');
  const Navbar = await loadComponent('src/components/Navbar.jsx');
  const MobileBottomNav = await loadComponent('src/components/MobileBottomNav.jsx');
  const CreateTreeModal = await loadComponent('src/components/CreateTreeModal.jsx');
  const LandingPage = await loadComponent('src/components/LandingPage.jsx');

  // When hasPrivateTree === false: Home + Demo Tree + Create Your Private Tree CTA; My Private Tree hidden
  const navNoPrivate = renderComponentToHtml(Navbar, {
    currentView: 'home',
    hasPrivateTree: false,
    t,
    lang: 'en'
  });
  assert.match(navNoPrivate, /id="nav-btn-home"/);
  assert.match(navNoPrivate, /id="nav-btn-demo"/);
  assert.match(navNoPrivate, /id="nav-btn-create-private"/);
  assert.doesNotMatch(navNoPrivate, /id="nav-btn-mytree"/);

  // When hasPrivateTree === true: Home + My Private Tree; Demo Tree hidden
  const navWithPrivate = renderComponentToHtml(Navbar, {
    currentView: 'tree',
    activeTreeId: 'tree_user_1',
    hasPrivateTree: true,
    t,
    lang: 'en'
  });
  assert.match(navWithPrivate, /id="nav-btn-home"/);
  assert.match(navWithPrivate, /id="nav-btn-mytree"/);
  assert.doesNotMatch(navWithPrivate, /id="nav-btn-demo"/);
  assert.doesNotMatch(navWithPrivate, /id="nav-btn-create-private"/);

  // MobileBottomNav mirrors tab visibility
  const mobNoPrivate = renderComponentToHtml(MobileBottomNav, {
    currentView: 'home',
    hasPrivateTree: false,
    t
  });
  assert.match(mobNoPrivate, />Demo</);
  assert.match(mobNoPrivate, /mobile-nav-create-btn/);
  assert.doesNotMatch(mobNoPrivate, />My Tree</);

  const mobWithPrivate = renderComponentToHtml(MobileBottomNav, {
    currentView: 'tree',
    activeTreeId: 'tree_user_1',
    hasPrivateTree: true,
    t
  });
  assert.doesNotMatch(mobWithPrivate, />Demo</);
  assert.match(mobWithPrivate, />My Tree</);

  // CreateTreeModal hides Demo Tree entry when hasPrivateTree === true
  const createWithPrivate = renderComponentToHtml(CreateTreeModal, {
    t,
    user: { uid: 'u1', email: 'u1@example.com' },
    hasPrivateTree: true,
    close: () => {}
  });
  assert.doesNotMatch(createWithPrivate, /Interactive Public Demo/);
  assert.match(createWithPrivate, /<ul class="tree-directory"><\/ul>/);

  // LandingPage hides Demo CTAs when hasPrivateTree === true
  const landingWithPrivate = renderComponentToHtml(LandingPage, {
    t,
    lang: 'en',
    hasPrivateTree: true,
    memberCount: INITIAL_DATA.people.length,
    generationCount: 5,
    branchCount: INITIAL_DATA.couples.length,
    onExplore: () => {},
    onCreate: () => {},
    onNavigateMyTree: () => {}
  });
  assert.doesNotMatch(landingWithPrivate, /Explore Demo Tree/);
});

test('Private URL Sharing & Access Control: token generation, URL builder, and ACCESS_DENIED guard', async () => {
  setupBrowserGlobals('');
  const server = await getViteServer();
  const treeSync = await server.ssrLoadModule('src/services/treeSync.js');
  const token = treeSync.generatePrivateShareToken(12);
  assert.equal(token.length, 12);
  assert.match(token, /^[A-Za-z0-9]+$/);

  const url = treeSync.buildPrivateShareUrl('tree_abc', token);
  assert.equal(url, 'https://vanshvriksha.web.app/?view=tree&tree=tree_abc&code=' + token);

  const privateTree = {
    id: 'tree_secret_1',
    title: 'Secret Lineage',
    isPublic: false,
    ownerUid: 'owner_1',
    shareCode: 'SECRET-TOKEN-99',
    viewerEmails: ['invited@example.com'],
    editorEmails: [],
    data: { people: [{ id: 'p1', name: 'Hidden Ancestor', g: 'M' }], couples: [] }
  };

  // Unauthenticated guest without code is denied
  assert.equal(treeSync.canUserViewTree(privateTree, null), false);
  assert.equal(treeSync.hasMatchingShareCode(privateTree), false);
  // Owner is allowed
  assert.equal(treeSync.canUserViewTree(privateTree, { uid: 'owner_1', email: 'owner@example.com' }), true);
  // Invited viewer email is allowed
  assert.equal(treeSync.canUserViewTree(privateTree, { uid: 'u2', email: 'invited@example.com' }), true);

  // After recording matching shareCode, guest access is unlocked
  treeSync.recordUnlockedShareCode(privateTree.id, 'SECRET-TOKEN-99');
  assert.equal(treeSync.hasMatchingShareCode(privateTree), true);
  assert.equal(treeSync.canUserViewTree(privateTree, null), true);
});

test('Sidebar Sub-Trees & Collapsible Canvas Containers: layout metadata and SSR rendering', async () => {
  setupBrowserGlobals('');
  const t = createTranslator('en');
  const familyIndex = buildFamilyIndex(INITIAL_DATA);
  const layout = computeTreeLayout(INITIAL_DATA, 138, 'en', '');

  assert.ok(Array.isArray(layout.subTrees), 'computeTreeLayout returns subTrees array');
  assert.ok(layout.subTrees.length >= 2, 'Kapoor lineage produces Main Lineage + In-Law sub-trees');
  const mainSubTree = layout.subTrees.find(st => st.isMain);
  assert.ok(mainSubTree, 'Main sub-tree is present');
  assert.ok(mainSubTree.memberIds.length > 0);
  assert.ok(mainSubTree.boundingBox.w > 0 && mainSubTree.boundingBox.h > 0);

  const SubTreesSidebar = await loadComponent('src/components/SubTreesSidebar.jsx');
  const html = renderComponentToHtml(SubTreesSidebar, {
    subTrees: layout.subTrees,
    collapsedSubTrees: { [mainSubTree.id]: true },
    onToggleSubTree: () => {},
    onFocusSubTree: () => {},
    onFocusMember: () => {},
    familyIndex,
    displayName: id => familyIndex.byId[id]?.name || id,
    viewer: '',
    t,
    lang: 'en',
    isOpen: true,
    onClose: () => {}
  });

  assert.match(html, /subtrees-sidebar/);
  assert.match(html, /subtree-group-header/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-expanded="true"/);

  const Canvas = await loadComponent('src/components/Canvas.jsx');
  const canvasHtml = renderComponentToHtml(Canvas, {
    treeState: { data: INITIAL_DATA, photos: {}, lang: 'en', viewer: '' },
    familyIndex,
    layout,
    cardHeight: 138,
    zoom: 1,
    setZoom: () => {},
    fitView: () => {},
    searchQuery: '',
    searchMatches: new Set(),
    viewer: '',
    lang: 'en',
    t,
    displayName: id => familyIndex.byId[id]?.n || id,
    onCardClick: () => {},
    onZoom: () => {},
    onResetViewer: () => {},
    collapsedSubTrees: { [mainSubTree.id]: true },
    onToggleSubTree: () => {}
  });

  assert.match(canvasHtml, /canvas-subtree-box/);
  assert.match(canvasHtml, /canvas-subtree-header/);
});

test('Toolbar & RelationSolverModal: Find Relation button and solver modal render cleanly', async () => {
  setupBrowserGlobals('');
  const t = createTranslator('en');
  const familyIndex = buildFamilyIndex(INITIAL_DATA);
  const Toolbar = await loadComponent('src/components/Toolbar.jsx');
  const RelationSolverModal = await loadComponent('src/components/RelationSolverModal.jsx');

  const toolbarHtml = renderComponentToHtml(Toolbar, {
    viewer: '',
    setViewer: () => {},
    searchQuery: '',
    setSearchQuery: () => {},
    people: INITIAL_DATA.people,
    displayName: id => familyIndex.byId[id]?.n || id,
    t,
    lang: 'en',
    onOpenAddModal: () => {},
    onOpenRelationSolver: () => {},
    canEdit: true,
    familyIndex
  });
  assert.match(toolbarHtml, /toolbar-relation-btn/);

  const modalHtml = renderComponentToHtml(RelationSolverModal, {
    isOpen: true,
    onClose: () => {},
    familyIndex,
    people: INITIAL_DATA.people,
    lang: 'en',
    t,
    displayName: id => familyIndex.byId[id]?.n || id,
    initialOriginId: INITIAL_DATA.people[0].id,
    initialTargetId: INITIAL_DATA.people[1].id
  });
  assert.match(modalHtml, /Relationship|Find Relation/i);
});

test.after(async () => {
  await closeViteServer();
});
