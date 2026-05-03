import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  ChartItemT,
  ChecklistItemT,
  FileItem,
  GroupT,
  Item,
  LocationT,
  QuoteItem,
} from '../lib/types';
import { extractSearchText } from '../lib/extract';
import * as api from '../lib/api';
import {
  convertToPdf,
  derivedPdfPath,
  isConversionConfigured,
  isConvertible,
} from '../lib/convert';

interface StoreState {
  locations: LocationT[];
  groups: GroupT[];
  items: Item[];
  /** Which top-level view is showing. Defaults to 'home' on sign-in. */
  viewMode: 'home' | 'location';
  activeLocationId: string | null;
  activeGroupByLocation: Record<string, string>;
  activeItemByGroup: Record<string, string>;
}

interface StoreActions {
  setActiveLocation: (id: string | null) => void;
  goHome: () => void;
  addLocation: (
    input: Omit<LocationT, 'id' | 'createdAt'>,
  ) => Promise<LocationT>;
  renameLocation: (id: string, name: string) => void;
  updateLocation: (
    id: string,
    patch: Partial<Pick<LocationT, 'name' | 'kind' | 'color'>>,
  ) => void;
  deleteLocation: (id: string) => Promise<void>;
  reorderLocations: (orderedIds: string[]) => void;
  addGroup: (
    locationId: string,
    name: string,
    parentGroupId?: string | null,
  ) => Promise<GroupT>;
  renameGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => Promise<void>;
  reorderGroups: (orderedIds: string[]) => void;
  /** Children of a group (one level only — call recursively for trees). */
  childGroups: (parentId: string) => GroupT[];
  setActiveGroup: (locationId: string, groupId: string) => void;
  addFile: (
    file: File,
    target: { locationId: string; groupId: string },
    options?: { replaceItemId?: string; renameTo?: string },
  ) => Promise<FileItem>;
  addQuote: (
    text: string,
    target: { locationId: string; groupId: string },
    source?: string,
    name?: string,
  ) => Promise<QuoteItem>;
  addChecklist: (
    target: { locationId: string; groupId: string },
    name?: string,
  ) => Promise<ChecklistItemT>;
  updateChecklist: (
    id: string,
    patch: Partial<Pick<ChecklistItemT, 'name' | 'entries'>>,
  ) => void;
  addChart: (
    target: { locationId: string; groupId: string },
    name?: string,
  ) => Promise<ChartItemT>;
  updateChart: (
    id: string,
    patch: Partial<
      Pick<ChartItemT, 'name' | 'chartType' | 'data' | 'xLabel' | 'yLabel'>
    >,
  ) => void;
  renameItem: (id: string, name: string) => void;
  deleteItem: (id: string) => Promise<void>;
  setActiveItem: (groupId: string, itemId: string) => void;
  setGroupFavorite: (id: string, on: boolean) => void;
  setItemFavorite: (id: string, on: boolean) => void;
  itemsInGroup: (groupId: string) => Item[];
  groupsInLocation: (locationId: string) => GroupT[];
  searchTexts: Record<string, string>;
  refresh: () => Promise<void>;
  /** Returns true once the initial load from Supabase has finished. */
  ready: boolean;
}

type Store = StoreState & StoreActions;

const StoreCtx = createContext<Store | null>(null);

const PALETTE = [
  '#4361ff',
  '#aa3bff',
  '#ff5e7a',
  '#22b8a6',
  '#f59e0b',
  '#10b981',
];

const STARTER_LOCATIONS: Omit<LocationT, 'id' | 'createdAt'>[] = [
  { name: 'Main Job', kind: 'work', color: PALETTE[0] },
  { name: 'School', kind: 'school', color: PALETTE[1] },
  { name: 'Personal', kind: 'personal', color: PALETTE[3] },
];

interface StoreProviderProps {
  children: ReactNode;
  userId: string;
}

