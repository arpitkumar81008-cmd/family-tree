/**
 * Modular Firebase v11 Service (Authentication + Cloud Firestore with persistent IndexedDB cache).
 * Supports both Vite build-time env vars (VITE_FIREBASE_*) and runtime config stored in localStorage.
 * Gracefully falls back to local-only mode when Firebase is not yet configured.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

const RUNTIME_CONFIG_KEY = 'gupta_firebase_config';

export function loadFirebaseConfig() {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCMrukS1JDWCudcEuvHlp0nUP2zWrXuxu4',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gupta-family-tree-akg.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gupta-family-tree-akg',
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gupta-family-tree-akg.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '377567252946',
    appId:
      import.meta.env.VITE_FIREBASE_APP_ID || '1:377567252946:web:6043388686762243ce380b',
    databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(RUNTIME_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return {
            databaseId: '(default)',
            ...parsed
          };
        }
      }
    } catch {}
  }

  return envConfig;
}

export function saveRuntimeFirebaseConfig(configObj) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(configObj));
    cachedClients = null;
    return true;
  } catch {
    return false;
  }
}

export function isFirebaseConfigured() {
  const cfg = loadFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId);
}

let cachedClients = null;

export function getFirebaseClients() {
  if (cachedClients) return cachedClients;
  const cfg = loadFirebaseConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    return { app: null, auth: null, db: null };
  }

  try {
    const isNewApp = getApps().length === 0;
    const app = isNewApp ? initializeApp(cfg) : getApp();
    const auth = getAuth(app);
    let db;
    const dbId = cfg.databaseId && cfg.databaseId !== '(default)' ? cfg.databaseId : undefined;
    if (isNewApp) {
      try {
        db = initializeFirestore(
          app,
          {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager()
            })
          },
          dbId
        );
      } catch {
        db = dbId ? getFirestore(app, dbId) : getFirestore(app);
      }
    } else {
      db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    }
    cachedClients = { app, auth, db };
    return cachedClients;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return { app: null, auth: null, db: null };
  }
}

export function subscribeToAuth(callback) {
  const { auth } = getFirebaseClients();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, user => {
    callback(
      user
        ? {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Member',
            photoURL: user.photoURL || ''
          }
        : null
    );
  });
}

export async function signInWithGoogle() {
  const { auth } = getFirebaseClients();
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signInWithEmail(email, password) {
  const { auth } = getFirebaseClients();
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signUpWithEmail(email, password, displayName = '') {
  const { auth } = getFirebaseClients();
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    } catch {}
  }
  return cred.user;
}

export async function signOutUser() {
  const { auth } = getFirebaseClients();
  if (!auth) return;
  await signOut(auth);
}
