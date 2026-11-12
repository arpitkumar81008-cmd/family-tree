/**
 * LocalStorage persistence & state helpers.
 * - Preserves demo tree additions in localStorage separately from cloud-synced private trees.
 * - Keeps cloud tree state authoritative when loading from Firestore.
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

export function getStoredLanguage(defaultLang = "en") {
  if (typeof window === "undefined" || !window.localStorage) return defaultLang;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored || defaultLang;
  } catch {
    return defaultLang;
  }
}

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

export function clampCanvasZoom(z, delta = 0) {
  const num = typeof z === "number" ? z : parseFloat(z);
  if (isNaN(num)) return 1.0;
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, +(num + delta).toFixed(2)));
}

export function loadSavedCanvasZoom(fallback = 1.0) {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(CANVAS_ZOOM_KEY);
    if (!raw) return fallback;
    const val = parseFloat(raw);
    if (isNaN(val)) return fallback;
    return clampCanvasZoom(val);
  } catch {
    return fallback;
  }
}

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

export function loadSavedCanvasPan() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(CANVAS_PAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.scrollLeft === "number" &&
      typeof parsed.scrollTop === "number"
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

export function saveCanvasPan(pan) {
  if (typeof window === "undefined" || !window.localStorage || !pan) return false;
  try {
    const data = {
      scrollLeft: Math.max(0, Math.round(pan.scrollLeft || 0)),
      scrollTop: Math.max(0, Math.round(pan.scrollTop || 0))
    };
    localStorage.setItem(CANVAS_PAN_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

const DELETED_IDS_KEY = "family_tree_deleted_ids_v1";

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
  const globalLang = getStoredLanguage("en");
  let state = {
    data: clone(INITIAL_DATA),
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
 * Normalizes and deduplicates a signed-in user's cloud tree without letting
 * stale localStorage caches overwrite authoritative cloud edits.
 */
export function mergeCloudTreeWithLocalHistory(treeId, cloudData, cloudPhotos = {}, lang = "en") {
  const globalLang = getStoredLanguage(lang || "en");
  const state = {
    data: clone(cloudData || { people: [], couples: [] }),
    photos: clone(cloudPhotos || {}),
    viewer: "",
    lang: globalLang
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return dedup(state);
  }

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
