import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'docigo';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('blobs')) {
          database.createObjectStore('blobs');
        }
        if (!database.objectStoreNames.contains('state')) {
          database.createObjectStore('state');
        }
      },
    });
  }
  return dbPromise;
}

export async function putBlob(key: string, blob: Blob) {
  const d = await db();
  await d.put('blobs', blob, key);
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const d = await db();
  return d.get('blobs', key);
}

export async function deleteBlob(key: string) {
  const d = await db();
  await d.delete('blobs', key);
}

export async function saveState<T>(key: string, value: T) {
  const d = await db();
  await d.put('state', value, key);
}

export async function loadState<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return d.get('state', key);
}
