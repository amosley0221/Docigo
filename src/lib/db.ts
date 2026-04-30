/**
 * Local IndexedDB layer.
 *
 * After the Supabase migration, the cloud is the source of truth for
 * accounts, workspaces, items, and file blobs. This module is now used
 * for two narrow things:
 *  1. Surfacing pre-migration local data so users can push it up once.
 *  2. The viewers' `getBlob(path)` API still works, but reads from
 *     Supabase Storage now (so callers don't have to change).
 */
import { openDB, type IDBPDatabase } from 'idb';
import { downloadBlob } from './api';

const DB_NAME = 'docigo';
const DB_VERSION = 3;

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
        if (!database.objectStoreNames.contains('searchIndex')) {
          database.createObjectStore('searchIndex');
        }
      },
    });
  }
  return dbPromise;
}

// ---------- Cloud-backed blob fetch ---------------------------------------

/**
 * Viewers used to call `getBlob(item.blobKey)`. After the cloud migration,
 * `item.blobKey` is now a Supabase storage path. Keep this function shape
 * so existing viewer code keeps working.
 */
export async function getBlob(path: string): Promise<Blob | undefined> {
  if (!path) return undefined;
  try {
    return await downloadBlob(path);
  } catch {
    return undefined;
  }
}

// ---------- Pre-migration local data --------------------------------------
// These remain so a one-time "Push my local workspace to the cloud" can read
// the old data. They're not used by the running app once the user signs in.

export async function legacyLoadState<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return d.get('state', key);
}

export async function legacyGetBlob(key: string): Promise<Blob | undefined> {
  const d = await db();
  return d.get('blobs', key);
}

export async function legacyDeleteAllUserData(stateKey: string, blobKeys: string[]) {
  const d = await db();
  await d.delete('state', stateKey);
  await Promise.all(blobKeys.map((k) => d.delete('blobs', k)));
}