export function StoreProvider({ children, userId }: StoreProviderProps) {
  const [state, setState] = useState<StoreState>(() => emptyState());
  const [searchTexts, setSearchTexts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  // Track in-flight async ops so we don't churn the user with errors that
  // race with optimistic updates.
  const writeErrorRef = useRef<unknown>(null);

  const reportError = useCallback((err: unknown) => {
    writeErrorRef.current = err;
    // eslint-disable-next-line no-console
    console.error('Sync error:', err);
  }, []);

  const refresh = useCallback(async () => {
    const [locs, grps, itemsRes] = await Promise.all([
      api.fetchLocations(userId),
      api.fetchGroups(userId),
      api.fetchItems(userId),
    ]);
    setState((s) => {
      const activeLoc =
        locs.find((l) => l.id === s.activeLocationId)?.id ?? locs[0]?.id ?? null;
      return {
        ...s,
        locations: locs,
        groups: grps,
        items: itemsRes.items,
        activeLocationId: activeLoc,
      };
    });
    setSearchTexts(itemsRes.searchTexts);
  }, [userId]);

  // Initial hydrate
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setState(emptyState());
    setSearchTexts({});
    (async () => {
      try {
        const [locs, grps, itemsRes] = await Promise.all([
          api.fetchLocations(userId),
          api.fetchGroups(userId),
          api.fetchItems(userId),
        ]);
        // First-time users get the starter set seeded server-side once.
        let seededLocs = locs;
        if (
          locs.length === 0 &&
          grps.length === 0 &&
          itemsRes.items.length === 0
        ) {
          seededLocs = await seedStarter(userId);
        }
        if (cancelled) return;
        setState({
          locations: seededLocs,
          groups: grps,
          items: itemsRes.items,
          viewMode: 'home',
          activeLocationId: seededLocs[0]?.id ?? null,
          activeGroupByLocation: {},
          activeItemByGroup: {},
        });
        setSearchTexts(itemsRes.searchTexts);
      } catch (err) {
        reportError(err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reportError]);

  // Refetch when window regains focus, so other-device changes show up.
  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // Build action callbacks. We do optimistic local mutations first, then
  // the matching DB write in the background. Failures are logged.
  const actions = useMemo<StoreActions>(() => {
    const setActiveLocation = (id: string | null) =>
      setState((s) => ({
        ...s,
        activeLocationId: id,
        viewMode: id ? 'location' : s.viewMode,
      }));

    const goHome = () =>
      setState((s) => ({ ...s, viewMode: 'home' }));

    const addLocation = async (input: Omit<LocationT, 'id' | 'createdAt'>) => {
      const id = crypto.randomUUID();
      const createdAt = Date.now();
      const loc: LocationT = { ...input, id, createdAt };
      setState((s) => ({
        ...s,
        locations: [...s.locations, loc],
        activeLocationId: id,
      }));
      try {
        const position = state.locations.length;
        await api.insertLocation(userId, {
          id,
          name: loc.name,
          kind: loc.kind,
          color: loc.color,
          position,
        });
      } catch (err) {
        reportError(err);
      }
      return loc;
    };

    const renameLocation = (id: string, name: string) => {
      setState((s) => ({
        ...s,
        locations: s.locations.map((l) => (l.id === id ? { ...l, name } : l)),
      }));
      api.updateLocation(id, { name }).catch(reportError);
    };

    const updateLocationAct = (
      id: string,
      patch: Partial<Pick<LocationT, 'name' | 'kind' | 'color'>>,
    ) => {
      setState((s) => ({
        ...s,
        locations: s.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
      api.updateLocation(id, patch).catch(reportError);
    };

    const deleteLocationAct = async (id: string) => {
      // Capture file paths before optimistic delete so we can clean storage.
      const paths: string[] = [];
      for (const i of state.items) {
        if (i.locationId !== id || !isFileItem(i)) continue;
        if (i.blobKey) paths.push(i.blobKey);
        if (i.derivedPdfBlobKey) paths.push(i.derivedPdfBlobKey);
      }
      setState((s) => {
        const groupsInLoc = s.groups
          .filter((g) => g.locationId === id)
          .map((g) => g.id);
        const groupSet = new Set(groupsInLoc);
        const remaining = s.locations.filter((l) => l.id !== id);
        const nextActiveGroup = { ...s.activeGroupByLocation };
        delete nextActiveGroup[id];
        const nextActiveItem = { ...s.activeItemByGroup };
        for (const gid of groupsInLoc) delete nextActiveItem[gid];
        return {
          ...s,
          locations: remaining,
          groups: s.groups.filter((g) => g.locationId !== id),
          items: s.items.filter((i) => !groupSet.has(i.groupId)),
          activeLocationId:
            s.activeLocationId === id
              ? remaining[0]?.id ?? null
              : s.activeLocationId,
          activeGroupByLocation: nextActiveGroup,
          activeItemByGroup: nextActiveItem,
        };
      });
      try {
        await api.deleteLocation(id);
        await Promise.all(paths.map((p) => api.removeBlob(p).catch(() => {})));
      } catch (err) {
        reportError(err);
      }
    };

    const reorderLocationsAct = (orderedIds: string[]) => {
      setState((s) => {
        const byId = new Map(s.locations.map((l) => [l.id, l]));
        const reordered: LocationT[] = [];
        for (const id of orderedIds) {
          const l = byId.get(id);
          if (l) {
            reordered.push(l);
            byId.delete(id);
          }
        }
        for (const l of byId.values()) reordered.push(l);
        return { ...s, locations: reordered };
      });
      api.reorderLocations(userId, orderedIds).catch(reportError);
    };

    const addGroup = async (
      locationId: string,
      name: string,
      parentGroupId: string | null = null,
    ) => {
      const id = crypto.randomUUID();
      const createdAt = Date.now();
      const g: GroupT = { id, locationId, parentGroupId, name, createdAt };
      setState((s) => ({ ...s, groups: [...s.groups, g] }));
      try {
        const position = state.groups.filter(
          (x) =>
            x.locationId === locationId &&
            (x.parentGroupId ?? null) === parentGroupId,
        ).length;
        await api.insertGroup(userId, {
          id,
          locationId,
          parentGroupId,
          name,
          position,
        });
      } catch (err) {
        reportError(err);
      }
      return g;
    };

    const renameGroup = (id: string, name: string) => {
      setState((s) => ({
        ...s,
        groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)),
      }));
      api.updateGroup(id, { name }).catch(reportError);
    };

    const deleteGroupAct = async (id: string) => {
      const paths: string[] = [];
      for (const i of state.items) {
        if (i.groupId !== id || !isFileItem(i)) continue;
        if (i.blobKey) paths.push(i.blobKey);
        if (i.derivedPdfBlobKey) paths.push(i.derivedPdfBlobKey);
      }
      setState((s) => {
        const nextActiveItem = { ...s.activeItemByGroup };
        delete nextActiveItem[id];
        const nextActiveGroup = { ...s.activeGroupByLocation };
        for (const k of Object.keys(nextActiveGroup)) {
          if (nextActiveGroup[k] === id) delete nextActiveGroup[k];
        }
        return {
          ...s,
          groups: s.groups.filter((g) => g.id !== id),
          items: s.items.filter((i) => i.groupId !== id),
          activeItemByGroup: nextActiveItem,
          activeGroupByLocation: nextActiveGroup,
        };
      });
      try {
        await api.deleteGroup(id);
        await Promise.all(paths.map((p) => api.removeBlob(p).catch(() => {})));
      } catch (err) {
        reportError(err);
      }
    };

    const reorderGroupsAct = (orderedIds: string[]) => {
      // Reorder a single sibling list (groups sharing the same
      // location_id + parent_group_id). Other groups keep their slots.
      setState((s) => {
        const targetSet = new Set(orderedIds);
        const target = s.groups.filter((g) => targetSet.has(g.id));
        const byId = new Map(target.map((g) => [g.id, g]));
        const reordered: GroupT[] = [];
        for (const id of orderedIds) {
          const g = byId.get(id);
          if (g) {
            reordered.push(g);
            byId.delete(id);
          }
        }
        for (const g of byId.values()) reordered.push(g);
        const result: GroupT[] = [];
        let i = 0;
        for (const g of s.groups) {
          if (targetSet.has(g.id)) {
            const next = reordered[i++];
            if (next) result.push(next);
          } else {
            result.push(g);
          }
        }
        return { ...s, groups: result };
      });
      api.reorderGroups(userId, orderedIds).catch(reportError);
    };

    const setActiveGroup = (locationId: string, groupId: string) =>
      setState((s) => ({
        ...s,
        activeGroupByLocation: {
          ...s.activeGroupByLocation,
          [locationId]: groupId,
        },
      }));

    const addFile: StoreActions['addFile'] = async (
      file,
      target,
      options,
    ) => {
      const id = options?.replaceItemId ?? crypto.randomUUID();
      const finalName = options?.renameTo ?? file.name;
      const kind = inferFileKind(file);
      const storagePath = api.makeStoragePath(userId, id, finalName);

      // Upload first; if it fails, the row should not exist.
      await api.uploadBlob(storagePath, file, file.type);

      const now = Date.now();
      const item: FileItem = {
        id,
        name: finalName,
        kind,
        mime: file.type,
        size: file.size,
        blobKey: storagePath,
        locationId: target.locationId,
        groupId: target.groupId,
        createdAt: now,
        updatedAt: now,
      };

      // Try extracting text for search; non-fatal.
      let searchText: string | undefined;
      try {
        const t = await extractSearchText(file, kind);
        if (t && t.trim()) searchText = t;
      } catch {
        // ignore
      }

      // If replacing, drop the old row's blob (its old path may differ).
      if (options?.replaceItemId) {
        const prev = state.items.find((i) => i.id === options.replaceItemId);
        if (prev && isFileItem(prev) && prev.blobKey && prev.blobKey !== storagePath) {
          api.removeBlob(prev.blobKey).catch(() => {});
        }
      }

      await api.upsertItem(userId, {
        id,
        locationId: target.locationId,
        groupId: target.groupId,
        kind,
        name: finalName,
        mime: file.type,
        size: file.size,
        storagePath,
        searchText,
      });

      setState((s) => {
        const exists = s.items.some((i) => i.id === id);
        return {
          ...s,
          items: exists
            ? s.items.map((i) => (i.id === id ? item : i))
            : [...s.items, item],
          activeItemByGroup: {
            ...s.activeItemByGroup,
            [target.groupId]: id,
          },
        };
      });
      // Keep the in-memory search index in sync so the global search picks
      // up content matches without waiting for a refetch.
      setSearchTexts((prev) => {
        const next = { ...prev };
        if (searchText) next[id] = searchText;
        else delete next[id];
        return next;
      });

      // For file types we can't render natively (PowerPoint, Keynote),
      // hand the blob off to the conversion service; once it returns
      // the PDF, upload it as a sibling and patch the item with the
      // derived path so the viewer flips to PDF preview.
      if (
        kind === 'unknown' &&
        isConvertible(finalName) &&
        isConversionConfigured()
      ) {
        void (async () => {
          try {
            const pdfBlob = await convertToPdf(file, finalName);
            const pdfPath = derivedPdfPath(item);
            await api.uploadBlob(pdfPath, pdfBlob, 'application/pdf');
            await api.patchItem(id, { derivedPdfPath: pdfPath });
            setState((s) => ({
              ...s,
              items: s.items.map((i) =>
                i.id === id && isFileItem(i)
                  ? { ...i, derivedPdfBlobKey: pdfPath, updatedAt: Date.now() }
                  : i,
              ),
            }));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('PDF conversion failed for', finalName, err);
          }
        })();
      }

      return item;
    };

    const addQuote: StoreActions['addQuote'] = async (
      text,
      target,
      source,
      name,
    ) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const item: QuoteItem = {
        id,
        name: name?.trim() || deriveQuoteName(text),
        kind: 'quote',
        text,
        source,
        locationId: target.locationId,
        groupId: target.groupId,
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({
        ...s,
        items: [...s.items, item],
        activeItemByGroup: { ...s.activeItemByGroup, [target.groupId]: id },
      }));
      try {
        await api.upsertItem(userId, {
          id,
          locationId: target.locationId,
          groupId: target.groupId,
          kind: 'quote',
          name: item.name,
          quoteText: text,
          quoteSource: source,
        });
      } catch (err) {
        reportError(err);
      }
      return item;
    };

    const addChecklist: StoreActions['addChecklist'] = async (target, name) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const item: ChecklistItemT = {
        id,
        name: name?.trim() || 'New checklist',
        kind: 'checklist',
        entries: [],
        locationId: target.locationId,
        groupId: target.groupId,
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({
        ...s,
        items: [...s.items, item],
        activeItemByGroup: { ...s.activeItemByGroup, [target.groupId]: id },
      }));
      try {
        await api.upsertItem(userId, {
          id,
          locationId: target.locationId,
          groupId: target.groupId,
          kind: 'checklist',
          name: item.name,
          checklistEntries: [],
        });
      } catch (err) {
        reportError(err);
      }
      return item;
    };

    const updateChecklist: StoreActions['updateChecklist'] = (id, patch) => {
      setState((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === id && i.kind === 'checklist'
            ? { ...i, ...patch, updatedAt: Date.now() }
            : i,
        ),
      }));
      api
        .patchItem(id, {
          name: patch.name,
          checklistEntries: patch.entries,
        })
        .catch(reportError);
    };

    const addChart: StoreActions['addChart'] = async (target, name) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const item: ChartItemT = {
        id,
        name: name?.trim() || 'New chart',
        kind: 'chart',
        chartType: 'bar',
        data: [],
        locationId: target.locationId,
        groupId: target.groupId,
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({
        ...s,
        items: [...s.items, item],
        activeItemByGroup: { ...s.activeItemByGroup, [target.groupId]: id },
      }));
      try {
        await api.upsertItem(userId, {
          id,
          locationId: target.locationId,
          groupId: target.groupId,
          kind: 'chart',
          name: item.name,
          chartType: 'bar',
          chartData: [],
        });
      } catch (err) {
        reportError(err);
      }
      return item;
    };

    const updateChart: StoreActions['updateChart'] = (id, patch) => {
      setState((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === id && i.kind === 'chart'
            ? { ...i, ...patch, updatedAt: Date.now() }
            : i,
        ),
      }));
      api
        .patchItem(id, {
          name: patch.name,
          chartType: patch.chartType,
          chartData: patch.data,
          chartXLabel: patch.xLabel,
          chartYLabel: patch.yLabel,
        })
        .catch(reportError);
    };

    const renameItem: StoreActions['renameItem'] = (id, name) => {
      setState((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === id ? { ...i, name, updatedAt: Date.now() } : i,
        ),
      }));
      api.patchItem(id, { name }).catch(reportError);
    };

    const deleteItemAct: StoreActions['deleteItem'] = async (id) => {
      const target = state.items.find((i) => i.id === id);
      setState((s) => {
        const next = { ...s.activeItemByGroup };
        for (const k of Object.keys(next)) {
          if (next[k] === id) delete next[k];
        }
        return {
          ...s,
          items: s.items.filter((i) => i.id !== id),
          activeItemByGroup: next,
        };
      });
      setSearchTexts((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        await api.deleteItem(id);
        if (target && isFileItem(target)) {
          if (target.blobKey) await api.removeBlob(target.blobKey).catch(() => {});
          if (target.derivedPdfBlobKey)
            await api.removeBlob(target.derivedPdfBlobKey).catch(() => {});
        }
      } catch (err) {
        reportError(err);
      }
    };

    const setActiveItem = (groupId: string, itemId: string) =>
      setState((s) => ({
        ...s,
        activeItemByGroup: { ...s.activeItemByGroup, [groupId]: itemId },
      }));

    const setGroupFavoriteAct = (id: string, on: boolean) => {
      const ts = on ? Date.now() : undefined;
      setState((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          g.id === id ? { ...g, favoritedAt: ts } : g,
        ),
      }));
      api.setGroupFavorite(id, on).catch(reportError);
    };

    const setItemFavoriteAct = (id: string, on: boolean) => {
      const ts = on ? Date.now() : undefined;
      setState((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === id ? { ...i, favoritedAt: ts } : i,
        ),
      }));
      api.setItemFavorite(id, on).catch(reportError);
    };

    return {
      setActiveLocation,
      goHome,
      addLocation,
      renameLocation,
      updateLocation: updateLocationAct,
      deleteLocation: deleteLocationAct,
      reorderLocations: reorderLocationsAct,
      addGroup,
      renameGroup,
      deleteGroup: deleteGroupAct,
      reorderGroups: reorderGroupsAct,
      setActiveGroup,
      addFile,
      addQuote,
      addChecklist,
      updateChecklist,
      addChart,
      updateChart,
      renameItem,
      deleteItem: deleteItemAct,
      setActiveItem,
      setGroupFavorite: setGroupFavoriteAct,
      setItemFavorite: setItemFavoriteAct,
      itemsInGroup: (groupId) =>
        state.items
          .filter((i) => i.groupId === groupId)
          .sort((a, b) => a.createdAt - b.createdAt),
      groupsInLocation: (locationId) =>
        state.groups.filter(
          (g) => g.locationId === locationId && !g.parentGroupId,
        ),
      childGroups: (parentId) =>
        state.groups.filter((g) => g.parentGroupId === parentId),
      searchTexts,
      refresh,
      ready,
    };
  }, [state, userId, reportError, refresh, ready, searchTexts]);

  // Build searchTexts from items with search_text fields. We don't have it
  // here directly because items don't carry searchText on the client type,
  // but extractSearchText runs on upload and the value is round-tripped via
  // patchItem. We don't surface it to the search UI separately on the cloud
  // path; SearchBar still matches name/quote/checklist/chart fields.
  const value = useMemo<Store>(() => ({ ...state, ...actions }), [state, actions]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function emptyState(): StoreState {
  return {
    locations: [],
    groups: [],
    items: [],
    viewMode: 'home',
    activeLocationId: null,
    activeGroupByLocation: {},
    activeItemByGroup: {},
  };
}

async function seedStarter(userId: string): Promise<LocationT[]> {
  const seeded: LocationT[] = [];
  for (let i = 0; i < STARTER_LOCATIONS.length; i++) {
    const tpl = STARTER_LOCATIONS[i];
    const id = crypto.randomUUID();
    await api.insertLocation(userId, {
      id,
      name: tpl.name,
      kind: tpl.kind,
      color: tpl.color,
      position: i,
    });
    seeded.push({
      id,
      name: tpl.name,
      kind: tpl.kind,
      color: tpl.color,
      createdAt: Date.now() + i,
    });
  }
  return seeded;
}

function inferFileKind(file: File) {
  const name = file.name.toLowerCase();
  const m = file.type;
  if (m.startsWith('image/')) return 'image' as const;
  if (m === 'application/pdf' || name.endsWith('.pdf')) return 'pdf' as const;
  if (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv') ||
    m.includes('spreadsheet') ||
    m === 'text/csv'
  ) {
    return 'spreadsheet' as const;
  }
  if (
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    m.includes('word') ||
    m === 'application/msword'
  ) {
    return 'document' as const;
  }
  if (
    m.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.json') ||
    name.endsWith('.log')
  ) {
    return 'text' as const;
  }
  return 'unknown' as const;
}

function isFileItem(i: Item): i is FileItem {
  return (
    i.kind === 'spreadsheet' ||
    i.kind === 'document' ||
    i.kind === 'pdf' ||
    i.kind === 'image' ||
    i.kind === 'text' ||
    i.kind === 'unknown'
  );
}

function deriveQuoteName(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return 'Empty quote';
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

export function useStore(): Store {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
