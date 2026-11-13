export const LOCAL_AUTH_KEY = 'gupta_local_auth_user';

export function loadLocalAuthUser() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalAuthUser(user) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (user) localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(LOCAL_AUTH_KEY);
  } catch {}
}
