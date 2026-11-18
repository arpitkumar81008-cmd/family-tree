/**
 * LocalStorage persistence & state helpers.
 * - Preserves demo tree additions in localStorage separately from cloud-synced private trees.
 * - Keeps cloud tree state authoritative when loading from Firestore while merging unsynced local additions.
 */
import { INITIAL_DATA } from "../data/familyData.js";
import { dedup, deepMergeTree, STORAGE_KEY } from "./deduplication.js";
import {
  getLastPrivateTreeId,
  setLastPrivateTreeId,
  clearLastPrivateTreeId
} from "../services/treeSync.js";

export { getLastPrivateTreeId, setLastPrivateTreeId, clearLastPrivateTreeId };

export const LANG_STORAGE_KEY = "family_tree_lang";

/**
 * Reads the user's preferred UI language ('en' | 'hi') from localStorage.
 *
 * @param {string} [defaultLang="en"]
 * @returns {string}
 */
export function getStoredLanguage(defaultLang = "en") {
  if (typeof window === "undefined" || !window.localStorage) return defaultLang;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored || defaultLang;
  } catch {
    return defaultLang;
  }
}

/**
 * Persists the user's UI language preference to localStorage.
 *
 * @param {string} lang
 */
export function setStoredLanguage(lang) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang || "en");
  } catch {}
}

export const CANVAS_ZOOM_KEY = "family_tree_canvas_zoom";
export const CANVAS_PAN_KEY = "family_tree_canvas_pan";

export const MIN_CANVAS_ZOOM = 0.4;
export const MAX_CANVAS_ZOOM = 1.4;

/**
 * Clamps a zoom factor (with optional delta) into [MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM].
 *
 * @param {number|string} z
 * @param {number} [delta=0]
 * @returns {number}
 */
export function clampCanvasZoom(z, delta = 0) {
  const num = typeof z === "number" ? z : parseFloat(z);
  const safeDelta = typeof delta === "number" && Number.isFinite(delta) ? delta : parseFloat(delta) || 0;
  if (!Number.isFinite(num)) return 1.0;
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, +(num + safeDelta).toFixed(2)));
}

/**
 * Loads the persisted canvas zoom factor from localStorage.
 *
 * @param {number} [fallback=1.0]
 * @returns {number}
 */
export function loadSavedCanvasZoom(fallback = 1.0) {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(CANVAS_ZOOM_KEY);
    if (!raw) return fallback;
    const val = parseFloat(raw);
    if (!Number.isFinite(val)) return fallback;
    return clampCanvasZoom(val);
  } catch {
    return fallback;
  }
}

/**
 * Persists the clamped canvas zoom factor to localStorage.
 *
 * @param {number} zoom
 * @returns {boolean}
 */
export function saveCanvasZoom(zoom) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const clamped = clampCanvasZoom(zoom);
    localStorage.setItem(CANVAS_ZOOM_KEY, String(clamped));
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads the saved canvas scroll/pan offset from localStorage.
 *
 * @returns {{ scrollLeft: number, scrollTop: number } | null}
 */
