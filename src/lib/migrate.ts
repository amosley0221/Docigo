/**
 * One-time push of pre-cloud local data into the Supabase backend.
 *
 * Older Docigo builds stored everything in IndexedDB under per-user state
 * keys. After signing into a Supabase account on a device with leftover
 * local data, we offer the user a chance to copy it up.
 */
import { db, legacyGetBlob } from './db';
import * as api from './api';
import type {
  ChartItemT,
  ChecklistItemT,
  FileItem,
  GroupT,
  Item,
  LocationT,
  QuoteItem,
} from './types';

interface LocalState {
  locations: LocationT[];
  groups: GroupT[];
  items: Item[];
}

interface LocalDigest {
  stateKey: string;
  state: LocalState;
}

/**
 * Find every IndexedDB `state` record whose value looks like a workspace.
 * We don't know the user id (they could have several), so we scan the
 * store and pick anything that has `locations`.
 */
export async function findLocalWorkspaces(): Promise<LocalDigest[]> {
  const out: LocalDigest[] = [];
  try {
    const d = await db();
    const tx = d.transaction('state', 'readonly');
    const store = tx.objectStore('state');
    let cursor = await store.openCursor();
    while (cursor) {
      const key = cursor.key as string;
      const value = cursor.value as Partial<LocalState> | undefined;
      if (
        key.startsWith('docigo-state-v1::') &&
        value &&
        Array.isArray(value.locations) &&
        value.locations.length > 0
      ) {
        out.push({
          stateKey: key,
          state: {
            locations: value.locations as LocationT[],
            groups: (value.groups as GroupT[]) ?? [],
            items: (value.items as Item[]) ?? [],
          },
        });
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch {
    // ignore
  }
  return out;
}

/**
 * Rough byte estimate of a workspace, for the migration prompt.
 */
export function summarizeWorkspace(d: LocalDigest) {
  const itemCount = d.state.items.length;
  const fileCount = d.state.items.filter((i) =>
    isLegacyFileItem(i),
  ).length;
  return {
    locations: d.state.locations.length,
    groups: d.state.groups.length,
    items: itemCount,
    files: fileCount,
  };
}

interface PushProgress {
  stage: 'locations' | 'groups' | 'items' | 'done';
  done: number;
  total: number;
}

export async function pushWorkspaceToCloud(
  userId: string,
  digest: LocalDigest,
  onProgress: (p: PushProgress) => void = () => {},
): Promise<void> {
  // Maintain id mapping so foreign keys stay consistent. Local ids are
  // free-form; cloud uses uuids. We create cloud uuids and remap.
  const locIdMap = new Map<string, string>();
  const grpIdMap = new Map<string, string>();

  // ---- Locations ----------------------------------------------------------
  for (let i = 0; i < digest.state.locations.length; i++) {
    const loc = digest.state.locations[i];
    const id = crypto.randomUUID();
    locIdMap.set(loc.id, id);
    await api.insertLocation(userId, {
      id,
      name: loc.name,
      kind: loc.kind,
      color: loc.color,
      position: i,
    });
    onProgress({
      stage: 'locations',
      done: i + 1,
      total: digest.state.locations.length,
    });
  }

  // ---- Groups -------------------------------------------------------------
  // Compute per-location position from local order.
  const groupsByLoc = new Map<string, GroupT[]>();
  for (const g of digest.state.groups) {
    const list = groupsByLoc.get(g.locationId) ?? [];
    list.push(g);
    groupsByLoc.set(g.locationId, list);
  }
  let groupsDone = 0;
  for (const [oldLocId, list] of groupsByLoc.entries()) {
    const newLocId = locIdMap.get(oldLocId);
    if (!newLocId) continue;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      const id = crypto.randomUUID();
      grpIdMap.set(g.id, id);
      await api.insertGroup(userId, {
        id,
        locationId: newLocId,
        name: g.name,
        position: i,
      });
      groupsDone += 1;
      onProgress({
        stage: 'groups',
        done: groupsDone,
        total: digest.state.groups.length,
      });
    }
  }

  // ---- Items --------------------------------------------------------------
  for (let i = 0; i < digest.state.items.length; i++) {
    const it = digest.state.items[i];
    const newLocId = locIdMap.get(it.locationId);
    const newGrpId = grpIdMap.get(it.groupId);
    if (!newLocId || !newGrpId) continue;
    const id = crypto.randomUUID();

    if (it.kind === 'quote') {
      const q = it as QuoteItem;
      await api.upsertItem(userId, {
        id,
        locationId: newLocId,
        groupId: newGrpId,
        kind: 'quote',
        name: q.name,
        quoteText: q.text,
        quoteSource: q.source,
      });
    } else if (it.kind === 'checklist') {
      const c = it as ChecklistItemT;
      await api.upsertItem(userId, {
        id,
        locationId: newLocId,
        groupId: newGrpId,
        kind: 'checklist',
        name: c.name,
        checklistEntries: c.entries,
      });
    } else if (it.kind === 'chart') {
      const c = it as ChartItemT;
      await api.upsertItem(userId, {
        id,
        locationId: newLocId,
        groupId: newGrpId,
        kind: 'chart',
        name: c.name,
        chartType: c.chartType,
        chartData: c.data,
        chartXLabel: c.xLabel,
        chartYLabel: c.yLabel,
      });
    } else {
      // File
      const f = it as FileItem;
      const blob = await legacyGetBlob(f.blobKey);
      if (!blob) continue;
      const path = api.makeStoragePath(userId, id, f.name);
      try {
        await api.uploadBlob(path, blob, f.mime);
        await api.upsertItem(userId, {
          id,
          locationId: newLocId,
          groupId: newGrpId,
          kind: f.kind,
          name: f.name,
          mime: f.mime,
          size: f.size,
          storagePath: path,
        });
      } catch {
        // Skip files we can't upload (size limit, etc.) but keep going.
      }
    }
    onProgress({
      stage: 'items',
      done: i + 1,
      total: digest.state.items.length,
    });
  }

  // ---- Cleanup local copy -------------------------------------------------
  try {
    const blobKeys = digest.state.items
      .filter(isLegacyFileItem)
      .map((i) => (i as FileItem).blobKey);
    const d = await db();
    await d.delete('state', digest.stateKey);
    await Promise.all(
      blobKeys.map((k) => d.delete('blobs', k).catch(() => {})),
    );
  } catch {
    // ignore
  }

  onProgress({ stage: 'done', done: 1, total: 1 });
}

function isLegacyFileItem(i: Item): boolean {
  return (
    i.kind === 'spreadsheet' ||
    i.kind === 'document' ||
    i.kind === 'pdf' ||
    i.kind === 'image' ||
    i.kind === 'text' ||
    i.kind === 'unknown'
  );
}
