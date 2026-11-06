/**
 * LocalStorage and persistence management for the canonical Gupta Family Tree.
 * Uses an explicit allow-list of legacy keys so auth/config/multi-tree keys are never merged.
 */
import { INITIAL_DATA } from "../data/familyData.js";
import { dedup, deepMergeTree, STORAGE_KEY } from "./deduplication.js";

const clone = obj => JSON.parse(JSON.stringify(obj));

const LEGACY_KEYS = [
  STORAGE_KEY,
  "gupta-family-tree-v2",
  "gupta-family-tree-v1",
  "gupta-family-tree-state"
];

export function loadInitialTreeState() {
  const baseState = {
    data: clone(INITIAL_DATA),
    photos: {},
    viewer: "",
    lang: "en"
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return dedup(baseState);
  }

  try {
    const list = [];

    for (const k of LEGACY_KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && Array.isArray(parsed.data?.people)) {
            list.push(parsed);
          }
        }
      } catch {}
    }

    if (list.length > 0) {
      const merged = deepMergeTree(baseState.data, list);
      return dedup({ ...baseState, ...merged });
    }
  } catch {}

  return dedup(baseState);
}

export function saveTreeState(treeState) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(treeState));
    return true;
  } catch (err) {
    console.error("Failed to save tree state:", err);
    return false;
  }
}
