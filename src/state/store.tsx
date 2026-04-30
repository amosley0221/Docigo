import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { GroupT, Item, LocationT, FileItem, QuoteItem } from '../lib/types';
import { uid } from '../lib/files';
import { deleteBlob, loadState, putBlob, saveState } from '../lib/db';

interface StoreState {
  locations: LocationT[];
  groups: GroupT[];
  items: Item[];
  activeLocationId: string | null;
  activeItemByGroup: Record<string, string>; // groupId -> itemId
}

interface StoreActions {
  setActiveLocation: (id: string | null) => void;
  addLocation: (input: Omit<LocationT, 'id' | 'createdAt'>) => LocationT;
  renameLocation: (id: string, name: string) => void;
  updateLocation: (
    id: string,
    patch: Partial<Pick<LocationT, 'name' | 'kind' | 'color'>>,
  ) => void;
  deleteLocation: (id: string) => void;
  addGroup: (locationId: string, name: string) => GroupT;
  renameGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  addFile: (
    file: File,
    target: { locationId: string; groupId: string },
    options?: { replaceItemId?: string; renameTo?: string },
  ) => Promise<FileItem>;
  addQuote: (
    text: string,
    target: { locationId: string; groupId: string },
    source?: string,
  ) => QuoteItem;
  deleteItem: (id: string) => void;
  setActiveItem: (groupId: string, itemId: string) => void;
  itemsInGroup: (groupId: string) => Item[];
  groupsInLocation: (locationId: string) => GroupT[];
}

type Store = StoreState & StoreActions;

const StoreCtx = createContext<Store | null>(null);

const stateKeyFor = (userId: string) => `docigo-state-v1::${userId}`;

const sampleColors = ['#4361ff', '#aa3bff', '#ff5e7a', '#22b8a6', '#f59e0b', '#10b981'];

function defaultState(): StoreState {
  const work: LocationT = {
    id: uid('loc'),
    name: 'Main Job',
    kind: 'work',
    color: sampleColors[0],
    createdAt: Date.now(),
  };
  const school: LocationT = {
    id: uid('loc'),
    name: 'School',
    kind: 'school',
    color: sampleColors[1],
    createdAt: Date.now() + 1,
  };
  const personal: LocationT = {
    id: uid('loc'),
    name: 'Personal',
    kind: 'personal',
    color: sampleColors[3],
    createdAt: Date.now() + 2,
  };
  const groups: GroupT[] = [
    { id: uid('grp'), locationId: work.id, name: 'Inbox', createdAt: Date.now() },
    { id: uid('grp'), locationId: work.id, name: 'Reports', createdAt: Date.now() + 1 },
    { id: uid('grp'), locationId: school.id, name: 'Notes', createdAt: Date.now() + 2 },
    { id: uid('grp'), locationId: personal.id, name: 'Ideas', createdAt: Date.now() + 3 },
  ];
  return {
    locations: [work, school, personal],
    groups,
    items: [],
    activeLocationId: work.id,
    activeItemByGroup: {},
  };
}

interface StoreProviderProps {
  children: ReactNode;
  userId: string;
}

