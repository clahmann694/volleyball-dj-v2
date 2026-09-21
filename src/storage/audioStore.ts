/**
 * Audiodateien liegen als Blobs in der IndexedDB des Browsers.
 * Das ist echter Festplattenspeicher (kein Cache) und funktioniert offline.
 */
export interface StoredFile {
  id: string;
  blob: Blob;
  name: string;
  type: string;
}

const DB_NAME = 'vbdj-v2';
const DB_VERSION = 1;
const STORE = 'files';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = op(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export function putFile(file: StoredFile): Promise<IDBValidKey> {
  return run('readwrite', s => s.put(file));
}

export function getFile(id: string): Promise<StoredFile | undefined> {
  return run<StoredFile | undefined>('readonly', s => s.get(id));
}

export function deleteFile(id: string): Promise<void> {
  return run('readwrite', s => s.delete(id)).then(() => undefined);
}

export function listFileIds(): Promise<string[]> {
  return run<IDBValidKey[]>('readonly', s => s.getAllKeys()).then(keys => keys.map(String));
}

/** Bittet den Browser, den Speicher nicht automatisch aufzuraeumen. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* nicht unterstuetzt */
  }
  return false;
}

export async function storageInfo(): Promise<{ usage: number; quota: number; persisted: boolean | null }> {
  let usage = 0;
  let quota = 0;
  let persisted: boolean | null = null;
  try {
    const est = await navigator.storage?.estimate?.();
    usage = est?.usage ?? 0;
    quota = est?.quota ?? 0;
  } catch {
    /* ignorieren */
  }
  try {
    if (navigator.storage?.persisted) persisted = await navigator.storage.persisted();
  } catch {
    /* ignorieren */
  }
  return { usage, quota, persisted };
}
