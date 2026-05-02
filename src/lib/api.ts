import { FILES_BUCKET, supabase } from './supabase';
import type {
  ChartItemT,
  ChecklistItemT,
  FileItem,
  FileKind,
  GroupT,
  Item,
  ItemKind,
  LocationKind,
  LocationT,
  QuoteItem,
} from './types';

// ---------- Row types (database shape) -------------------------------------

interface LocationRow {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  color: string;
  position: number;
  created_at: string;
}

interface GroupRow {
  id: string;
  user_id: string;
  location_id: string;
  parent_group_id: string | null;
  name: string;
  position: number;
  created_at: string;
}

interface ItemRow {
  id: string;
  user_id: string;
  location_id: string;
  group_id: string;
  kind: string;
  name: string;
  mime: string | null;
  size: number | null;
  storage_path: string | null;
  derived_pdf_path: string | null;
  quote_text: string | null;
  quote_source: string | null;
  checklist_entries: { id: string; text: string; done: boolean }[] | null;
  chart_type: string | null;
  chart_data: { id: string; label: string; value: number }[] | null;
  chart_x_label: string | null;
  chart_y_label: string | null;
  search_text: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// ---------- Mappers --------------------------------------------------------

function locationFromRow(row: LocationRow): LocationT {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as LocationKind,
    color: row.color,
    createdAt: Date.parse(row.created_at),
  };
}

function groupFromRow(row: GroupRow): GroupT {
  return {
    id: row.id,
    locationId: row.location_id,
    parentGroupId: row.parent_group_id ?? null,
    name: row.name,
    createdAt: Date.parse(row.created_at),
  };
}