export function loadSavedCanvasPan() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(CANVAS_PAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Number.isFinite(parsed.scrollLeft) &&
      Number.isFinite(parsed.scrollTop)
    ) {
      return {
        scrollLeft: Math.max(0, Math.round(parsed.scrollLeft)),
        scrollTop: Math.max(0, Math.round(parsed.scrollTop))
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists the current canvas scroll/pan offset to localStorage.
 *
 * @param {{ scrollLeft?: number, scrollTop?: number }} pan
 * @returns {boolean}
 */
export function saveCanvasPan(pan) {
  if (typeof window === "undefined" || !window.localStorage || !pan || typeof pan !== "object") {
    return false;
  }
  try {
    const sl = Number(pan.scrollLeft);
    const st = Number(pan.scrollTop);
    const data = {
      scrollLeft: Number.isFinite(sl) ? Math.max(0, Math.round(sl)) : 0,
      scrollTop: Number.isFinite(st) ? Math.max(0, Math.round(st)) : 0
    };
    localStorage.setItem(CANVAS_PAN_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

const DELETED_IDS_KEY = "family_tree_deleted_ids_v1";

function clone(obj, fallback = null) {
  if (obj === undefined || obj === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return fallback;
  }
}

function readDeletedIdsMap() {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Returns the set of tombstoned (deleted) person IDs for the given tree scope.
 *
 * @param {string} [scopeKey="default"]
 * @returns {Set<string>}
 */
export function getDeletedIds(scopeKey = "default") {
  const raw = readDeletedIdsMap();
  return new Set(Array.isArray(raw[scopeKey]) ? raw[scopeKey] : []);
}

/**
 * Records a deleted person ID under the given tree scope so stale caches do not resurrect it.
 *
 * @param {string} id
 * @param {string} [scopeKey="default"]
 */
export function recordDeletedId(id, scopeKey = "default") {
  if (!id || typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = readDeletedIdsMap();
    const list = new Set(Array.isArray(raw[scopeKey]) ? raw[scopeKey] : []);
    list.add(id);
    raw[scopeKey] = Array.from(list);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(raw));
  } catch {}
}

/**
 * Clears all deleted person tombstones for the given tree scope.
 *
 * @param {string} [scopeKey="default"]
 */
export function clearDeletedIds(scopeKey = "default") {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = readDeletedIdsMap();
    delete raw[scopeKey];
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(raw));
  } catch {}
}

function filterDeletedFromState(state, deletedSet) {
  if (!deletedSet || !deletedSet.size || !state?.data) return state;
  return {
    ...state,
    viewer: state.viewer && deletedSet.has(state.viewer) ? "" : state.viewer || "",
    data: {
      people: (state.data.people || []).filter(p => p && !deletedSet.has(p.id)),
      couples: (state.data.couples || [])
        .filter(c => c && !deletedSet.has(c.h) && !deletedSet.has(c.w))
        .map(c => ({
          ...c,
          kids: (Array.isArray(c.kids) ? c.kids : []).filter(k => !deletedSet.has(k))
        }))
    }
  };
}

/**
 * Loads the initial public demo tree state, merging any local sandbox edits from localStorage.
 *
 * @returns {object}
 */
export function loadInitialTreeState() {
  const globalLang = getStoredLanguage("en");
  let state = {
    data: clone(INITIAL_DATA, { people: [], couples: [] }),
    photos: {},
    viewer: "",
    lang: globalLang
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

  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored) state.lang = stored;
  } catch {}

  const deletedSet = getDeletedIds("public_demo");
  return dedup(filterDeletedFromState(state, deletedSet));
}

/**
 * Normalizes and deduplicates a signed-in user's cloud tree while preserving any
 * unsynced local additions from `gupta_multi_trees_v1`.
 *
 * @param {string} treeId
 * @param {object} cloudData
 * @param {object} [cloudPhotos={}]
 * @param {string} [lang="en"]
 * @returns {object}
 */
export function mergeCloudTreeWithLocalHistory(treeId, cloudData, cloudPhotos = {}, lang = "en") {
  const globalLang = getStoredLanguage(lang || "en");
  let state = {
    data: clone(cloudData, { people: [], couples: [] }) || { people: [], couples: [] },
    photos: clone(cloudPhotos, {}) || {},
    viewer: "",
    lang: globalLang
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return dedup(state);
  }

  if (treeId) {
    try {
      const multi = JSON.parse(localStorage.getItem("gupta_multi_trees_v1") || "{}") || {};
      const localTree = multi && typeof multi === "object" ? multi[treeId] : null;
      if (localTree && typeof localTree === "object" && Array.isArray(localTree.data?.people)) {
        state = deepMergeTree(state, {
          data: localTree.data,
          photos: localTree.photos || {},
          lang: localTree.lang || globalLang
        });
        state.viewer = "";
      }
    } catch {}
  }

  const deletedSet = getDeletedIds(treeId || "public_demo");
  return dedup(filterDeletedFromState(state, deletedSet));
}

/**
 * Saves the public demo tree state to localStorage (`demo-family-tree-v1`).
 * Falls back to saving lineage data without photos if localStorage quota is exceeded.
 *
 * @param {object} treeState
 * @returns {boolean}
 */
export function saveTreeState(treeState) {
  if (typeof window === "undefined" || !window.localStorage || !treeState) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(treeState));
    return true;
  } catch (err) {
    try {
      if (treeState.photos && Object.keys(treeState.photos).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...treeState, photos: {} }));
      }
    } catch {}
    console.error("Failed to save tree state:", err);
    return false;
  }
}
