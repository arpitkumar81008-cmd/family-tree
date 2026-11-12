import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateTreeData } from '../src/data/schema.js';
import { INITIAL_DATA } from '../src/data/familyData.js';
import { computeTreeLayout } from '../src/layout/engine.js';
import { isPhotosPayloadWithinLimit } from '../src/services/treeSync.js';
import { createTranslator } from '../src/i18n/index.js';
import {
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './helpers/ssr-runner.mjs';

test.after(async () => {
  await closeViteServer();
});

function makeValidTree(count = 3) {
  const people = [];
  for (let i = 1; i <= count; i++) {
    people.push({
      id: `p${i}`,
      name: `Person ${i}`,
      hi: `व्यक्ति ${i}`,
      g: i % 2 === 0 ? 'F' : 'M'
    });
  }
  return {
    people,
    couples: count >= 3 ? [{ h: 'p1', w: 'p2', kids: ['p3'] }] : []
  };
}

// B1: Importing a JSON backup containing `photos` object via validateTreeData & CreateTreeModal SSR/logic without TDZ crash
test('B1: JSON backup with photos validates cleanly and CreateTreeModal has no photos TDZ bug', async () => {
  const backup = {
    title: 'Verma Backup',
    data: makeValidTree(3),
    photos: {
      p1: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/'
    }
  };

  const res = validateTreeData(backup.data);
  assert.equal(res.valid, true, `Expected valid tree data, got: ${res.error}`);

  const photos =
    backup.photos && typeof backup.photos === 'object' && !Array.isArray(backup.photos)
      ? backup.photos
      : {};
  assert.equal(typeof photos.p1, 'string');
  assert.equal(isPhotosPayloadWithinLimit(photos), true);

  // Verify CreateTreeModal source does not contain the TDZ self-reference (`typeof photos`)
  const modalSource = readFileSync(resolve('src/components/CreateTreeModal.jsx'), 'utf8');
  assert.doesNotMatch(
    modalSource,
    /const\s+photos\s*=\s*parsed\.photos\s*&&\s*typeof\s+photos\b/,
    'CreateTreeModal must not reference `photos` inside its own const initializer (TDZ)'
  );

  // Verify CreateTreeModal loads and renders cleanly via SSR
  const CreateTreeModal = await loadComponent('src/components/CreateTreeModal.jsx');
  const html = renderComponentToHtml(CreateTreeModal, {
    open: true,
    onClose: () => {},
    onCreateBlank: async () => {},
    onImport: async () => {},
    user: { uid: 'u1', email: 'test@example.com' },
    onOpenAuth: () => {},
    t: createTranslator('en')
  });
  assert.match(html, /Create/i);
});

// B6: validateTreeData rejects duplicate IDs, child in two couples, ancestor cycles, >5000 entries, >900 KB payloads
test('B6: validateTreeData rejects duplicate person IDs', () => {
  const data = {
    people: [
      { id: 'dup', name: 'Alice', g: 'F' },
      { id: 'dup', name: 'Bob', g: 'M' }
    ],
    couples: []
  };
  const res = validateTreeData(data);
  assert.equal(res.valid, false);
  assert.match(res.error, /Duplicate person ID/i);
});

test('B6: validateTreeData rejects a child belonging to two couples', () => {
  const data = {
    people: [
      { id: 'p1', name: 'Parent One', g: 'M' },
      { id: 'p2', name: 'Parent Two', g: 'F' },
      { id: 'p3', name: 'Parent Three', g: 'M' },
      { id: 'p4', name: 'Parent Four', g: 'F' },
      { id: 'c1', name: 'Child One', g: 'M' }
    ],
    couples: [
      { h: 'p1', w: 'p2', kids: ['c1'] },
      { h: 'p3', w: 'p4', kids: ['c1'] }
    ]
  };
  const res = validateTreeData(data);
  assert.equal(res.valid, false);
  assert.match(res.error, /more than one couple/i);
});

test('B6: validateTreeData rejects ancestor cycles', () => {
  const data = {
    people: [
      { id: 'a', name: 'Ancestor A', g: 'M' },
      { id: 'b', name: 'Ancestor B', g: 'F' }
    ],
    couples: [
      { h: 'a', kids: ['b'] },
      { w: 'b', kids: ['a'] }
    ]
  };
  const res = validateTreeData(data);
  assert.equal(res.valid, false);
  assert.match(res.error, /cycle/i);
});

test('B6: validateTreeData rejects trees with more than 5000 entries', () => {
  const people = [];
  for (let i = 0; i < 5001; i++) {
    people.push({ id: `p${i}`, name: `Person ${i}`, g: i % 2 === 0 ? 'M' : 'F' });
  }
  const res = validateTreeData({ people, couples: [] });
  assert.equal(res.valid, false);
  assert.match(res.error, /5,000|5000/);
});

test('B6: validateTreeData rejects oversized (>900 KB) payloads', () => {
  const bigNote = 'x'.repeat(1900);
  const people = [];
  for (let i = 0; i < 520; i++) {
    people.push({
      id: `p${i}`,
      name: `Person ${i}`,
      g: i % 2 === 0 ? 'M' : 'F',
      note: bigNote
    });
  }
  const res = validateTreeData({ people, couples: [] });
  assert.equal(res.valid, false);
  assert.match(res.error, /900 KB/i);
});

// B7: computeTreeLayout 1,000-person benchmark completes within 2000ms
test('B7: computeTreeLayout 1,000-person benchmark completes within 2000ms', () => {
  const people = [];
  const couples = [];
  // Build a realistic multi-generation tree with 1,000 people
  for (let i = 0; i < 1000; i++) {
    people.push({
      id: `p${i}`,
      name: `Member ${i}`,
      hi: `सदस्य ${i}`,
      g: i % 2 === 0 ? 'M' : 'F'
    });
  }
  // Root couple p0 + p1, then chain/branch couples down the tree
  let nextChild = 2;
  for (let i = 0; i < 498 && nextChild + 1 < 1000; i += 2) {
    const kids = [];
    if (nextChild < 1000) kids.push(`p${nextChild++}`);
    if (nextChild < 1000) kids.push(`p${nextChild++}`);
    couples.push({ h: `p${i}`, w: `p${i + 1}`, kids });
  }

  const start = performance.now();
  const layout = computeTreeLayout({ people, couples }, 138, 'en', '');
  const elapsed = performance.now() - start;

  assert.ok(elapsed < 2000, `computeTreeLayout took ${elapsed.toFixed(1)}ms (expected < 2000ms)`);
  assert.equal(Object.keys(layout.pos).length, 1000);
});

// S8: INITIAL_DATA has no real Kapoor names and no children with birth dates
test('S8: INITIAL_DATA has no real Kapoor names and no children with birth dates', () => {
  const forbiddenNames = ['Raj Kapoor', 'Ranbir Kapoor', 'Raha Kapoor'];
  const allNames = INITIAL_DATA.people.map(p => p.name);

  for (const forbidden of forbiddenNames) {
    assert.ok(
      !allNames.includes(forbidden),
      `INITIAL_DATA must not include real name "${forbidden}"`
    );
  }
  assert.ok(
    !allNames.some(n => /\bKapoor\b/i.test(n)),
    'INITIAL_DATA must not include any Kapoor family names'
  );

  // Leaf-generation children (youngest generation / minors) must not have birth dates
  const parentIds = new Set();
  for (const c of INITIAL_DATA.couples) {
    if (c.h) parentIds.add(c.h);
    if (c.w) parentIds.add(c.w);
  }
  const leafChildren = INITIAL_DATA.people.filter(p => !parentIds.has(p.id));
  const recentDobChildren = INITIAL_DATA.people.filter(p => {
    if (!p.dob) return false;
    const year = parseInt(p.dob.slice(0, 4), 10);
    return year >= 2008;
  });
  assert.deepEqual(
    recentDobChildren.map(p => p.name),
    [],
    'INITIAL_DATA must not include minor birth dates (>= 2008)'
  );
  // Also verify the youngest generation (Gen 4) has no dob at all
  for (const id of ['aarav', 'diya', 'aditi', 'ishaan']) {
    const person = INITIAL_DATA.people.find(p => p.id === id);
    assert.ok(person, `Expected ${id} in INITIAL_DATA`);
    assert.equal(person.dob, undefined, `Child ${person.name} must not have a birth date`);
  }
  assert.ok(leafChildren.length > 0);
});

// B8: Card.jsx aria-label has no trailing comma when relationLabel is empty
test('B8: Card.jsx aria-label has no trailing comma when relationLabel is empty', async () => {
  const Card = await loadComponent('src/components/Card.jsx');
  const t = createTranslator('en');
  const person = { id: 'p1', name: 'Aarav Verma', hi: 'आरव वर्मा', g: 'M' };

  const htmlEmpty = renderComponentToHtml(Card, {
    person,
    pos: { x: 0, y: 0 },
    relationLabel: '',
    t,
    displayName: () => person.name
  });
  assert.match(htmlEmpty, /aria-label="Aarav Verma"/);
  assert.doesNotMatch(htmlEmpty, /aria-label="Aarav Verma,\s*"/);

  const htmlWithRelation = renderComponentToHtml(Card, {
    person,
    pos: { x: 0, y: 0 },
    relationLabel: 'Father',
    t,
    displayName: () => person.name
  });
  assert.match(htmlWithRelation, /aria-label="Aarav Verma, Father"/);
});