export function StoreProvider({ children, userId }: StoreProviderProps) {
  const [state, setState] = useState<StoreState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const persistRef = useRef<number | null>(null);
  const stateKey = stateKeyFor(userId);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setState(defaultState());
    loadState<StoreState>(stateKey).then((saved) => {
      if (cancelled) return;
      if (saved && saved.locations?.length) setState(saved);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [stateKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (persistRef.current) window.clearTimeout(persistRef.current);
    persistRef.current = window.setTimeout(() => {
      // Strip transient cache field before persisting
      const safe: StoreState = {
        ...state,
        items: state.items.map((it) =>
          it.kind === 'quote' ? it : { ...it, cache: undefined },
        ),
      };
      saveState(stateKey, safe);
    }, 200);
  }, [state, hydrated, stateKey]);

  const actions = useMemo<StoreActions>(() => {
    return {
      setActiveLocation: (id) =>
        setState((s) => ({ ...s, activeLocationId: id })),
      addLocation: (input) => {
        const loc: LocationT = { ...input, id: uid('loc'), createdAt: Date.now() };
        setState((s) => ({
          ...s,
          locations: [...s.locations, loc],
          activeLocationId: loc.id,
        }));
        return loc;
      },
      renameLocation: (id, name) =>
        setState((s) => ({
          ...s,
          locations: s.locations.map((l) => (l.id === id ? { ...l, name } : l)),
        })),
      updateLocation: (id, patch) =>
        setState((s) => ({
          ...s,
          locations: s.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      deleteLocation: (id) => {
        setState((s) => {
          const groupsToRemove = s.groups.filter((g) => g.locationId === id);
          const groupIds = new Set(groupsToRemove.map((g) => g.id));
          const itemsToRemove = s.items.filter((i) => groupIds.has(i.groupId));
          itemsToRemove.forEach((i) => {
            if (i.kind !== 'quote') void deleteBlob((i as FileItem).blobKey);
          });
          const remaining = s.locations.filter((l) => l.id !== id);
          return {
            ...s,
            locations: remaining,
            groups: s.groups.filter((g) => g.locationId !== id),
            items: s.items.filter((i) => !groupIds.has(i.groupId)),
            activeLocationId:
              s.activeLocationId === id ? remaining[0]?.id ?? null : s.activeLocationId,
          };
        });
      },
      addGroup: (locationId, name) => {
        const g: GroupT = { id: uid('grp'), locationId, name, createdAt: Date.now() };
        setState((s) => ({ ...s, groups: [...s.groups, g] }));
        return g;
      },
      renameGroup: (id, name) =>
        setState((s) => ({
          ...s,
          groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)),
        })),
      deleteGroup: (id) => {
        setState((s) => {
          const remove = s.items.filter((i) => i.groupId === id);
          remove.forEach((i) => {
            if (i.kind !== 'quote') void deleteBlob((i as FileItem).blobKey);
          });
          return {
            ...s,
            groups: s.groups.filter((g) => g.id !== id),
            items: s.items.filter((i) => i.groupId !== id),
          };
        });
      },
      addFile: async (file, target, options) => {
        const id = options?.replaceItemId ?? uid('itm');
        const blobKey = `blob_${id}`;
        await putBlob(blobKey, file);
        const kind = inferKindFromFile(file);
        const finalName = options?.renameTo ?? file.name;
        const now = Date.now();
        const item: FileItem = {
          id,
          name: finalName,
          kind,
          mime: file.type,
          size: file.size,
          blobKey,
          locationId: target.locationId,
          groupId: target.groupId,
          createdAt: now,
          updatedAt: now,
        };
        setState((s) => {
          const replacing = options?.replaceItemId
            ? s.items.some((i) => i.id === options.replaceItemId)
            : false;
          const items = replacing
            ? s.items.map((i) => (i.id === options!.replaceItemId ? item : i))
            : [...s.items, item];
          return {
            ...s,
            items,
            activeItemByGroup: { ...s.activeItemByGroup, [target.groupId]: item.id },
          };
        });
        return item;
      },
      addQuote: (text, target, source) => {
        const item: QuoteItem = {
          id: uid('itm'),
          name: deriveQuoteName(text),
          kind: 'quote',
          text,
          source,
          locationId: target.locationId,
          groupId: target.groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setState((s) => ({
          ...s,
          items: [...s.items, item],
          activeItemByGroup: { ...s.activeItemByGroup, [target.groupId]: item.id },
        }));
        return item;
      },
      deleteItem: (id) => {
        setState((s) => {
          const target = s.items.find((i) => i.id === id);
          if (target && target.kind !== 'quote') {
            void deleteBlob((target as FileItem).blobKey);
          }
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
      },
      setActiveItem: (groupId, itemId) =>
        setState((s) => ({
          ...s,
          activeItemByGroup: { ...s.activeItemByGroup, [groupId]: itemId },
        })),
      itemsInGroup: (groupId) =>
        state.items
          .filter((i) => i.groupId === groupId)
          .sort((a, b) => a.createdAt - b.createdAt),
      groupsInLocation: (locationId) =>
        state.groups
          .filter((g) => g.locationId === locationId)
          .sort((a, b) => a.createdAt - b.createdAt),
    };
  }, [state]);

  const value = useMemo<Store>(() => ({ ...state, ...actions }), [state, actions]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function inferKindFromFile(file: File) {
  // Lazy mirror of classifyFile to avoid circular import; same logic.
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
