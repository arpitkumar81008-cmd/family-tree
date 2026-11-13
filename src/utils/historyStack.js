/**
 * Pure immutable undo/redo history stack helpers.
 */

export function createHistoryState() {
  return { past: [], future: [] };
}

export function pushHistorySnapshot(history, snapshot, maxSteps = 25) {
  const past = Array.isArray(history?.past) ? history.past : [];
  const nextPast = [...past, snapshot];
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

  const restored = past[past.length - 1];
  const nextPast = past.slice(0, -1);
  const nextFuture = [currentSnapshot, ...future];

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

  const [restored, ...nextFuture] = future;
  const nextPast = [...past, currentSnapshot];

  return {
    history: {
      past: nextPast,
      future: nextFuture,
    },
    snapshot: restored,
  };
}