function itemFromRow(row: ItemRow): Item {
  const base = {
    id: row.id,
    locationId: row.location_id,
    groupId: row.group_id,
    name: row.name,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
  switch (row.kind as ItemKind) {
    case 'quote':
      return {
        ...base,
        kind: 'quote',
        text: row.quote_text ?? '',
        source: row.quote_source ?? undefined,
      } satisfies QuoteItem;
    case 'checklist':
      return {
        ...base,
        kind: 'checklist',
        entries: row.checklist_entries ?? [],
      } satisfies ChecklistItemT;
    case 'chart':
      return {
        ...base,
        kind: 'chart',
        chartType:
          (row.chart_type as ChartItemT['chartType']) ?? 'bar',
        data: row.chart_data ?? [],
        xLabel: row.chart_x_label ?? undefined,
        yLabel: row.chart_y_label ?? undefined,
      } satisfies ChartItemT;
    default:
      return {
        ...base,
        kind: row.kind as FileKind,
        mime: row.mime ?? '',
        size: row.size ?? 0,
        blobKey: row.storage_path ?? '',
        derivedPdfBlobKey: row.derived_pdf_path ?? undefined,
      } satisfies FileItem;
  }
}

// ---------- Locations ------------------------------------------------------

export async function fetchLocations(userId: string): Promise<LocationT[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(locationFromRow);
}

export async function insertLocation(
  userId: string,
  loc: { id: string; name: string; kind: LocationKind; color: string; position: number },
) {
  const { error } = await supabase.from('locations').insert({
    id: loc.id,
    user_id: userId,
    name: loc.name,
    kind: loc.kind,
    color: loc.color,
    position: loc.position,
  });
  if (error) throw error;
}

export async function updateLocation(
  id: string,
  patch: Partial<{ name: string; kind: LocationKind; color: string; position: number }>,
) {
  const { error } = await supabase.from('locations').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteLocation(id: string) {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderLocations(userId: string, orderedIds: string[]) {
  // Run as individual updates so RLS catches per-row ownership.
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('locations')
      .update({ position: i })
      .eq('id', orderedIds[i])
      .eq('user_id', userId);
    if (error) throw error;
  }
}

// ---------- Groups ---------------------------------------------------------

export async function fetchGroups(userId: string): Promise<GroupT[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(groupFromRow);
}

export async function insertGroup(
  userId: string,
  g: {
    id: string;
    locationId: string;
    parentGroupId?: string | null;
    name: string;
    position: number;
  },
) {
  const { error } = await supabase.from('groups').insert({
    id: g.id,
    user_id: userId,
    location_id: g.locationId,
    parent_group_id: g.parentGroupId ?? null,
    name: g.name,
    position: g.position,
  });
  if (error) throw error;
}

export async function updateGroup(
  id: string,
  patch: Partial<{ name: string; position: number }>,
) {
  const { error } = await supabase.from('groups').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteGroup(id: string) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderGroups(
  userId: string,
  orderedIds: string[],
) {
  // Each siblings list reorders independently; we update by id only,
  // relying on RLS + user_id to scope.
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('groups')
      .update({ position: i })
      .eq('id', orderedIds[i])
      .eq('user_id', userId);
    if (error) throw error;
  }
}

// ---------- Items ----------------------------------------------------------

export async function fetchItems(
  userId: string,
): Promise<{ items: Item[]; searchTexts: Record<string, string> }> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as ItemRow[];
  const items = rows.map(itemFromRow);
  const searchTexts: Record<string, string> = {};
  for (const r of rows) {
    if (r.search_text && r.search_text.trim()) {
      searchTexts[r.id] = r.search_text;
    }
  }
  return { items, searchTexts };
}

interface ItemInsert {
  id: string;
  locationId: string;
  groupId: string;
  kind: ItemKind;
  name: string;
  mime?: string;
  size?: number;
  storagePath?: string;
  derivedPdfPath?: string;
  quoteText?: string;
  quoteSource?: string;
  checklistEntries?: { id: string; text: string; done: boolean }[];
  chartType?: ChartItemT['chartType'];
  chartData?: { id: string; label: string; value: number }[];
  chartXLabel?: string;
  chartYLabel?: string;
  searchText?: string;
}

export async function upsertItem(userId: string, it: ItemInsert) {
  const row = {
    id: it.id,
    user_id: userId,
    location_id: it.locationId,
    group_id: it.groupId,
    kind: it.kind,
    name: it.name,
    mime: it.mime ?? null,
    size: it.size ?? null,
    storage_path: it.storagePath ?? null,
    derived_pdf_path: it.derivedPdfPath ?? null,
    quote_text: it.quoteText ?? null,
    quote_source: it.quoteSource ?? null,
    checklist_entries: it.checklistEntries ?? null,
    chart_type: it.chartType ?? null,
    chart_data: it.chartData ?? null,
    chart_x_label: it.chartXLabel ?? null,
    chart_y_label: it.chartYLabel ?? null,
    search_text: it.searchText ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('items')
    .upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function patchItem(
  id: string,
  patch: Partial<{
    name: string;
    locationId: string;
    groupId: string;
    quoteText: string;
    quoteSource: string;
    checklistEntries: { id: string; text: string; done: boolean }[];
    chartType: ChartItemT['chartType'];
    chartData: { id: string; label: string; value: number }[];
    chartXLabel: string;
    chartYLabel: string;
    searchText: string;
    storagePath: string;
    derivedPdfPath: string;
    mime: string;
    size: number;
  }>,
) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    name: 'name',
    locationId: 'location_id',
    groupId: 'group_id',
    quoteText: 'quote_text',
    quoteSource: 'quote_source',
    checklistEntries: 'checklist_entries',
    chartType: 'chart_type',
    chartData: 'chart_data',
    chartXLabel: 'chart_x_label',
    chartYLabel: 'chart_y_label',
    searchText: 'search_text',
    storagePath: 'storage_path',
    derivedPdfPath: 'derived_pdf_path',
    mime: 'mime',
    size: 'size',
  };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && k in map) row[map[k]] = v;
  }
  const { error } = await supabase.from('items').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Storage --------------------------------------------------------

export function makeStoragePath(userId: string, itemId: string, fileName: string) {
  // The user id must be the first folder for RLS to allow it.
  const safeName = fileName.replace(/[^\w.\-+ ]/g, '_');
  return `${userId}/${itemId}/${safeName}`;
}

export async function uploadBlob(path: string, file: File | Blob, mime?: string) {
  const { error } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: mime,
    });
  if (error) throw error;
}

export async function downloadBlob(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .download(path);
  if (error) throw error;
  return data;
}

export async function removeBlob(path: string) {
  const { error } = await supabase.storage.from(FILES_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getSignedUrl(path: string, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
