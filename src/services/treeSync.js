/**
 * Cloud & Local Multi-Tree Synchronization Service.
 * - Anyone (including unauthenticated guests) can view public trees (canonical Gupta tree + shared public trees).
 * - Authenticated users can create their own trees and edit trees where they are owner/collaborator.
 * - All Firestore writes strictly conform to the schema validated in `firestore.rules`.
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

function readLocalTrees() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TREES_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeLocalTrees(map) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(LOCAL_TREES_KEY, JSON.stringify(map));
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
 */
export function subscribeToTree(treeId, onUpdate, onError) {
  if (!treeId) return () => {};

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    const ref = doc(db, 'trees', treeId);
    return onSnapshot(
      ref,
      snap => {
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
 * Lists public trees and (if signed in) the current user's own trees.
 */
export async function listAvailableTrees(user) {
  const results = new Map();

  // Always include any locally saved trees
  const localMap = readLocalTrees();
  for (const [id, tree] of Object.entries(localMap)) {
    if (tree.isPublic || (user && tree.ownerUid === user.uid)) {
      results.set(id, { id, ...tree });
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
    } catch (err) {
      console.warn('Could not list cloud trees:', err);
    }
  }

  return Array.from(results.values());
}

/**
 * Creates a new family tree owned by the authenticated user.
 * Enforces authentication before creation.
 */
export async function createUserTree({ title, data, photos = {}, isPublic = true, lang = 'en' }, user) {
  if (!user || !user.uid) {
    throw new Error('AUTH_REQUIRED');
  }

  const treeId =
    'tree_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  const cleanTitle = (title || 'Family Tree').trim().slice(0, 120);
  const nowIso = new Date().toISOString();

  const payload = {
    title: cleanTitle,
    ownerUid: user.uid,
    ownerName: (user.displayName || user.email || 'Owner').slice(0, 120),
    isPublic: Boolean(isPublic),
    collaboratorUids: [],
    data: {
      people: Array.isArray(data?.people) ? data.people : [],
      couples: Array.isArray(data?.couples) ? data.couples : []
    },
    photos: photos && typeof photos === 'object' ? photos : {},
    lang: lang === 'hi' ? 'hi' : 'en',
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // Save in local multi-tree cache for instant offline availability
  const localMap = readLocalTrees();
  localMap[treeId] = payload;
  writeLocalTrees(localMap);

  const { db } = getFirebaseClients();
  if (db && isFirebaseConfigured()) {
    await setDoc(doc(db, 'trees', treeId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return { id: treeId, ...payload };
}

/**
 * Updates an existing tree when the current user is the owner or collaborator.
 */
export async function saveUserTree(treeId, treeDoc, user) {
  if (!treeId || !user?.uid) return false;
  if (
    treeDoc.ownerUid &&
    treeDoc.ownerUid !== user.uid &&
    !(treeDoc.collaboratorUids || []).includes(user.uid)
  ) {
    return false;
  }

  const nowIso = new Date().toISOString();
  const updated = {
    title: (treeDoc.title || 'Family Tree').slice(0, 120),
    ownerUid: treeDoc.ownerUid || user.uid,
    ownerName: (treeDoc.ownerName || user.displayName || 'Owner').slice(0, 120),
    isPublic: Boolean(treeDoc.isPublic ?? true),
    collaboratorUids: Array.isArray(treeDoc.collaboratorUids) ? treeDoc.collaboratorUids : [],
    data: {
      people: Array.isArray(treeDoc.data?.people) ? treeDoc.data.people : [],
      couples: Array.isArray(treeDoc.data?.couples) ? treeDoc.data.couples : []
    },
    photos: treeDoc.photos && typeof treeDoc.photos === 'object' ? treeDoc.photos : {},
    lang: treeDoc.lang === 'hi' ? 'hi' : 'en',
    createdAt: treeDoc.createdAt || nowIso,
    updatedAt: nowIso
  };

  const localMap = readLocalTrees();
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
    }
  }
  return true;
}
