/**
 * Cloud & Local Multi-Tree Synchronization Service.
 * - Anyone (including unauthenticated guests) can view public trees (canonical Gupta tree + shared public trees).
 * - Authenticated users can create their own trees and edit trees where they are owner/collaborator.
 * - Supports Family Sharing via Email Invites (viewerEmails / editorEmails), Family Access Codes (shareCode), and Visibility Toggles.
 * - Prevents infinite write loops by ignoring local pending-write snapshots and debouncing cloud updates (600ms).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseClients, isFirebaseConfigured } from './firebase.js';

const LOCAL_TREES_KEY = 'gupta_multi_trees_v1';
const UNLOCKED_CODES_KEY = 'gupta_unlocked_tree_codes';
const MAX_PHOTOS_BYTES = 750 * 1024; // 750 KB safety cap to stay well below Firestore's 1 MiB limit

let debounceTimer = null;

function readLocalTrees() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TREES_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeLocalTrees(map) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(LOCAL_TREES_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function getUnlockedShareCodes() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return JSON.parse(localStorage.getItem(UNLOCKED_CODES_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function recordUnlockedShareCode(treeId, code) {
  if (typeof window === 'undefined' || !window.localStorage || !treeId || !code) return false;
  try {
    const map = getUnlockedShareCodes();
    map[treeId] = String(code).trim().toUpperCase();
    localStorage.setItem(UNLOCKED_CODES_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function getShareCodeFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const code = new URLSearchParams(window.location.search).get('code') || '';
    return code.trim().toUpperCase();
  } catch {
    return '';
  }
}

export function isPhotosPayloadWithinLimit(photos) {
  if (!photos || typeof photos !== 'object') return true;
  try {
    return JSON.stringify(photos).length <= MAX_PHOTOS_BYTES;
  } catch {
    return false;
  }
}

export function hasMatchingShareCode(treeMeta) {
  if (!treeMeta || !treeMeta.shareCode) return false;
  const expected = String(treeMeta.shareCode).trim().toUpperCase();
  if (!expected) return false;
  const urlCode = getShareCodeFromUrl();
  if (urlCode && urlCode === expected) {
    if (treeMeta.id) recordUnlockedShareCode(treeMeta.id, expected);
    return true;
  }
  if (treeMeta.id) {
    const unlocked = getUnlockedShareCodes();
    if (unlocked[treeMeta.id] && String(unlocked[treeMeta.id]).toUpperCase() === expected) {
      return true;
    }
  }
  return false;
}

export function canUserEditTree(treeMeta, user) {
  if (!treeMeta) return false;
  if (user?.uid) {
    if (treeMeta.ownerUid === user.uid) return true;
    if (Array.isArray(treeMeta.collaboratorUids) && treeMeta.collaboratorUids.includes(user.uid)) {
      return true;
    }
  }
  if (user?.email && Array.isArray(treeMeta.editorEmails)) {
    const emailLower = String(user.email).trim().toLowerCase();
    if (treeMeta.editorEmails.some(e => String(e).trim().toLowerCase() === emailLower)) {
      return true;
    }
  }
  if (treeMeta.shareCodeRole === 'editor' && hasMatchingShareCode(treeMeta)) {
    return true;
  }
  return false;
}

export function canUserViewTree(treeMeta, user) {
  if (!treeMeta) return false;
  if (treeMeta.isPublic) return true;
  if (canUserEditTree(treeMeta, user)) return true;
  if (user?.email && Array.isArray(treeMeta.viewerEmails)) {
    const emailLower = String(user.email).trim().toLowerCase();
    if (treeMeta.viewerEmails.some(e => String(e).trim().toLowerCase() === emailLower)) {
      return true;
    }
  }
  if (hasMatchingShareCode(treeMeta)) return true;
  return false;
}

export const LAST_PRIVATE_TREE_KEY = 'gupta_last_private_tree_id';

/**
 * Retrieves the last active private tree ID from localStorage.
 * Returns null if running in SSR or if no private tree has been viewed.
 */
