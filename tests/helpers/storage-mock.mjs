/**
 * W3C Web Storage API In-Memory Mock.
 * Fully compliant with localStorage semantics, string coercion, and isolation.
 */
export class MockStorage {
  constructor(initialEntries = {}) {
    this._store = new Map();
    this._throwOnSetItem = false;
    for (const [key, value] of Object.entries(initialEntries)) {
      this._store.set(String(key), String(value));
    }
  }

  getItem(key) {
    const k = String(key);
    return this._store.has(k) ? this._store.get(k) : null;
  }

  setItem(key, value) {
    if (this._throwOnSetItem) {
      const err = new Error('QuotaExceededError: The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this._store.set(String(key), String(value));
  }

  removeItem(key) {
    this._store.delete(String(key));
  }

  clear() {
    this._store.clear();
  }

  get length() {
    return this._store.size;
  }

  key(index) {
    const keys = Array.from(this._store.keys());
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  dump() {
    const out = {};
    for (const [k, v] of this._store.entries()) {
      out[k] = v;
    }
    return out;
  }

  setThrowQuotaExceeded(shouldThrow = true) {
    this._throwOnSetItem = shouldThrow;
  }
}
