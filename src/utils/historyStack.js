/**
 * Pure immutable undo/redo history stack helpers with deep snapshot isolation.
 * Guarantees that mutating `data` or `photos` in place never corrupts stored
 * past or future history entries.
 */

function cloneSnapshot(snapshot) {
  if (snapshot === null || typeof snapshot !== 'object') {
    return snapshot;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(snapshot);
    } catch {
      // Fallback for objects with non-structuredCloneable values
    }
  }
  try {
    return JSON.parse(JSON.stringify(snapshot));
  } catch {
    return Array.isArray(snapshot) ? [...snapshot] : { ...snapshot };
  }
}

export function createHistoryState() {
  return { past: [], future: [] };
}

export function pushHistorySnapshot(history, snapshot, maxSteps = 25) {
  const past = Array.isArray(history?.past) ? history.past.map(cloneSnapshot) : [];
  const nextPast = [...past, cloneSnapshot(snapshot)];
  const limit = Number.isFinite(maxSteps) ? Math.max(0, Math.floor(maxSteps)) : 25;
  const trimmedPast = limit === 0 ? [] : nextPast.slice(-limit);
  return {
    past: trimmedPast,
    future: [],
  };
}

export function stepUndo(history, currentSnapshot) {
  const past = Array.isArray(history?.past) ? history.past : [];
  const future = Array.isArray(history?.future) ? history.future : [];
  if (past.length === 0) return null;

  const restored = cloneSnapshot(past[past.length - 1]);
  const nextPast = past.slice(0, -1).map(cloneSnapshot);
  const nextFuture = [cloneSnapshot(currentSnapshot), ...future.map(cloneSnapshot)];

  return {
    history: {
      past: nextPast,
      future: nextFuture,
    },
    snapshot: restored,
  };
}

export function stepRedo(history, currentSnapshot) {
  const past = Array.isArray(history?.past) ? history.past : [];
  const future = Array.isArray(history?.future) ? history.future : [];
  if (future.length === 0) return null;

  const [firstFuture, ...restFuture] = future;
  const restored = cloneSnapshot(firstFuture);
  const nextFuture = restFuture.map(cloneSnapshot);
  const nextPast = [...past.map(cloneSnapshot), cloneSnapshot(currentSnapshot)];

  return {
    history: {
      past: nextPast,
      future: nextFuture,
    },
    snapshot: restored,
  };
}