export function getLastPrivateTreeId() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const val = localStorage.getItem(LAST_PRIVATE_TREE_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Persists the active private tree ID in localStorage.
 * Skips empty strings (demo tree) to avoid erasing the last private tree ID.
 */
export function setLastPrivateTreeId(id) {
  if (typeof window === 'undefined' || !window.localStorage || !id) return false;
  try {
    const cleanId = String(id).trim();
    if (cleanId) {
      localStorage.setItem(LAST_PRIVATE_TREE_KEY, cleanId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Explicitly clears the last private tree ID (e.g., when a user deletes their tree).
 */
export function clearLastPrivateTreeId() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.removeItem(LAST_PRIVATE_TREE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses view state ('home' | 'tree') and active treeId from the current URL.
 * Falls back safely to 'home' and empty treeId for invalid/unrecognized views or malformed URLs.
 *
 * @returns {{ view: 'home' | 'tree', treeId: string }}
 */
export function parseViewStateFromUrl() {
  if (typeof window === 'undefined') {
    return { view: 'home', treeId: '' };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const rawView = params.get('view');
    const treeId = params.get('tree') || '';
    const urlCode = params.get('code') || '';
    if (treeId && urlCode) {
      recordUnlockedShareCode(treeId, urlCode);
    }

    if (rawView === 'home') {
      return { view: 'home', treeId: '' };
    }
    if (rawView === 'tree') {
      return { view: 'tree', treeId };
    }
    if (rawView === 'demo') {
      return { view: 'tree', treeId: '' };
    }
    if (!rawView && treeId) {
      return { view: 'tree', treeId };
    }
    return { view: 'home', treeId: '' };
  } catch {
    return { view: 'home', treeId: '' };
  }
}

/**
 * Synchronizes browser URL query parameters with active view and tree state.
 * Uses window.history.pushState (or replaceState) without duplicating history entries.
 *
 * @param {'home' | 'tree'} view
 * @param {string} treeId
 * @param {{ replace?: boolean }} [options]
 */
export function syncUrlWithViewState(view, treeId, options = {}) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (view === 'home') {
      url.searchParams.set('view', 'home');
      url.searchParams.delete('tree');
    } else {
      url.searchParams.set('view', 'tree');
      if (treeId) {
        url.searchParams.set('tree', treeId);
      } else {
        url.searchParams.delete('tree');
      }
    }
    const nextUrl = url.pathname + url.search + url.hash;
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (nextUrl !== currentUrl) {
      if (options.replace) {
        window.history.replaceState({}, '', nextUrl);
      } else {
        window.history.pushState({}, '', nextUrl);
      }
    }
  } catch {}
}

export function getTreeIdFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    return new URLSearchParams(window.location.search).get('tree') || '';
  } catch {
    return '';
  }
}

export function setTreeIdInUrl(treeId) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (treeId) {
      url.searchParams.set('tree', treeId);
    } else {
      url.searchParams.delete('tree');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {}
}

/**
 * Subscribes to a specific tree by ID (from Firestore if configured, otherwise local registry).
 * Ignores snapshots triggered by local pending writes to prevent infinite update loops.
 */
export function subscribeToTree(treeId, onUpdate, onError) {
  if (!treeId) return () => {};

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    const ref = doc(db, 'trees', treeId);
    return onSnapshot(
      ref,
      snap => {
        if (snap.metadata.hasPendingWrites) {
          return;
        }
        if (snap.exists()) {
          onUpdate({ id: snap.id, ...snap.data() });
        } else {
          onError?.(new Error('Tree not found'));
        }
      },
      err => {
        onError?.(err);
      }
    );
  }

  const localMap = readLocalTrees();
  if (localMap[treeId]) {
    onUpdate({ id: treeId, ...localMap[treeId] });
  } else {
    onError?.(new Error('Tree not found'));
  }
  return () => {};
}

/**
 * Lists public trees, the current user's own trees, trees shared with the user's email,
 * and trees unlocked via a Family Access Code.
 */
export async function listAvailableTrees(user) {
  const results = new Map();

  const localMap = readLocalTrees();
  for (const [id, tree] of Object.entries(localMap)) {
    const withId = { id, ...tree };
    if (canUserViewTree(withId, user)) {
      results.set(id, withId);
    }
  }

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      const pubQuery = query(
        collection(db, 'trees'),
        where('isPublic', '==', true),
        limit(25)
      );
      const pubSnap = await getDocs(pubQuery);
      pubSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));

      if (user?.uid) {
        const ownQuery = query(
          collection(db, 'trees'),
          where('ownerUid', '==', user.uid),
          limit(25)
        );
        const ownSnap = await getDocs(ownQuery);
        ownSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
      }

      if (user?.email) {
        const emailLower = String(user.email).trim().toLowerCase();
        try {
          const edQuery = query(
            collection(db, 'trees'),
            where('editorEmails', 'array-contains', emailLower),
            limit(25)
          );
          const edSnap = await getDocs(edQuery);
          edSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
        } catch {}

        try {
          const vwQuery = query(
            collection(db, 'trees'),
            where('viewerEmails', 'array-contains', emailLower),
            limit(25)
          );
          const vwSnap = await getDocs(vwQuery);
          vwSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
        } catch {}
      }

      // Also fetch any trees previously unlocked by Family Access Code
      const unlocked = getUnlockedShareCodes();
      for (const unlockedTreeId of Object.keys(unlocked)) {
        if (!results.has(unlockedTreeId)) {
          try {
            const snap = await getDoc(doc(db, 'trees', unlockedTreeId));
            if (snap.exists()) {
              results.set(snap.id, { id: snap.id, ...snap.data() });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Could not list cloud trees:', err);
    }
  }

  return Array.from(results.values());
}

/**
 * Looks up a family tree by its Family Access Code (shareCode) across local and cloud storage.
 */
export async function findTreeByShareCode(rawCode) {
  const cleanCode = String(rawCode || '').trim().toUpperCase();
  if (!cleanCode) return null;

  const localMap = readLocalTrees();
  for (const [id, tree] of Object.entries(localMap)) {
    if (tree.shareCode && String(tree.shareCode).trim().toUpperCase() === cleanCode) {
      recordUnlockedShareCode(id, cleanCode);
      return { id, ...tree };
    }
  }

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(
        collection(db, 'trees'),
        where('shareCode', '==', cleanCode),
        limit(5)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        recordUnlockedShareCode(d.id, cleanCode);
        return { id: d.id, ...d.data() };
      }
    } catch (err) {
      console.warn('Failed to query tree by shareCode:', err);
    }
  }

  return null;
}

