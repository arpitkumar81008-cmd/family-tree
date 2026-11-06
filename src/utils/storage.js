/**
 * LocalStorage and persistence management for the Family Tree.
 */
import { INITIAL_DATA } from "../data/familyData.js";
import { dedup, deepMergeTree, STORAGE_KEY } from "./deduplication.js";

const clone = obj => JSON.parse(JSON.stringify(obj));

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
    const keysToCheck = [
      STORAGE_KEY,
      "gupta-family-tree-v2",
      "gupta-family-tree-v1",
      "gupta-family-tree-state"
    ];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes("gupta") && !keysToCheck.includes(k)) {
          keysToCheck.push(k);
        }
      }
    } catch {}

    for (const k of keysToCheck) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") list.push(parsed);
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
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(treeState));
  } catch (err) {
    console.error("Failed to save tree state:", err);
  }
}
