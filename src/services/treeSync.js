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
  runTransaction,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseClients, isFirebaseConfigured } from './firebase.js';
import { deepMergeTree } from '../utils/deduplication.js';

const LOCAL_TREES_KEY = 'gupta_multi_trees_v1';
const DELETED_IDS_KEY = 'family_tree_deleted_ids_v1';
const UNLOCKED_CODES_KEY = 'gupta_unlocked_tree_codes';
const MAX_PHOTOS_BYTES = 750 * 1024; // 750 KB safety cap to stay well below Firestore's 1 MiB limit

const pendingSaves = new Map();

function readDeletedIdsForTree(treeId) {
  if (!treeId || typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '{}');
    const raw = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    return new Set(Array.isArray(raw[treeId]) ? raw[treeId] : []);
  } catch {
    return new Set();
  }
}

function readLocalTrees() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_TREES_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalTrees(map) {
  if (typeof window === 'undefined' || !window.localStorage || !map || typeof map !== 'object') {
    return false;
  }
  try {
    localStorage.setItem(LOCAL_TREES_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the map of `{ [treeId]: shareCode }` unlocked in localStorage.
 *
 * @returns {Record<string, string>}
 */
export function getUnlockedShareCodes() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(UNLOCKED_CODES_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Records an unlocked Family Access Code for a specific treeId in localStorage.
 *
 * @param {string} treeId
 * @param {string} code
 * @returns {boolean}
 */
export function recordUnlockedShareCode(treeId, code) {
  if (typeof window === 'undefined' || !window.localStorage || !treeId || !code) return false;
  try {
    const cleanTreeId = String(treeId).trim();
    const cleanCode = String(code).trim().toUpperCase();
    if (!cleanTreeId || !cleanCode) return false;
    const map = getUnlockedShareCodes();
    map[cleanTreeId] = cleanCode;
    localStorage.setItem(UNLOCKED_CODES_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the `?code=` query parameter from the current browser URL.
 *
 * @returns {string}
 */
export function getShareCodeFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const code = new URLSearchParams(window.location.search).get('code') || '';
    return code.trim().toUpperCase();
  } catch {
    return '';
  }
}

/**
 * Reads the `?approve=` requester UID parameter from the current browser URL.
 *
 * @returns {string}
 */
export function getApproveRequesterFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const uid = new URLSearchParams(window.location.search).get('approve') || '';
    return uid.trim();
  } catch {
    return '';
  }
}

/**
 * Parses a user-entered share link, `treeId:code`, `treeId`, or bare `code`.
 *
 * @param {string} rawInput
 * @param {string} [fallbackTreeId='']
 * @returns {{ treeId: string, code: string }}
 */
export function parseTreeJoinInput(rawInput, fallbackTreeId = '') {
  const raw = String(rawInput || '').trim();
  const cleanFallback = String(fallbackTreeId || '').trim();
  if (!raw) return { treeId: cleanFallback, code: '' };

  if (/^https?:\/\//i.test(raw) || /[?&](?:tree|code)=/i.test(raw)) {
    try {
      const baseOrigin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://vanshvriksha.web.app';
      const parsed = new URL(raw, baseOrigin);
      const treeId = (parsed.searchParams.get('tree') || '').trim();
      const code = (parsed.searchParams.get('code') || '').trim().toUpperCase();
      if (treeId || code) {
        return { treeId: treeId || cleanFallback, code };
      }
    } catch {}
  }

  if (raw.includes(':')) {
    const [left, right] = raw.split(':');
    return {
      treeId: left.trim() || cleanFallback,
      code: (right || '').trim().toUpperCase()
    };
  }

  // If a fallbackTreeId is already active (e.g. from URL ?tree=...), treat bare input as code unless it matches fallbackTreeId
  if (cleanFallback) {
    if (raw === cleanFallback) {
      return { treeId: cleanFallback, code: '' };
    }
    return { treeId: cleanFallback, code: raw.toUpperCase() };
  }

  // Firestore auto-IDs are typically 20 alphanumeric chars; treat as treeId if it has lowercase or length >= 18
  if (/[a-z]/.test(raw) || raw.length >= 18) {
    return { treeId: raw, code: '' };
  }

  return { treeId: '', code: raw.toUpperCase() };
}

/**
 * Checks whether the serialized photos map is within the 750 KB cloud safety threshold.
 *
 * @param {object} photos
 * @returns {boolean}
 */
export function isPhotosPayloadWithinLimit(photos) {
  if (!photos || typeof photos !== 'object') return true;
  try {
    return JSON.stringify(photos).length <= MAX_PHOTOS_BYTES;
  } catch {
    return false;
  }
}

/**
 * Checks whether the current URL or localStorage holds a matching shareCode for `treeMeta`.
 *
 * @param {object} treeMeta
 * @returns {boolean}
 */
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

const SHARE_TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a cryptographically random uppercase share token using crypto.getRandomValues.
 *
 * @param {number} [length=12]
 * @returns {string}
 */
export function generatePrivateShareToken(length = 12) {
  const len = Math.max(10, Math.min(32, Number(length) || 12));
  const bytes = new Uint8Array(len);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let token = '';
  for (let i = 0; i < len; i += 1) {
    token += SHARE_TOKEN_ALPHABET[bytes[i] % SHARE_TOKEN_ALPHABET.length];
  }
  return token;
}

/**
 * Builds a shareable URL (?view=tree&tree=<id>&code=<token>) for a private or public tree.
 *
 * @param {string} treeId
 * @param {string} [shareCode='']
 * @returns {string}
 */
export function buildPrivateShareUrl(treeId, shareCode = '') {
  const cleanId = String(treeId || '').trim();
  const cleanCode = String(shareCode || '').trim().toUpperCase();
  const params = new URLSearchParams();
  params.set('view', 'tree');
  if (cleanId) params.set('tree', cleanId);
  if (cleanCode) params.set('code', cleanCode);
  const queryStr = `?${params.toString()}`;
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${window.location.pathname}${queryStr}`;
  }
  return queryStr;
}

/**
 * Checks whether `user` is authorized to edit the tree described by `treeMeta`.
 *
 * @param {object} treeMeta
 * @param {object | null} user
 * @returns {boolean}
 */
export function canUserEditTree(treeMeta, user) {
  if (!treeMeta) return false;
  if (user?.uid) {
    if (treeMeta.ownerUid === user.uid || treeMeta.ownerId === user.uid) return true;
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

/**
 * Checks whether `user` is authorized to view the tree described by `treeMeta`.
 *
 * @param {object} treeMeta
 * @param {object | null} user
 * @returns {boolean}
 */
export function canUserViewTree(treeMeta, user) {
  if (!treeMeta) return false;
  if (treeMeta.isPublic) return true;
  if (canUserEditTree(treeMeta, user)) return true;
  if (user?.uid && Array.isArray(treeMeta.viewerUids) && treeMeta.viewerUids.includes(user.uid)) {
    return true;
  }
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
 *
 * @returns {string | null}
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
 *
 * @param {string} id
 * @returns {boolean}
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
 *
 * @returns {boolean}
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
 * Parses view state ('home' | 'tree' | 'admin') and active treeId from the current URL.
 * Falls back safely to 'home' and empty treeId for invalid/unrecognized views or malformed URLs.
 *
 * @returns {{ view: 'home' | 'tree' | 'admin', treeId: string }}
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
    if (rawView === 'admin' && !treeId) {
      return { view: 'admin', treeId: '' };
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
 * @param {'home' | 'tree' | 'admin'} view
 * @param {string} treeId
 * @param {{ replace?: boolean }} [options={}]
 */
export function syncUrlWithViewState(view, treeId, options = {}) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (view === 'home') {
      url.searchParams.set('view', 'home');
      url.searchParams.delete('tree');
    } else if (view === 'admin') {
      url.searchParams.set('view', 'admin');
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

/**
 * Reads the active `tree` query parameter from the current URL.
 *
 * @returns {string}
 */
export function getTreeIdFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    return new URLSearchParams(window.location.search).get('tree') || '';
  } catch {
    return '';
  }
}

/**
 * Updates or removes the `tree` query parameter in the current browser URL.
 *
 * @param {string} treeId
 */
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
 * Enforces access control via canUserViewTree without leaking nodes on unauthorized access.
 *
 * @param {string} treeId
 * @param {(treeDoc: object) => void} onUpdate
 * @param {(err: Error) => void} [onError]
 * @param {{ user?: object | null }} [options={}]
 * @returns {() => void}
 */
export function subscribeToTree(treeId, onUpdate, onError, options = {}) {
  const cleanId = typeof treeId === 'string' ? treeId.trim() : '';
  if (!cleanId) return () => {};

  const { db, auth } = getFirebaseClients();
  const resolvedUser = options?.user !== undefined ? options.user : (auth?.currentUser ?? null);
  let active = true;

  const emitAccessDenied = () => {
    if (!active) return;
    const accessErr = new Error('Access denied');
    accessErr.code = 'ACCESS_DENIED';
    onError?.(accessErr);
  };

  if (db && isFirebaseConfigured()) {
    const ref = doc(db, 'trees', cleanId);
    let hasDeliveredInitial = false;
    const unsub = onSnapshot(
      ref,
      snap => {
        if (!active) return;
        if (hasDeliveredInitial && snap.metadata?.hasPendingWrites) {
          return;
        }
        hasDeliveredInitial = true;
        if (snap.exists()) {
          const docData = { id: snap.id, ...snap.data() };
          if (!canUserViewTree(docData, resolvedUser)) {
            emitAccessDenied();
            return;
          }
          onUpdate?.(docData);
        } else {
          onError?.(new Error('Tree not found'));
        }
      },
      err => {
        if (!active) return;
        if (err?.code === 'permission-denied') {
          emitAccessDenied();
        } else {
          onError?.(err);
        }
      }
    );
    return () => {
      active = false;
      unsub?.();
    };
  }

  const localMap = readLocalTrees();
  if (localMap[cleanId]) {
    const docData = { id: cleanId, ...localMap[cleanId] };
    if (!canUserViewTree(docData, resolvedUser)) {
      emitAccessDenied();
      return () => {
        active = false;
      };
    }
    onUpdate?.(docData);
  } else {
    onError?.(new Error('Tree not found'));
  }
  return () => {
    active = false;
  };
}

/**
 * Lists public trees, the current user's own trees, trees shared with the user's UID or email,
 * and trees unlocked via a Family Access Code.
 *
 * @param {object | null} user
 * @returns {Promise<Array<object>>}
 */
export async function listAvailableTrees(user) {
  const results = new Map();

  const localMap = readLocalTrees();
  for (const [id, tree] of Object.entries(localMap)) {
    if (!tree || typeof tree !== 'object') continue;
    const withId = { id, ...tree };
    if (canUserViewTree(withId, user)) {
      results.set(id, withId);
    }
  }

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      try {
        const pubQuery = query(
          collection(db, 'trees'),
          where('isPublic', '==', true),
          limit(25)
        );
        const pubSnap = await getDocs(pubQuery);
        pubSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
      } catch {}

      if (user?.uid) {
        try {
          const ownQuery = query(
            collection(db, 'trees'),
            where('ownerUid', '==', user.uid),
            limit(25)
          );
          const ownSnap = await getDocs(ownQuery);
          ownSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
        } catch {}

        try {
          const collabQuery = query(
            collection(db, 'trees'),
            where('collaboratorUids', 'array-contains', user.uid),
            limit(25)
          );
          const collabSnap = await getDocs(collabQuery);
          collabSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
        } catch {}

        try {
          const viewerQuery = query(
            collection(db, 'trees'),
            where('viewerUids', 'array-contains', user.uid),
            limit(25)
          );
          const viewerSnap = await getDocs(viewerQuery);
          viewerSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
        } catch {}
      }

      if (user?.email) {
        const emailLower = String(user.email).trim().toLowerCase();
        if (emailLower) {
          try {
            const editorEmailQuery = query(
              collection(db, 'trees'),
              where('editorEmails', 'array-contains', emailLower),
              limit(25)
            );
            const editorEmailSnap = await getDocs(editorEmailQuery);
            editorEmailSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
          } catch {}

          try {
            const viewerEmailQuery = query(
              collection(db, 'trees'),
              where('viewerEmails', 'array-contains', emailLower),
              limit(25)
            );
            const viewerEmailSnap = await getDocs(viewerEmailQuery);
            viewerEmailSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
          } catch {}
        }
      }

      // Also fetch any trees previously unlocked by Family Access Code
      const unlocked = getUnlockedShareCodes();
      for (const unlockedTreeId of Object.keys(unlocked)) {
        if (!results.has(unlockedTreeId)) {
          try {
            const snap = await getDoc(doc(db, 'trees', unlockedTreeId));
            if (snap.exists()) {
              const docData = { id: snap.id, ...snap.data() };
              if (canUserViewTree(docData, user)) {
                results.set(snap.id, docData);
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Could not list cloud trees:', err);
    }
  }

  return Array.from(results.values()).filter(t => canUserViewTree(t, user));
}

/**
 * Redeems a Family Access Code via the `redeemShareCode` Cloud Function (or local registry in local-only mode),
 * granting the caller's UID viewer or editor access and returning the tree document.
 *
 * @param {string} rawCode
 * @param {string} [fallbackTreeId='']
 * @returns {Promise<object | null>}
 */
export async function redeemShareCode(rawCode, fallbackTreeId = '') {
  const { treeId: parsedTreeId, code: cleanCode } = parseTreeJoinInput(rawCode, fallbackTreeId);
  if (!cleanCode && !parsedTreeId) return null;

  const localMap = readLocalTrees();
  for (const [id, tree] of Object.entries(localMap)) {
    if (!tree || typeof tree !== 'object') continue;
    const expectedCode = tree.shareCode ? String(tree.shareCode).trim().toUpperCase() : '';
    const matchesByCode = Boolean(cleanCode && expectedCode && expectedCode === cleanCode);
    const matchesByTreeId = Boolean(
      parsedTreeId &&
        id === parsedTreeId &&
        (!expectedCode || !cleanCode || expectedCode === cleanCode)
    );
    if (matchesByCode || matchesByTreeId) {
      if (cleanCode && (!expectedCode || expectedCode === cleanCode)) {
        recordUnlockedShareCode(id, cleanCode);
      }
      return { id, ...tree };
    }
  }

  const { db, auth, functions } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    if (!auth?.currentUser) {
      const authErr = new Error('Please sign in to access or request access to this Family Tree.');
      authErr.code = 'AUTH_REQUIRED';
      throw authErr;
    }

    // Optional Cloud Function path (only if explicitly enabled on Blaze plan)
    if (functions && import.meta.env?.VITE_USE_CLOUD_FUNCTIONS === 'true' && cleanCode) {
      const callRedeem = httpsCallable(functions, 'redeemShareCode');
      const result = await callRedeem({ code: cleanCode });
      const treeId = result?.data?.treeId;
      if (treeId) {
        recordUnlockedShareCode(treeId, cleanCode);
        const snap = await getDoc(doc(db, 'trees', treeId));
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() };
        }
      }
    }

    // Spark / Free-plan path: if treeId is known, check if already authorized; otherwise signal join request needed
    if (parsedTreeId) {
      try {
        const snap = await getDoc(doc(db, 'trees', parsedTreeId));
        if (snap.exists()) {
          if (cleanCode) {
            recordUnlockedShareCode(parsedTreeId, cleanCode);
          }
          return { id: snap.id, ...snap.data() };
        }
      } catch (err) {
        if (err?.code === 'permission-denied') {
          const deniedErr = new Error('Owner approval is required to access this private tree.');
          deniedErr.code = 'APPROVAL_REQUIRED';
          deniedErr.treeId = parsedTreeId;
          deniedErr.shareCode = cleanCode;
          throw deniedErr;
        }
        throw err;
      }
    }
  }

  return null;
}

/**
 * Looks up a family tree by share link, `treeId:code`, or Family Access Code.
 *
 * @param {string} rawCode
 * @param {string} [fallbackTreeId='']
 * @returns {Promise<object | null>}
 */
export async function findTreeByShareCode(rawCode, fallbackTreeId = '') {
  try {
    return await redeemShareCode(rawCode, fallbackTreeId);
  } catch (err) {
    if (
      err?.code === 'AUTH_REQUIRED' ||
      err?.code === 'APPROVAL_REQUIRED' ||
      err?.code === 'functions/resource-exhausted'
    ) {
      throw err;
    }
    console.warn('Failed to redeem shareCode:', err);
    return null;
  }
}

/**
 * Reads private sharing settings (`viewerEmails`, `editorEmails`, `shareCode`, `shareCodeRole`, `ownerNotificationEmail`)
 * from `trees/{treeId}/private/sharing` (owner-only in Firestore).
 *
 * @param {string} treeId
 * @returns {Promise<object | null>}
 */
export async function getTreeSharingSettings(treeId) {
  if (!treeId) return null;
  const localMap = readLocalTrees();
  const localTree = localMap[treeId] || {};
  const fallback = {
    viewerEmails: Array.isArray(localTree.viewerEmails) ? localTree.viewerEmails : [],
    editorEmails: Array.isArray(localTree.editorEmails) ? localTree.editorEmails : [],
    shareCode: typeof localTree.shareCode === 'string' ? localTree.shareCode : '',
    shareCodeRole: localTree.shareCodeRole === 'editor' ? 'editor' : 'viewer',
    ownerNotificationEmail:
      typeof localTree.ownerNotificationEmail === 'string' ? localTree.ownerNotificationEmail : ''
  };

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'trees', treeId, 'private', 'sharing'));
      if (snap.exists()) {
        const d = snap.data() || {};
        return {
          viewerEmails: Array.isArray(d.viewerEmails) ? d.viewerEmails : [],
          editorEmails: Array.isArray(d.editorEmails) ? d.editorEmails : [],
          shareCode: typeof d.shareCode === 'string' ? d.shareCode : '',
          shareCodeRole: d.shareCodeRole === 'editor' ? 'editor' : 'viewer',
          ownerNotificationEmail:
            typeof d.ownerNotificationEmail === 'string' ? d.ownerNotificationEmail : ''
        };
      }
    } catch (err) {
      console.warn('Could not read private sharing settings:', err);
    }
  }

  return fallback;
}

/**
 * Updates the sharing settings (`isPublic` and optional `title` on `trees/{treeId}`, and
 * `viewerEmails`, `editorEmails`, `shareCode`, `shareCodeRole`, `ownerNotificationEmail`
 * on `trees/{treeId}/private/sharing`) for a tree owned by the current user.
 *
 * @param {string} treeId
 * @param {object} patch
 * @param {object} user
 * @returns {Promise<object | null>}
 */
export async function updateTreeSharingSettings(treeId, patch, user) {
  if (!treeId || !patch || typeof patch !== 'object' || !user?.uid) return null;

  const nowIso = new Date().toISOString();
  const cleanPatch = {};
  const publicPatch = {};
  const privatePatch = {};

  if (typeof patch.title === 'string' && patch.title.trim()) {
    const cleanTitle = patch.title.trim().slice(0, 120);
    cleanPatch.title = cleanTitle;
    publicPatch.title = cleanTitle;
  }
  if (typeof patch.isPublic === 'boolean') {
    cleanPatch.isPublic = patch.isPublic;
    publicPatch.isPublic = patch.isPublic;
  }
  if (Array.isArray(patch.viewerEmails)) {
    const cleanViewers = Array.from(
      new Set(patch.viewerEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean))
    ).slice(0, 50);
    cleanPatch.viewerEmails = cleanViewers;
    privatePatch.viewerEmails = cleanViewers;
  }
  if (Array.isArray(patch.editorEmails)) {
    const cleanEditors = Array.from(
      new Set(patch.editorEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean))
    ).slice(0, 50);
    cleanPatch.editorEmails = cleanEditors;
    privatePatch.editorEmails = cleanEditors;
  }
  if (typeof patch.shareCode === 'string') {
    const cleanCode = patch.shareCode.trim().toUpperCase().slice(0, 32);
    cleanPatch.shareCode = cleanCode;
    privatePatch.shareCode = cleanCode;
  }
  if (patch.shareCodeRole === 'viewer' || patch.shareCodeRole === 'editor') {
    cleanPatch.shareCodeRole = patch.shareCodeRole;
    privatePatch.shareCodeRole = patch.shareCodeRole;
  }
  if (typeof patch.ownerNotificationEmail === 'string') {
    const cleanNotifyEmail = patch.ownerNotificationEmail.trim().toLowerCase().slice(0, 160);
    cleanPatch.ownerNotificationEmail = cleanNotifyEmail;
    privatePatch.ownerNotificationEmail = cleanNotifyEmail;
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
    if (Object.keys(publicPatch).length > 0) {
      await updateDoc(doc(db, 'trees', treeId), {
        ...publicPatch,
        updatedAt: serverTimestamp()
      });
    }
    if (Object.keys(privatePatch).length > 0) {
      await setDoc(
        doc(db, 'trees', treeId, 'private', 'sharing'),
        {
          ...privatePatch,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
  }

  return cleanPatch;
}

/**
 * Creates a new family tree owned by the authenticated user.
 * Writes to Firestore first (when configured) so failed cloud writes never leave orphaned local ghost trees.
 *
 * @param {{ title?: string, data?: object, photos?: object, isPublic?: boolean, lang?: string }} params
 * @param {object} user
 * @returns {Promise<object>}
 */
export async function createUserTree(
  { title, data, photos = {}, isPublic = false, lang = 'en' } = {},
  user
) {
  if (!user || !user.uid) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!isPhotosPayloadWithinLimit(photos)) {
    throw new Error('PHOTOS_TOO_LARGE');
  }

  const { db } = getFirebaseClients();
  const cloudEnabled = Boolean(db && isFirebaseConfigured());
  const treeRef = cloudEnabled ? doc(collection(db, 'trees')) : null;
  const treeId = treeRef
    ? treeRef.id
    : typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : 'tree_' + generatePrivateShareToken(16).toLowerCase();

  const cleanTitle = (title || 'Family Tree').trim().slice(0, 120) || 'Family Tree';
  const nowIso = new Date().toISOString();

  const safePhotos = photos && typeof photos === 'object' && !Array.isArray(photos) ? photos : {};
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
    viewerUids: [],
    version: 1,
    data: {
      people: Array.isArray(data?.people) ? data.people : [],
      couples: Array.isArray(data?.couples) ? data.couples : []
    },
    photos: safePhotos,
    lang: lang === 'hi' ? 'hi' : 'en',
    createdAt: nowIso,
    updatedAt: nowIso
  };

  if (cloudEnabled && treeRef) {
    await setDoc(treeRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, 'trees', treeId, 'private', 'sharing'), {
      viewerEmails: [],
      editorEmails: [],
      shareCode: '',
      shareCodeRole: 'viewer',
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
 * Updates only the lineage `data` (and optional `lang`/`title`) using a Firestore transaction
 * with optimistic `version` checking.
 *
 * @param {string} treeId
 * @param {object} treeDoc
 * @param {object} user
 * @returns {Promise<boolean>}
 */
export async function saveTreeData(treeId, treeDoc, user) {
  if (!treeId || !treeDoc || typeof treeDoc !== 'object') return false;
  if (!canUserEditTree({ id: treeId, ...treeDoc }, user)) {
    return false;
  }

  const nowIso = new Date().toISOString();
  const localMap = readLocalTrees();
  const existing = localMap[treeId] || {};
  const nextData = {
    people: Array.isArray(treeDoc.data?.people) ? treeDoc.data.people : [],
    couples: Array.isArray(treeDoc.data?.couples) ? treeDoc.data.couples : []
  };
  const nextLang = treeDoc.lang === 'hi' ? 'hi' : 'en';
  const expectedVersion = typeof treeDoc.version === 'number' ? treeDoc.version : null;

  localMap[treeId] = {
    ...existing,
    data: nextData,
    lang: nextLang,
    updatedAt: nowIso
  };
  writeLocalTrees(localMap);

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      const treeRef = doc(db, 'trees', treeId);
      const nextVersion = await runTransaction(db, async tx => {
        const snap = await tx.get(treeRef);
        if (!snap.exists()) throw new Error('TREE_NOT_FOUND');
        const snapData = snap.data() || {};
        const currentVersion = Number(snapData.version || 0);
        let dataToSave = nextData;
        if (expectedVersion !== null && currentVersion > expectedVersion && snapData.data?.people) {
          const deletedSet = readDeletedIdsForTree(treeId);
          const merged = deepMergeTree(
            { data: snapData.data, photos: {} },
            { data: nextData, photos: {} }
          );
          dataToSave = {
            people: (merged.data?.people || []).filter(p => !deletedSet.has(p.id)),
            couples: (merged.data?.couples || [])
              .filter(c => !deletedSet.has(c.h) && !deletedSet.has(c.w))
              .map(c => ({
                ...c,
                kids: (c.kids || []).filter(k => !deletedSet.has(k))
              }))
          };
        }
        const bumped = currentVersion + 1;
        tx.update(treeRef, {
          data: dataToSave,
          lang: nextLang,
          version: bumped,
          updatedAt: serverTimestamp()
        });
        return bumped;
      });
      localMap[treeId].version = nextVersion;
      writeLocalTrees(localMap);
    } catch (err) {
      console.warn('Cloud tree data update deferred:', err);
      return false;
    }
  }
  return true;
}

/**
 * Updates only `photos` using a Firestore transaction with optimistic `version` checking.
 *
 * @param {string} treeId
 * @param {object} photos
 * @param {object} user
 * @param {object} [treeMeta={}]
 * @returns {Promise<boolean>}
 */
export async function saveTreePhotos(treeId, photos, user, treeMeta = {}) {
  if (!treeId) return false;
  if (!canUserEditTree({ id: treeId, ...treeMeta }, user)) {
    return false;
  }
  const safePhotos = photos && typeof photos === 'object' && !Array.isArray(photos) ? photos : {};
  if (!isPhotosPayloadWithinLimit(safePhotos)) {
    console.warn('Photos payload exceeds 750 KB cloud limit');
    return false;
  }

  const nowIso = new Date().toISOString();
  const localMap = readLocalTrees();
  const existing = localMap[treeId] || {};
  const expectedVersion = typeof treeMeta.version === 'number' ? treeMeta.version : null;

  localMap[treeId] = {
    ...existing,
    photos: safePhotos,
    updatedAt: nowIso
  };
  writeLocalTrees(localMap);

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      const treeRef = doc(db, 'trees', treeId);
      const nextVersion = await runTransaction(db, async tx => {
        const snap = await tx.get(treeRef);
        if (!snap.exists()) throw new Error('TREE_NOT_FOUND');
        const snapData = snap.data() || {};
        const currentVersion = Number(snapData.version || 0);
        const photosToSave =
          expectedVersion !== null && currentVersion > expectedVersion && snapData.photos
            ? { ...snapData.photos, ...safePhotos }
            : safePhotos;
        const bumped = currentVersion + 1;
        tx.update(treeRef, {
          photos: photosToSave,
          version: bumped,
          updatedAt: serverTimestamp()
        });
        return bumped;
      });
      localMap[treeId].version = nextVersion;
      writeLocalTrees(localMap);
    } catch (err) {
      console.warn('Cloud tree photos update deferred:', err);
      return false;
    }
  }
  return true;
}

/**
 * Synchronously caches a user tree snapshot to localStorage (`gupta_multi_trees_v1`)
 * at 0ms latency so page reloads before the 600ms cloud debounce timer never lose added members.
 *
 * @param {string} treeId
 * @param {object} treeDoc
 * @param {object} user
 * @returns {object | null}
 */
export function cacheLocalTreeSnapshot(treeId, treeDoc, user) {
  if (!treeId || !treeDoc || typeof treeDoc !== 'object') return null;
  if (!canUserEditTree({ id: treeId, ...treeDoc }, user)) return null;
  const nowIso = new Date().toISOString();
  const localMap = readLocalTrees();
  const existing = localMap[treeId] || {};
  const updated = {
    ...existing,
    title: (treeDoc.title || existing.title || 'Family Tree').slice(0, 120),
    ownerUid: treeDoc.ownerUid || existing.ownerUid || user?.uid || '',
    ownerName: (
      treeDoc.ownerName ||
      existing.ownerName ||
      user?.displayName ||
      'Family Member'
    ).slice(0, 120),
    isPublic: Boolean(treeDoc.isPublic ?? existing.isPublic ?? false),
    collaboratorUids: Array.isArray(treeDoc.collaboratorUids)
      ? treeDoc.collaboratorUids
      : existing.collaboratorUids || [],
    viewerUids: Array.isArray(treeDoc.viewerUids) ? treeDoc.viewerUids : existing.viewerUids || [],
    data: {
      people: Array.isArray(treeDoc.data?.people) ? treeDoc.data.people : [],
      couples: Array.isArray(treeDoc.data?.couples) ? treeDoc.data.couples : []
    },
    photos:
      treeDoc.photos && typeof treeDoc.photos === 'object' && !Array.isArray(treeDoc.photos)
        ? treeDoc.photos
        : {},
    lang: treeDoc.lang === 'hi' ? 'hi' : 'en',
    createdAt: treeDoc.createdAt || existing.createdAt || nowIso,
    updatedAt: nowIso
  };
  if (typeof treeDoc.version === 'number') {
    updated.version = treeDoc.version;
  } else if (typeof existing.version === 'number') {
    updated.version = existing.version;
  }
  localMap[treeId] = updated;
  writeLocalTrees(localMap);
  return updated;
}

/**
 * Updates an existing tree when the current user is the owner or collaborator.
 * Uses a Firestore transaction with `version` checking and never overwrites sharing/ownership fields.
 *
 * @param {string} treeId
 * @param {object} treeDoc
 * @param {object} user
 * @returns {Promise<boolean>}
 */
export async function saveUserTree(treeId, treeDoc, user) {
  if (!treeId || !treeDoc || typeof treeDoc !== 'object') return false;
  if (!canUserEditTree({ id: treeId, ...treeDoc }, user)) {
    return false;
  }
  if (!isPhotosPayloadWithinLimit(treeDoc.photos)) {
    console.warn('Photos payload exceeds 750 KB cloud limit');
    return false;
  }

  const localMap = readLocalTrees();
  const existing = localMap[treeId] || {};
  const expectedVersion =
    typeof treeDoc.version === 'number'
      ? treeDoc.version
      : typeof existing.version === 'number'
        ? existing.version
        : null;
  const updated = cacheLocalTreeSnapshot(treeId, treeDoc, user);
  if (!updated) return false;

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      const treeRef = doc(db, 'trees', treeId);
      const nextVersion = await runTransaction(db, async tx => {
        const snap = await tx.get(treeRef);
        if (!snap.exists()) throw new Error('TREE_NOT_FOUND');
        const snapData = snap.data() || {};
        const currentVersion = Number(snapData.version || 0);
        let dataToSave = updated.data;
        let photosToSave = updated.photos;
        if (expectedVersion !== null && currentVersion > expectedVersion && snapData.data?.people) {
          const deletedSet = readDeletedIdsForTree(treeId);
          const merged = deepMergeTree(
            { data: snapData.data, photos: snapData.photos || {} },
            { data: updated.data, photos: updated.photos || {} }
          );
          dataToSave = {
            people: (merged.data?.people || []).filter(p => !deletedSet.has(p.id)),
            couples: (merged.data?.couples || [])
              .filter(c => !deletedSet.has(c.h) && !deletedSet.has(c.w))
              .map(c => ({
                ...c,
                kids: (c.kids || []).filter(k => !deletedSet.has(k))
              }))
          };
          photosToSave = merged.photos || updated.photos;
        }
        const bumped = currentVersion + 1;
        tx.update(treeRef, {
          data: dataToSave,
          photos: photosToSave,
          lang: updated.lang,
          version: bumped,
          updatedAt: serverTimestamp()
        });
        return bumped;
      });
      const latestMap = readLocalTrees();
      if (latestMap[treeId]) {
        latestMap[treeId].version = nextVersion;
        writeLocalTrees(latestMap);
      }
    } catch (err) {
      console.warn('Cloud tree update deferred:', err);
      return false;
    }
  }
  return true;
}

/**
 * Flushes all pending per-tree debounced cloud saves immediately (e.g. on pagehide / visibilitychange).
 */
export function flushPendingSaves() {
  for (const [treeId, entry] of pendingSaves.entries()) {
    clearTimeout(entry.timer);
    pendingSaves.delete(treeId);
    Promise.resolve(saveUserTree(treeId, entry.treeDoc, entry.user)).catch(() => {});
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('pagehide', flushPendingSaves);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingSaves();
    }
  });
}

/**
 * Immediately caches the updated tree to localStorage (0ms latency so HMR/reloads never lose edits)
 * and debounces (600ms) the network write to Cloud Firestore per treeId.
 *
 * @param {string} treeId
 * @param {object} treeDoc
 * @param {object} user
 */
export function saveUserTreeDebounced(treeId, treeDoc, user) {
  if (!treeId || !treeDoc || typeof treeDoc !== 'object') return;
  if (!canUserEditTree({ id: treeId, ...treeDoc }, user)) return;

  // Immediate synchronous local cache write so code updates or refreshes never drop newly added members
  cacheLocalTreeSnapshot(treeId, treeDoc, user);

  const existingPending = pendingSaves.get(treeId);
  if (existingPending?.timer) {
    clearTimeout(existingPending.timer);
  }
  const timer = setTimeout(() => {
    pendingSaves.delete(treeId);
    Promise.resolve(saveUserTree(treeId, treeDoc, user)).catch(() => {});
  }, 600);
  pendingSaves.set(treeId, { timer, treeDoc, user });
}

const LOCAL_JOIN_REQUESTS_KEY = 'gupta_join_requests_v1';

function readLocalJoinRequests() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_JOIN_REQUESTS_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalJoinRequests(map) {
  if (typeof window === 'undefined' || !window.localStorage || !map || typeof map !== 'object') {
    return false;
  }
  try {
    localStorage.setItem(LOCAL_JOIN_REQUESTS_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

/**
 * Submits a join request under `trees/{treeId}/joinRequests/{user.uid}` (Spark-plan compatible).
 *
 * @param {string} treeId
 * @param {{ requestedRole?: 'viewer' | 'editor', shareCode?: string, note?: string, user?: object }} [params={}]
 * @returns {Promise<object>}
 */
export async function submitJoinRequest(
  treeId,
  { requestedRole = 'viewer', shareCode = '', note = '', user } = {}
) {
  const cleanTreeId = typeof treeId === 'string' ? treeId.trim() : '';
  if (!cleanTreeId) throw new Error('Tree ID is required to request access.');
  if (!user?.uid) {
    const err = new Error('Please sign in first to request access.');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const payload = {
    requesterUid: user.uid,
    requesterName: (user.displayName || '').trim().slice(0, 120),
    requesterEmail: (user.email || '').trim().toLowerCase().slice(0, 160),
    requestedRole: requestedRole === 'editor' ? 'editor' : 'viewer',
    shareCode: String(shareCode || '').trim().toUpperCase().slice(0, 32),
    note: String(note || '').trim().slice(0, 300),
    status: 'pending'
  };

  const nowIso = new Date().toISOString();
  const localAll = readLocalJoinRequests();
  localAll[cleanTreeId] = localAll[cleanTreeId] || {};
  localAll[cleanTreeId][user.uid] = {
    ...payload,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  writeLocalJoinRequests(localAll);

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    await setDoc(doc(db, 'trees', cleanTreeId, 'joinRequests', user.uid), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return payload;
}

/**
 * Reads the current user's join request status for `treeId`, if any.
 *
 * @param {string} treeId
 * @param {object | null} user
 * @returns {Promise<object | null>}
 */
export async function getMyJoinRequest(treeId, user) {
  if (!treeId || !user?.uid) return null;

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'trees', treeId, 'joinRequests', user.uid));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch {
      return null;
    }
  }

  const localAll = readLocalJoinRequests();
  return localAll[treeId]?.[user.uid] || null;
}

/**
 * Subscribes (owner-only) to pending join requests for `treeId`.
 *
 * @param {string} treeId
 * @param {(requests: Array<object>) => void} onChange
 * @returns {() => void}
 */
export function subscribePendingJoinRequests(treeId, onChange) {
  if (!treeId || typeof onChange !== 'function') return () => {};

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    const q = query(
      collection(db, 'trees', treeId, 'joinRequests'),
      where('status', '==', 'pending')
    );
    return onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onChange(list);
      },
      () => {
        onChange([]);
      }
    );
  }

  const localAll = readLocalJoinRequests();
  const list = Object.entries(localAll[treeId] || {})
    .map(([id, item]) => ({ id, ...item }))
    .filter(item => item && item.status === 'pending');
  onChange(list);
  return () => {};
}

/**
 * Owner approves or declines a pending join request and updates tree membership in Firestore.
 *
 * @param {string} treeId
 * @param {string} requesterUid
 * @param {{ approve?: boolean, role?: 'viewer' | 'editor' }} [decision={}]
 * @param {object} ownerUser
 * @returns {Promise<{ status: 'approved' | 'rejected', approvedRole: 'viewer' | 'editor' } | null>}
 */
export async function respondToJoinRequest(
  treeId,
  requesterUid,
  { approve, role = 'viewer' } = {},
  ownerUser
) {
  if (!treeId || !requesterUid || !ownerUser?.uid) return null;
  const approvedRole = role === 'editor' ? 'editor' : 'viewer';
  const nowIso = new Date().toISOString();

  const localAll = readLocalJoinRequests();
  const localReq = localAll[treeId]?.[requesterUid];
  let requesterEmail = String(localReq?.requesterEmail || '').trim().toLowerCase();
  if (localReq) {
    localReq.status = approve ? 'approved' : 'rejected';
    if (approve) localReq.approvedRole = approvedRole;
    localReq.updatedAt = nowIso;
    writeLocalJoinRequests(localAll);
  }

  const localMap = readLocalTrees();
  if (approve && localMap[treeId]) {
    const treeData = localMap[treeId];
    const currentCollabs = Array.isArray(treeData.collaboratorUids) ? treeData.collaboratorUids : [];
    const currentViewers = Array.isArray(treeData.viewerUids) ? treeData.viewerUids : [];
    treeData.collaboratorUids =
      approvedRole === 'editor'
        ? Array.from(new Set([...currentCollabs, requesterUid])).slice(0, 50)
        : currentCollabs.filter(uid => uid !== requesterUid);
    treeData.viewerUids =
      approvedRole === 'viewer'
        ? Array.from(
            new Set([...currentViewers.filter(uid => uid !== requesterUid), requesterUid])
          ).slice(0, 50)
        : currentViewers.filter(uid => uid !== requesterUid);
    treeData.updatedAt = nowIso;
    writeLocalTrees(localMap);
  }

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    const treeRef = doc(db, 'trees', treeId);
    const reqRef = doc(db, 'trees', treeId, 'joinRequests', requesterUid);
    const sharingRef = doc(db, 'trees', treeId, 'private', 'sharing');

    if (approve) {
      await runTransaction(db, async tx => {
        const treeSnap = await tx.get(treeRef);
        const reqSnap = await tx.get(reqRef);
        if (!treeSnap.exists()) throw new Error('Tree not found');
        const treeData = treeSnap.data() || {};
        if (treeData.ownerUid !== ownerUser.uid) {
          throw new Error('Only the tree owner can approve requests.');
        }

        const reqData = reqSnap.exists() ? reqSnap.data() || {} : {};
        if (reqData.requesterEmail) {
          requesterEmail = String(reqData.requesterEmail).trim().toLowerCase();
        }

        const currentCollabs = Array.isArray(treeData.collaboratorUids)
          ? treeData.collaboratorUids
          : [];
        const currentViewers = Array.isArray(treeData.viewerUids) ? treeData.viewerUids : [];
        const currentEditorEmails = Array.isArray(treeData.editorEmails)
          ? treeData.editorEmails
          : [];
        const currentViewerEmails = Array.isArray(treeData.viewerEmails)
          ? treeData.viewerEmails
          : [];

        const nextCollabs =
          approvedRole === 'editor'
            ? Array.from(new Set([...currentCollabs, requesterUid])).slice(0, 50)
            : currentCollabs.filter(uid => uid !== requesterUid);
        const nextViewers =
          approvedRole === 'viewer'
            ? Array.from(
                new Set([...currentViewers.filter(uid => uid !== requesterUid), requesterUid])
              ).slice(0, 50)
            : currentViewers.filter(uid => uid !== requesterUid);

        const nextEditorEmails =
          requesterEmail && approvedRole === 'editor'
            ? Array.from(new Set([...currentEditorEmails, requesterEmail])).slice(0, 50)
            : currentEditorEmails.filter(em => em !== requesterEmail);
        const nextViewerEmails =
          requesterEmail && approvedRole === 'viewer'
            ? Array.from(
                new Set([
                  ...currentViewerEmails.filter(em => em !== requesterEmail),
                  requesterEmail
                ])
              ).slice(0, 50)
            : currentViewerEmails.filter(em => em !== requesterEmail);

        tx.update(treeRef, {
          collaboratorUids: nextCollabs,
          viewerUids: nextViewers,
          editorEmails: nextEditorEmails,
          viewerEmails: nextViewerEmails,
          updatedAt: serverTimestamp()
        });
        if (reqSnap.exists()) {
          tx.update(reqRef, {
            status: 'approved',
            approvedRole,
            updatedAt: serverTimestamp()
          });
        }
      });

      if (requesterEmail) {
        try {
          const sharingSnap = await getDoc(sharingRef);
          const sData = sharingSnap.exists() ? sharingSnap.data() || {} : {};
          const sEditors = Array.isArray(sData.editorEmails) ? sData.editorEmails : [];
          const sViewers = Array.isArray(sData.viewerEmails) ? sData.viewerEmails : [];
          await setDoc(
            sharingRef,
            {
              editorEmails:
                approvedRole === 'editor'
                  ? Array.from(new Set([...sEditors, requesterEmail])).slice(0, 50)
                  : sEditors.filter(em => em !== requesterEmail),
              viewerEmails:
                approvedRole === 'viewer'
                  ? Array.from(
                      new Set([...sViewers.filter(em => em !== requesterEmail), requesterEmail])
                    ).slice(0, 50)
                  : sViewers.filter(em => em !== requesterEmail),
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        } catch {}
      }
    } else {
      await updateDoc(reqRef, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
    }
  }

  return { status: approve ? 'approved' : 'rejected', approvedRole };
}