/**
 * Updates the sharing settings (isPublic, viewerEmails, editorEmails, shareCode, shareCodeRole)
 * for a tree owned by the current user.
 */
export async function updateTreeSharingSettings(treeId, patch, user) {
  if (!treeId || !user?.uid) return null;

  const nowIso = new Date().toISOString();
  const cleanPatch = {};

  if (typeof patch.isPublic === 'boolean') {
    cleanPatch.isPublic = patch.isPublic;
  }
  if (Array.isArray(patch.viewerEmails)) {
    cleanPatch.viewerEmails = Array.from(
      new Set(patch.viewerEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean))
    ).slice(0, 50);
  }
  if (Array.isArray(patch.editorEmails)) {
    cleanPatch.editorEmails = Array.from(
      new Set(patch.editorEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean))
    ).slice(0, 50);
  }
  if (typeof patch.shareCode === 'string') {
    cleanPatch.shareCode = patch.shareCode.trim().toUpperCase().slice(0, 32);
  }
  if (patch.shareCodeRole === 'viewer' || patch.shareCodeRole === 'editor') {
    cleanPatch.shareCodeRole = patch.shareCodeRole;
  }

  const localMap = readLocalTrees();
  if (localMap[treeId]) {
    localMap[treeId] = {
      ...localMap[treeId],
      ...cleanPatch,
      updatedAt: nowIso
    };
    writeLocalTrees(localMap);
  }

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    await updateDoc(doc(db, 'trees', treeId), {
      ...cleanPatch,
      updatedAt: serverTimestamp()
    });
  }

  return cleanPatch;
}

/**
 * Creates a new family tree owned by the authenticated user.
 * Writes to Firestore first (when configured) so failed cloud writes never leave orphaned local ghost trees.
 */
