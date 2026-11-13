import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHistoryState,
  pushHistorySnapshot,
  stepUndo,
  stepRedo,
} from '../src/utils/historyStack.js';
import {
  parseMilestoneDate,
  computeUpcomingMilestones,
} from '../src/utils/milestones.js';
import { en } from '../src/i18n/en.js';
import { hi } from '../src/i18n/hi.js';

test('historyStack: createHistoryState returns empty past and future', () => {
  const state = createHistoryState();
  assert.deepEqual(state, { past: [], future: [] });
});

test('historyStack: pushHistorySnapshot appends, caps at 25, and clears future', () => {
  let state = { past: [{ step: 0 }], future: [{ step: 99 }] };
  state = pushHistorySnapshot(state, { step: 1 });
  assert.deepEqual(state.past, [{ step: 0 }, { step: 1 }]);
  assert.deepEqual(state.future, []);

  // Verify default 25-item cap
  let capped = createHistoryState();
  for (let i = 1; i <= 30; i += 1) {
    capped = pushHistorySnapshot(capped, { step: i });
  }
  assert.equal(capped.past.length, 25);
  assert.deepEqual(capped.past[0], { step: 6 });
  assert.deepEqual(capped.past[24], { step: 30 });

  // Verify custom maxSteps = 0
  const zeroCap = pushHistorySnapshot(capped, { step: 31 }, 0);
  assert.deepEqual(zeroCap, { past: [], future: [] });
});

test('historyStack: stepUndo returns null when past is empty', () => {
  assert.equal(stepUndo(createHistoryState(), { step: 1 }), null);
  assert.equal(stepUndo(null, { step: 1 }), null);
});

test('historyStack: stepUndo restores previous and pushes current to future without mutating', () => {
  const initial = { past: [{ v: 1 }, { v: 2 }], future: [{ v: 4 }] };
  const snapshotBefore = structuredClone(initial);

  const res = stepUndo(initial, { v: 3 });
  assert.ok(res);
  assert.deepEqual(res.snapshot, { v: 2 });
  assert.deepEqual(res.history, {
    past: [{ v: 1 }],
    future: [{ v: 3 }, { v: 4 }],
  });
  assert.deepEqual(initial, snapshotBefore);
});

test('historyStack: stepRedo returns null when future is empty', () => {
  assert.equal(stepRedo(createHistoryState(), { step: 1 }), null);
  assert.equal(stepRedo({ past: [{ step: 0 }], future: [] }, { step: 1 }), null);
});

test('historyStack: stepRedo restores next and pushes current to past, round-tripping with undo', () => {
  let history = createHistoryState();
  history = pushHistorySnapshot(history, { v: 1 });
  history = pushHistorySnapshot(history, { v: 2 });

  const undo1 = stepUndo(history, { v: 3 });
  assert.deepEqual(undo1.snapshot, { v: 2 });
  const undo2 = stepUndo(undo1.history, undo1.snapshot);
  assert.deepEqual(undo2.snapshot, { v: 1 });
  assert.deepEqual(undo2.history.past, []);
  assert.deepEqual(undo2.history.future, [{ v: 2 }, { v: 3 }]);

  const redo1 = stepRedo(undo2.history, undo2.snapshot);
  assert.deepEqual(redo1.snapshot, { v: 2 });
  const redo2 = stepRedo(redo1.history, redo1.snapshot);
  assert.deepEqual(redo2.snapshot, { v: 3 });
  assert.deepEqual(redo2.history.future, []);
  assert.deepEqual(redo2.history.past, [{ v: 1 }, { v: 2 }]);
});

