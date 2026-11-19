/**
 * Minimal IndexedDB key/value store with a localStorage fallback.
 *
 * Values are stored as structured clones in a single object store. When
 * IndexedDB is unavailable or blocked (SSR, private mode, tests), every call
 * falls back to JSON in localStorage so callers never need to branch.
 */

const DB_NAME = "dongle";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function runRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
    tx.onabort = () => reject(tx.error);
  });
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.code === 22)
  );
}

function readLocal<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/** Read a value. Falls back to localStorage for not-yet-migrated keys. */
export async function getStoredItem<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (db) {
    try {
      const value = await runRequest<T | undefined>(db, "readonly", (s) => s.get(key));
      if (value !== undefined) return value;
    } catch {
      /* fall through to localStorage */
    }
  }
  return readLocal<T>(key);
}

/** Write a value. Returns false (and logs) when the write fails, e.g. quota exceeded. */
export async function setStoredItem<T>(key: string, value: T): Promise<boolean> {
  const db = await openDb();
  try {
    if (db) {
      await runRequest(db, "readwrite", (s) => s.put(value, key));
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.warn(
      isQuotaError(error)
        ? `Storage quota exceeded while saving "${key}"`
        : `Failed to save "${key}"`,
      error,
    );
    return false;
  }
}

export async function removeStoredItem(key: string): Promise<void> {
  const db = await openDb();
  if (db) {
    try {
      await runRequest(db, "readwrite", (s) => s.delete(key));
    } catch {
      /* ignore */
    }
  }
  if (typeof localStorage !== "undefined") localStorage.removeItem(key);
}

/**
 * Move the given keys from localStorage into IndexedDB. A key is only removed
 * from localStorage after it was written to IndexedDB successfully, so a
 * failed migration leaves the data where it was.
 */
export async function migrateLocalStorageToIndexedDB(keys: string[]): Promise<void> {
  const db = await openDb();
  if (!db || typeof localStorage === "undefined") return;

  for (const key of keys) {
    const value = readLocal<unknown>(key);
    if (value === null) continue;
    try {
      await runRequest(db, "readwrite", (s) => s.put(value, key));
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to migrate "${key}" to IndexedDB`, error);
    }
  }
}