export async function createUserTree({ title, data, photos = {}, isPublic = false, lang = 'en' }, user) {
  if (!user || !user.uid) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!isPhotosPayloadWithinLimit(photos)) {
    throw new Error('PHOTOS_TOO_LARGE');
  }

  const treeId =
    'tree_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  const cleanTitle = (title || 'Family Tree').trim().slice(0, 120);
  const nowIso = new Date().toISOString();

  const safePhotos = photos && typeof photos === 'object' ? photos : {};
  const totalPhotos = Object.keys(safePhotos).length;
  if (totalPhotos > 100) {
    throw new Error('TOO_MANY_PHOTOS');
  }

  const payload = {
    title: cleanTitle,
    ownerUid: user.uid,
    ownerName: (user.displayName || 'Family Member').slice(0, 120),
    isPublic: Boolean(isPublic),
    collaboratorUids: [],
    viewerEmails: [],
    editorEmails: [],
    shareCode: '',
    shareCodeRole: 'viewer',
    data: {
      people: Array.isArray(data?.people) ? data.people : [],
      couples: Array.isArray(data?.couples) ? data.couples : []
    },
    photos: safePhotos,
    lang: lang === 'hi' ? 'hi' : 'en',
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    await setDoc(doc(db, 'trees', treeId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // Only persist to local cache after cloud creation succeeds (or in local-only mode)
  const localMap = readLocalTrees();
  localMap[treeId] = payload;
  writeLocalTrees(localMap);

  return { id: treeId, ...payload };
}

/**
 * Updates an existing tree when the current user is the owner or collaborator.
 */
export async function saveUserTree(treeId, treeDoc, user) {
  if (!treeId) return false;
  if (!canUserEditTree({ id: treeId, ...treeDoc }, user)) {
    return false;
  }
  if (!isPhotosPayloadWithinLimit(treeDoc.photos)) {
    console.warn('Photos payload exceeds 750 KB cloud limit');
    return false;
  }

  const nowIso = new Date().toISOString();
  const localMap = readLocalTrees();
  const existing = localMap[treeId] || {};
  const updated = {
    ...existing,
    title: (treeDoc.title || existing.title || 'Family Tree').slice(0, 120),
    ownerUid: treeDoc.ownerUid || existing.ownerUid || user?.uid || '',
    ownerName: (treeDoc.ownerName || existing.ownerName || user?.displayName || 'Family Member').slice(0, 120),
    isPublic: Boolean(treeDoc.isPublic ?? existing.isPublic ?? false),
    collaboratorUids: Array.isArray(treeDoc.collaboratorUids) ? treeDoc.collaboratorUids : (existing.collaboratorUids || []),
    viewerEmails: Array.isArray(treeDoc.viewerEmails) ? treeDoc.viewerEmails : (existing.viewerEmails || []),
    editorEmails: Array.isArray(treeDoc.editorEmails) ? treeDoc.editorEmails : (existing.editorEmails || []),
    shareCode: typeof treeDoc.shareCode === 'string' ? treeDoc.shareCode : (existing.shareCode || ''),
    shareCodeRole: treeDoc.shareCodeRole || existing.shareCodeRole || 'viewer',
    data: {
      people: Array.isArray(treeDoc.data?.people) ? treeDoc.data.people : [],
      couples: Array.isArray(treeDoc.data?.couples) ? treeDoc.data.couples : []
    },
    photos: treeDoc.photos && typeof treeDoc.photos === 'object' ? treeDoc.photos : {},
    lang: treeDoc.lang === 'hi' ? 'hi' : 'en',
    createdAt: treeDoc.createdAt || existing.createdAt || nowIso,
    updatedAt: nowIso
  };

  localMap[treeId] = updated;
  writeLocalTrees(localMap);

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      await updateDoc(doc(db, 'trees', treeId), {
        data: updated.data,
        photos: updated.photos,
        lang: updated.lang,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Cloud tree update deferred:', err);
      return false;
    }
  }
  return true;
}

/**
 * Immediately caches the updated tree to localStorage (0ms latency so HMR/reloads never lose edits)
 * and debounces (600ms) the network write to Cloud Firestore.
 */
export function saveUserTreeDebounced(treeId, treeDoc, user) {
  if (!treeId) return;
  if (!canUserEditTree({ id: treeId, ...treeDoc }, user)) return;

  // Immediate synchronous local cache write so code updates or refreshes never drop newly added members
  try {
    const nowIso = new Date().toISOString();
    const localMap = readLocalTrees();
    localMap[treeId] = {
      ...(localMap[treeId] || {}),
      title: (treeDoc.title || 'Family Tree').slice(0, 120),
      ownerUid: treeDoc.ownerUid || user?.uid || '',
      ownerName: (treeDoc.ownerName || user?.displayName || 'Family Member').slice(0, 120),
      isPublic: Boolean(treeDoc.isPublic ?? false),
      collaboratorUids: Array.isArray(treeDoc.collaboratorUids) ? treeDoc.collaboratorUids : [],
      viewerEmails: Array.isArray(treeDoc.viewerEmails) ? treeDoc.viewerEmails : [],
      editorEmails: Array.isArray(treeDoc.editorEmails) ? treeDoc.editorEmails : [],
      shareCode: typeof treeDoc.shareCode === 'string' ? treeDoc.shareCode : '',
      shareCodeRole: treeDoc.shareCodeRole || 'viewer',
      data: {
        people: Array.isArray(treeDoc.data?.people) ? treeDoc.data.people : [],
        couples: Array.isArray(treeDoc.data?.couples) ? treeDoc.data.couples : []
      },
      photos: treeDoc.photos && typeof treeDoc.photos === 'object' ? treeDoc.photos : {},
      lang: treeDoc.lang === 'hi' ? 'hi' : 'en',
      updatedAt: nowIso
    };
    writeLocalTrees(localMap);
  } catch {}

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveUserTree(treeId, treeDoc, user);
  }, 600);
}
