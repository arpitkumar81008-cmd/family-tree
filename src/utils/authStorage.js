/**
 * Local fallback authentication storage helper.
 * Used when running in offline/local-only mode without Firebase Auth configured.
 */

export const LOCAL_AUTH_KEY = 'gupta_local_auth_user';

/**
 * Loads the locally persisted authentication user object from localStorage.
 *
 * @returns {{ uid?: string, email?: string, displayName?: string, photoURL?: string } | null}
 */
export function loadLocalAuthUser() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists or clears the local fallback user profile in localStorage.
 *
 * @param {object | null} user
 * @returns {boolean}
 */
export function saveLocalAuthUser(user) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    if (user && typeof user === 'object') {
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_AUTH_KEY);
    }
    return true;
  } catch {
    return false;
  }
}
