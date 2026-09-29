/**
 * Synchronous key-value storage used for the session, the in-progress workout and the query
 * cache. Backed by localStorage in the browser; a Capacitor build can swap this module for
 * Preferences/SQLite without touching feature code.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string | null>();

const memoryStorage: KeyValueStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => void memory.set(key, value),
  removeItem: (key) => void memory.delete(key),
};

function createStorage(): KeyValueStorage {
  try {
    const probe = "fittune.probe";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
  } catch {
    return memoryStorage;
  }
  return {
    getItem: (key) => {
      if (memory.has(key)) return memory.get(key) ?? null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
        memory.delete(key);
      } catch {
        memory.set(key, value);
      }
    },
    removeItem: (key) => {
      try {
        window.localStorage.removeItem(key);
        memory.delete(key);
      } catch {
        memory.set(key, null);
      }
    },
  };
}

export const storage: KeyValueStorage = typeof window === "undefined" ? memoryStorage : createStorage();
