/**
 * LocalStorage persistence & non-destructive merge engine.
 * - Preserves manually added members across code updates, hot reloads, and cloud syncs.
 * - Keeps personal Gupta family storage keys strictly isolated from the public demo tree,
 *   while automatically recovering and merging any members the owner added in localStorage
 *   ("gupta-family-tree-v3", "gupta-family-tree-v2", "gupta-family-tree-v1") when their
 *   private tree ("tree_gupta_private_akg") is loaded.
 */
import { INITIAL_DATA } from "../data/familyData.js";
import { dedup, deepMergeTree, STORAGE_KEY } from "./deduplication.js";

const DELETED_IDS_KEY = "family_tree_deleted_ids_v1";
const PERSONAL_LEGACY_KEYS = [
  "gupta-family-tree-v3",
  "gupta-family-tree-v2",
  "gupta-family-tree-v1"
];

const clone = obj => JSON.parse(JSON.stringify(obj));

export function getDeletedIds(scopeKey = "default") {
  if (typeof window === "undefined" || !window.localStorage) return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || "{}") || {};
    return new Set(Array.isArray(raw[scopeKey]) ? raw[scopeKey] : []);
  } catch {
    return new Set();
  }
}

export function recordDeletedId(id, scopeKey = "default") {
  if (!id || typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || "{}") || {};
    const list = new Set(Array.isArray(raw[scopeKey]) ? raw[scopeKey] : []);
    list.add(id);
    raw[scopeKey] = Array.from(list);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(raw));
  } catch {}
}

export function clearDeletedIds(scopeKey = "default") {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || "{}") || {};
    delete raw[scopeKey];
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(raw));
  } catch {}
}

function filterDeletedFromState(state, deletedSet) {
  if (!deletedSet || !deletedSet.size || !state?.data) return state;
  return {
    ...state,
    data: {
      people: (state.data.people || []).filter(p => !deletedSet.has(p.id)),
      couples: (state.data.couples || [])
        .filter(c => !deletedSet.has(c.h) && !deletedSet.has(c.w))
        .map(c => ({
          ...c,
          kids: (c.kids || []).filter(k => !deletedSet.has(k))
        }))
    }
  };
}

export function loadInitialTreeState() {
  let state = {
    data: clone(INITIAL_DATA),
    photos: {},
    viewer: "",
    lang: "en"
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return dedup(state);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.data?.people)) {
        state = deepMergeTree(state, parsed);
      }
    }
  } catch {}

  const deletedSet = getDeletedIds("public_demo");
  return dedup(filterDeletedFromState(state, deletedSet));
}

/**
 * Merges a signed-in user's cloud tree with any locally saved snapshots or historical
 * localStorage keys ("gupta-family-tree-v3", "v2", "v1") so manually added family members
 * are never lost across code updates or refreshes.
 */
export function mergeCloudTreeWithLocalHistory(treeId, cloudData, cloudPhotos = {}, lang = "en") {
  let state = {
    data: clone(cloudData || { people: [], couples: [] }),
    photos: clone(cloudPhotos || {}),
    viewer: "",
    lang: lang || "en"
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return dedup(state);
  }

  // 1. If this is Arpit's personal Gupta tree, merge any members from historical localStorage keys
  if (treeId === "tree_gupta_private_akg") {
    for (const key of PERSONAL_LEGACY_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.data?.people)) {
          state = deepMergeTree(state, parsed);
        }
      } catch {}
    }
  }

  // 2. Also merge with local multi-tree cache for this specific treeId
  try {
    const multiMap = JSON.parse(localStorage.getItem("gupta_multi_trees_v1") || "{}") || {};
    const localTree = multiMap[treeId];
    if (localTree && Array.isArray(localTree.data?.people)) {
      state = deepMergeTree(state, {
        data: localTree.data,
        photos: localTree.photos || {},
        lang: localTree.lang || state.lang
      });
    }
  } catch {}

  const deletedSet = getDeletedIds(treeId || "public_demo");
  return dedup(filterDeletedFromState(state, deletedSet));
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
