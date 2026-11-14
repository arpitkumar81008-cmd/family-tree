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

test('Security: isSafePhotoUrl & sanitizePhotosMap block SVG/script payloads and prototype keys', async () => {
  const { isSafePhotoUrl, sanitizePhotosMap } = await import('../src/data/schema.js');

  assert.equal(isSafePhotoUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
  assert.equal(isSafePhotoUrl('data:image/png;base64,iVBORw0KGgo='), true);
  assert.equal(isSafePhotoUrl('data:image/webp;base64,UklGRh4='), true);
  assert.equal(isSafePhotoUrl('/images/tree-logo.png'), true);
  assert.equal(isSafePhotoUrl('https://firebasestorage.googleapis.com/v0/b/app/o/pic.jpg'), true);

  assert.equal(isSafePhotoUrl('data:image/svg+xml,<svg onload=alert(1)>'), false);
  assert.equal(isSafePhotoUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafePhotoUrl('javascript:alert(1)'), false);
  assert.equal(isSafePhotoUrl('https://evil.example.com/tracker.png'), false);

  const dirtyPhotos = Object.create(null);
  dirtyPhotos.p1 = 'data:image/png;base64,iVBORw0KGgo=';
  dirtyPhotos.p2 = 'data:image/svg+xml;base64,PHN2Zz4=';
  dirtyPhotos['constructor'] = 'data:image/png;base64,bad';
  dirtyPhotos['prototype'] = 'data:image/png;base64,bad';
  Object.defineProperty(dirtyPhotos, '__proto__', {
    value: 'data:image/png;base64,bad',
    enumerable: true
  });

  const clean = sanitizePhotosMap(dirtyPhotos);
  assert.equal(clean.p1, 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(clean.p2, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(clean, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(clean, 'constructor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(clean, 'prototype'), false);
});

test('Security: validateTreeData rejects prototype-pollution IDs and oversized fields', async () => {
  const { validateTreeData } = await import('../src/data/schema.js');

  const protoIdTree = {
    people: [{ id: '__proto__', name: 'Evil', g: 'M' }],
    couples: []
  };
  assert.equal(validateTreeData(protoIdTree).valid, false);

  const longCityTree = {
    people: [{ id: 'p1', name: 'Valid Name', g: 'M', city: 'X'.repeat(200) }],
    couples: []
  };
  assert.equal(validateTreeData(longCityTree).valid, false);
});

test('Photo compression: uses fast createImageBitmap path and rejects cleanly on decode timeouts', async () => {
  const { isHeicFile, compressPhotoFile, compressDataUrl } = await import('../src/utils/photoCompress.js');

  assert.equal(isHeicFile({ name: 'IMG_001.HEIC', type: '' }), true);
  assert.equal(isHeicFile({ name: 'photo.heif', type: 'image/heif' }), true);
  assert.equal(isHeicFile({ name: 'portrait.jpg', type: 'image/jpeg' }), false);

  // Small data URL passes through without decoding
  const tiny = 'data:image/jpeg;base64,/9j/4AAQ';
  assert.equal(await compressDataUrl(tiny, { targetBytes: 8192 }), tiny);

  const origCreateImageBitmap = globalThis.createImageBitmap;
  const origDocument = globalThis.document;
  const origImage = globalThis.Image;
  const origURL = globalThis.URL;

  try {
    let closedCalled = false;
    globalThis.createImageBitmap = async () => ({
      width: 1200,
      height: 800,
      close: () => {
        closedCalled = true;
      }
    });
    globalThis.document = {
      createElement: tag => {
        assert.equal(tag, 'canvas');
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            drawImage: () => {}
          }),
          toDataURL: (_mime, q) =>
            `data:image/jpeg;base64,${q <= 0.6 ? 'A'.repeat(120) : 'B'.repeat(9500)}`
        };
      }
    };

    const fakeFile = new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' });
    const compressed = await compressPhotoFile(fakeFile, { targetBytes: 8192 });
    assert.ok(compressed.startsWith('data:image/jpeg;base64,'));
    assert.ok(compressed.length <= 8192);
    assert.equal(closedCalled, true, 'ImageBitmap.close() must be invoked to free GPU memory');

    // Simulate stalled browser decoder (promise never resolves) and confirm timeout rejects
    globalThis.createImageBitmap = () => new Promise(() => {});
    await assert.rejects(
      () => compressPhotoFile(fakeFile, { targetBytes: 8192, timeoutMs: 40 }),
      /BITMAP_DECODE_TIMEOUT/
    );

    // Simulate stalled Image() in compressDataUrl and confirm timeout rejects
    globalThis.Image = class StalledImage {
      set src(_val) {}
    };
    const largeDataUrl = `data:image/jpeg;base64,${'X'.repeat(9000)}`;
    await assert.rejects(
      () => compressDataUrl(largeDataUrl, { targetBytes: 8192, timeoutMs: 40 }),
      /IMAGE_DECODE_TIMEOUT/
    );
  } finally {
    globalThis.createImageBitmap = origCreateImageBitmap;
    globalThis.document = origDocument;
    globalThis.Image = origImage;
    globalThis.URL = origURL;
  }
});
