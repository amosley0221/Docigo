import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'docigo';
const DB_VERSION = 2;

export const GUEST_USER_ID = '__guest__';
export const stateKeyFor = (userId: string) => `docigo-state-v1::${userId}`;

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
        if (!database.objectStoreNames.contains('users')) {
          database.createObjectStore('users', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function listUsers<T = unknown>(): Promise<T[]> {
  const d = await db();
  return d.getAll('users') as Promise<T[]>;
}

export async function getUser<T = unknown>(id: string): Promise<T | undefined> {
  const d = await db();
  return d.get('users', id) as Promise<T | undefined>;
}

export async function putUser<T extends { id: string }>(user: T) {
  const d = await db();
  await d.put('users', user);
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

export async function deleteState(key: string) {
  const d = await db();
  await d.delete('state', key);
}
