/**
 * Browser storage persistence helpers.
 *
 * `persist()` asks the browser to mark the origin's storage as "persistent"
 * so the user agent won't evict it under storage pressure without explicit
 * user action. Behavior varies by browser:
 *  - Chromium: granted heuristically (no prompt) once usage is non-trivial.
 *  - Firefox: prompts the user the first time.
 *  - Safari: largely a no-op; ITP can still clear data after inactivity.
 */

let cachedPersistRequested = false;

export async function isPersisted(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    !navigator.storage.persisted
  ) {
    return false;
  }
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

export async function requestPersistence(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    !navigator.storage.persist
  ) {
    return false;
  }
  if (cachedPersistRequested) {
    return isPersisted();
  }
  cachedPersistRequested = true;
  if (await isPersisted()) return true;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  persistent: boolean;
  supported: boolean;
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    !navigator.storage.estimate
  ) {
    return { usage: 0, quota: 0, persistent: false, supported: false };
  }
  try {
    const est = await navigator.storage.estimate();
    return {
      usage: est.usage ?? 0,
      quota: est.quota ?? 0,
      persistent: await isPersisted(),
      supported: true,
    };
  } catch {
    return { usage: 0, quota: 0, persistent: false, supported: false };
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
