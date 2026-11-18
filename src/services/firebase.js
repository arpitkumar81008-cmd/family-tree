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
  sendEmailVerification,
  sendPasswordResetEmail,
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
import { getFunctions } from 'firebase/functions';

const RUNTIME_CONFIG_KEY = 'gupta_firebase_config';

/**
 * Loads the active Firebase client configuration from Vite environment variables
 * or falls back to runtime configuration stored in localStorage.
 *
 * @returns {object}
 */
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
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-89GMEHC09H',
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
        if (parsed && typeof parsed === 'object' && parsed.apiKey && parsed.projectId) {
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

/**
 * Persists a runtime Firebase configuration object to localStorage and resets cached clients.
 *
 * @param {object} configObj
 * @returns {boolean}
 */
export function saveRuntimeFirebaseConfig(configObj) {
  if (typeof window === 'undefined' || !window.localStorage || !configObj || typeof configObj !== 'object') {
    return false;
  }
  try {
    localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(configObj));
    cachedClients = null;
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns true if a valid Firebase apiKey and projectId are available.
 *
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  const cfg = loadFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId);
}

let cachedClients = null;

/**
 * Lazily initializes and returns the singleton Firebase App, Auth, Firestore, and Cloud Functions clients.
 *
 * @returns {{ app: object|null, auth: object|null, db: object|null, functions: object|null }}
 */
export function getFirebaseClients() {
  if (cachedClients) return cachedClients;
  const cfg = loadFirebaseConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    return { app: null, auth: null, db: null, functions: null };
  }

  try {
    const isNewApp = getApps().length === 0;
    const app = isNewApp ? initializeApp(cfg) : getApp();
    const auth = getAuth(app);
    const functions = getFunctions(app, 'asia-south1');
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
    cachedClients = { app, auth, db, functions };
    initAnalyticsIfSupported(app);
    return cachedClients;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return { app: null, auth: null, db: null, functions: null };
  }
}

let analyticsInstance = null;
let analyticsInitPromise = null;

function initAnalyticsIfSupported(app) {
  if (typeof window === 'undefined' || !app || analyticsInitPromise) return;
  const cfg = loadFirebaseConfig();
  if (!cfg.measurementId) return;
  analyticsInitPromise = import('firebase/analytics')
    .then(async ({ isSupported, getAnalytics }) => {
      if (await isSupported()) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {});
}

/**
 * Emits a custom Google Analytics 4 event if supported in the current browser environment.
 *
 * @param {string} eventName
 * @param {object} [params={}]
 */
export async function trackAnalyticsEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !eventName) return;
  try {
    const { app } = getFirebaseClients();
    if (!app) return;
    if (!analyticsInstance && analyticsInitPromise) {
      await analyticsInitPromise;
    }
    if (!analyticsInstance) return;
    const { logEvent } = await import('firebase/analytics');
    logEvent(analyticsInstance, eventName, params);
  } catch {}
}

/**
 * Subscribes to Firebase Authentication state changes and invokes `callback` with a normalized user profile or null.
 *
 * @param {(user: { uid: string, email: string, displayName: string, photoURL: string } | null) => void} callback
 * @returns {() => void}
 */
export function subscribeToAuth(callback) {
  if (typeof callback !== 'function') return () => {};
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

/**
 * Opens the Google OAuth sign-in popup with explicit account selection.
 *
 * @returns {Promise<object>}
 */
export async function signInWithGoogle() {
  const { auth } = getFirebaseClients();
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

/**
 * Authenticates a user with email and password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function signInWithEmail(email, password) {
  const { auth } = getFirebaseClients();
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  const cleanEmail = String(email || '').trim();
  const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return cred.user;
}

/**
 * Creates a new email/password account, updates displayName, and dispatches a verification email.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} [displayName='']
 * @returns {Promise<object>}
 */
export async function signUpWithEmail(email, password, displayName = '') {
  const { auth } = getFirebaseClients();
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  const cleanEmail = String(email || '').trim();
  const cleanName = String(displayName || '').trim();
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  if (cleanName) {
    try {
      await updateProfile(cred.user, { displayName: cleanName });
    } catch {}
  }
  try {
    await sendEmailVerification(cred.user);
  } catch {}
  return cred.user;
}

/**
 * Sends a password reset email for the specified address.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  const { auth } = getFirebaseClients();
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) throw new Error('EMAIL_REQUIRED');
  await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Signs out the current Firebase user.
 *
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  const { auth } = getFirebaseClients();
  if (!auth) return;
  await signOut(auth);
}