test('milestones: parseMilestoneDate handles YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM-DD, and invalid strings', () => {
  assert.deepEqual(parseMilestoneDate('1990-05-14'), { year: 1990, month: 5, day: 14 });
  assert.deepEqual(parseMilestoneDate(' 1985/12/1 '), { year: 1985, month: 12, day: 1 });
  assert.deepEqual(parseMilestoneDate('25/12/1992'), { year: 1992, month: 12, day: 25 });
  assert.deepEqual(parseMilestoneDate('07-04'), { year: null, month: 7, day: 4 });
  assert.deepEqual(parseMilestoneDate('--02-29'), { year: null, month: 2, day: 29 });

  for (const bad of [
    '',
    '   ',
    null,
    undefined,
    12345,
    'not-a-date',
    '2024-02-30',
    '2023-02-29',
    '2024-13-01',
    '2024-00-10',
    '32/01/2020',
    '13-32',
  ]) {
    assert.equal(parseMilestoneDate(bad), null, `Expected null for ${String(bad)}`);
  }
});

test('milestones: computeUpcomingMilestones sorts by daysUntil, wraps Dec->Jan, computes years, and excludes late', () => {
  const today = new Date(2026, 11, 20); // Dec 20, 2026
  const people = [
    { id: 'p1', name: 'Zara', dob: '1996-12-20', anniversary: '2020-01-05' },
    { id: 'p2', name: 'Aarav', dob: '01-02' },
    { id: 'p3', name: 'Bina', dob: '25/12/1990' },
    { id: 'p4', name: 'Late Person', dob: '1950-12-21', anniversary: '1975-12-22', late: true },
    { id: 'p5', name: 'Invalid', dob: 'invalid-date' },
  ];

  const results = computeUpcomingMilestones(people, { today, limit: 25 });

  assert.equal(results.length, 4);
  assert.ok(results.every(m => m.person.id !== 'p4'), 'late: true persons must be excluded');

  // Dec 20 (0 days) -> Dec 25 (5 days) -> Jan 2 (13 days) -> Jan 5 (16 days)
  assert.deepEqual(
    results.map(m => ({
      id: m.person.id,
      type: m.type,
      daysUntil: m.daysUntil,
      years: m.years,
      nextYear: m.nextDate.getFullYear(),
      nextMonth: m.nextDate.getMonth() + 1,
      nextDay: m.nextDate.getDate(),
    })),
    [
      { id: 'p1', type: 'birthday', daysUntil: 0, years: 30, nextYear: 2026, nextMonth: 12, nextDay: 20 },
      { id: 'p3', type: 'birthday', daysUntil: 5, years: 36, nextYear: 2026, nextMonth: 12, nextDay: 25 },
      { id: 'p2', type: 'birthday', daysUntil: 13, years: null, nextYear: 2027, nextMonth: 1, nextDay: 2 },
      { id: 'p1', type: 'anniversary', daysUntil: 16, years: 7, nextYear: 2027, nextMonth: 1, nextDay: 5 },
    ]
  );

  // Limit truncation
  assert.equal(computeUpcomingMilestones(people, { today, limit: 2 }).length, 2);
});

test('milestones: computeUpcomingMilestones handles Feb 29 safely in non-leap years', () => {
  const today = new Date(2025, 1, 20); // Feb 20, 2025 (non-leap)
  const results = computeUpcomingMilestones(
    [{ id: 'leap', name: 'Leap', dob: '2000-02-29' }],
    { today }
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].daysUntil, 8);
  assert.equal(results[0].nextDate.getMonth(), 1);
  assert.equal(results[0].nextDate.getDate(), 28);
  assert.equal(results[0].years, 25);
});

test('i18n: en.js and hi.js have 100% key parity and matching value types', () => {
  const enKeys = Object.keys(en);
  const hiKeys = Object.keys(hi);
  const missingInHi = enKeys.filter(k => !Object.hasOwn(hi, k));
  const extraInHi = hiKeys.filter(k => !Object.hasOwn(en, k));

  assert.deepEqual(missingInHi, [], `Missing in hi.js: ${missingInHi.join(', ')}`);
  assert.deepEqual(extraInHi, [], `Extra in hi.js: ${extraInHi.join(', ')}`);

  for (const key of enKeys) {
    assert.equal(typeof hi[key], typeof en[key], `Type mismatch for i18n key ${key}`);
    if (typeof en[key] === 'string') {
      assert.ok(en[key].length > 0, `en.${key} must be non-empty`);
      assert.ok(hi[key].length > 0, `hi.${key} must be non-empty`);
    }
  }
});
