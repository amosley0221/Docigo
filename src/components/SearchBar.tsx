import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { useStore } from '../state/store';
import type { Item, ItemKind } from '../lib/types';
import { useHighlight } from './HighlightContext';

const ICON_FOR_KIND: Record<ItemKind, IconName> = {
  spreadsheet: 'sheet',
  document: 'doc',
  pdf: 'pdf',
  image: 'image',
  text: 'text',
  quote: 'quote',
  checklist: 'checklist',
  chart: 'chart-bar',
  unknown: 'folder',
};

type Scope = 'current' | 'all';

interface ItemHit {
  type: 'item';
  item: Item;
  matchedField: 'name' | 'quote' | 'content';
  matchSnippet?: string;
}

interface GroupHit {
  type: 'group';
  groupId: string;
  groupName: string;
  locationId: string;
}

type Hit = ItemHit | GroupHit;

export function SearchBar() {
  const store = useStore();
  const { request: requestHighlight } = useHighlight();
  const [scope, setScope] = useState<Scope>('current');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: focus search on `/` or Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement | null)?.isContentEditable;
      if (!inEditable && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  const hits = useMemo<Hit[]>(() => {
    if (!trimmed) return [];
    const inScope = (locationId: string) =>
      scope === 'all' || locationId === store.activeLocationId;

    const itemHits: ItemHit[] = [];
    for (const item of store.items) {
      if (!inScope(item.locationId)) continue;
      if (item.name.toLowerCase().includes(lower)) {
        itemHits.push({ type: 'item', item, matchedField: 'name' });
        continue;
      }
      if (item.kind === 'quote' && item.text.toLowerCase().includes(lower)) {
        itemHits.push({
          type: 'item',
          item,
          matchedField: 'quote',
          matchSnippet: snippet(item.text, lower),
        });
        continue;
      }
      if (item.kind === 'checklist') {
        const match = item.entries.find((e) =>
          e.text.toLowerCase().includes(lower),
        );
        if (match) {
          itemHits.push({
            type: 'item',
            item,
            matchedField: 'content',
            matchSnippet: `${match.done ? '✓ ' : '◦ '}${snippet(match.text, lower)}`,
          });
        }
        continue;
      }
      if (item.kind === 'chart') {
        const match = item.data.find((d) =>
          d.label.toLowerCase().includes(lower),
        );
        if (match) {
          itemHits.push({
            type: 'item',
            item,
            matchedField: 'content',
            matchSnippet: `${match.label} · ${match.value}`,
          });
        }
        continue;
      }
      const content = store.searchTexts[item.id];
      if (content && content.toLowerCase().includes(lower)) {
        itemHits.push({
          type: 'item',
          item,
          matchedField: 'content',
          matchSnippet: snippet(content, lower),
        });
      }
    }

    const groupHits: GroupHit[] = [];
    for (const group of store.groups) {
      if (!inScope(group.locationId)) continue;
      if (group.name.toLowerCase().includes(lower)) {
        groupHits.push({
          type: 'group',
          groupId: group.id,
          groupName: group.name,
          locationId: group.locationId,
        });
      }
    }

    return [...itemHits.slice(0, 30), ...groupHits.slice(0, 10)];
  }, [trimmed, lower, scope, store]);

  const navigate = (target: {
    locationId: string;
    groupId: string;
    itemId?: string;
    highlightQuery?: string;
  }) => {
    if (target.locationId !== store.activeLocationId) {
      store.setActiveLocation(target.locationId);
    }
    store.setActiveGroup(target.locationId, target.groupId);
    if (target.itemId) {
      store.setActiveItem(target.groupId, target.itemId);
      if (target.highlightQuery) {
        requestHighlight({
          itemId: target.itemId,
          query: target.highlightQuery,
        });
      }
    }
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-[200px] max-w-[44vw] md:w-[420px] md:max-w-[42vw]" ref={wrapRef}>
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 transition focus-within:border-accent-500/60 focus-within:bg-white/[0.06]">
        <Icon name="search" width={14} height={14} className="ml-1 text-ink-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search…"
          className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-white placeholder:text-ink-500 outline-none"
        />
        <div className="hidden md:block">
          <ScopeToggle scope={scope} setScope={setScope} />
        </div>
        {!query && (
          <kbd className="ml-1 hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-ink-400 md:inline-block">
            /
          </kbd>
        )}
      </div>

      {open && trimmed.length > 0 && (
        <div className="glass-strong absolute right-0 top-[calc(100%+6px)] z-40 w-[calc(100vw-24px)] max-w-[520px] overflow-hidden rounded-xl shadow-soft md:w-[520px] md:max-w-[80vw]">
          <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
            <div className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              {scope === 'current'
                ? `In ${store.locations.find((l) => l.id === store.activeLocationId)?.name ?? 'this location'}`
                : 'Across all locations'}
            </div>
            <div className="md:hidden">
              <ScopeToggle scope={scope} setScope={setScope} />
            </div>
            <div className="hidden text-[11px] text-ink-400 md:block">
              {hits.length} match{hits.length === 1 ? '' : 'es'}
            </div>
          </div>
          {hits.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-400">
              No matches for “{trimmed}”.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto p-1">
              {hits.map((hit, i) => (
                <ResultRow
                  key={
                    hit.type === 'item' ? `item-${hit.item.id}` : `group-${hit.groupId}`
                  }
                  hit={hit}
                  query={trimmed}
                  store={store}
                  isFirst={i === 0}
                  onNavigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScopeToggle({
  scope,
  setScope,
}: {
  scope: Scope;
  setScope: (s: Scope) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-white/10 bg-white/[0.03] p-0.5 text-[11px]">
      <button
        type="button"
        className={`rounded px-2 py-0.5 transition ${
          scope === 'current'
            ? 'bg-accent-500/30 text-white'
            : 'text-ink-300 hover:text-white'
        }`}
        onClick={() => setScope('current')}
        title="Search only this location"
      >
        This loc
      </button>
      <button
        type="button"
        className={`rounded px-2 py-0.5 transition ${
          scope === 'all'
            ? 'bg-accent-500/30 text-white'
            : 'text-ink-300 hover:text-white'
        }`}
        onClick={() => setScope('all')}
        title="Search across every location"
      >
        All
      </button>
    </div>
  );
}

function ResultRow({
  hit,
  query,
  store,
  isFirst,
  onNavigate,
}: {
  hit: Hit;
  query: string;
  store: ReturnType<typeof useStore>;
  isFirst: boolean;
  onNavigate: (target: {
    locationId: string;
    groupId: string;
    itemId?: string;
    highlightQuery?: string;
  }) => void;
}) {
  if (hit.type === 'group') {
    const loc = store.locations.find((l) => l.id === hit.locationId);
    return (
      <button
        autoFocus={isFirst}
        onClick={() =>
          onNavigate({ locationId: hit.locationId, groupId: hit.groupId })
        }
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5">
          <Icon name="folder" width={13} height={13} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate">
            <Highlight text={hit.groupName} q={query} />{' '}
            <span className="text-xs text-ink-500">· group</span>
          </div>
          <div className="truncate text-xs text-ink-400">{loc?.name ?? ''}</div>
        </div>
      </button>
    );
  }

  const item = hit.item;
  const loc = store.locations.find((l) => l.id === item.locationId);
  const group = store.groups.find((g) => g.id === item.groupId);
  return (
    <button
      autoFocus={isFirst}
      onClick={() =>
        onNavigate({
          locationId: item.locationId,
          groupId: item.groupId,
          itemId: item.id,
          highlightQuery:
            hit.matchedField === 'name' ? undefined : query,
        })
      }
      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
    >
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-white/5">
        <Icon name={ICON_FOR_KIND[item.kind]} width={13} height={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate">
          <Highlight text={item.name} q={query} />
        </div>
        {hit.matchedField === 'quote' && hit.matchSnippet && (
          <div className="mt-0.5 line-clamp-2 text-xs italic text-ink-300">
            “<Highlight text={hit.matchSnippet} q={query} />”
          </div>
        )}
        {hit.matchedField === 'content' && hit.matchSnippet && (
          <div className="mt-0.5 line-clamp-2 text-xs text-ink-300">
            <span className="mr-1 rounded bg-white/[0.06] px-1 py-px text-[10px] uppercase tracking-wider text-ink-400">
              content
            </span>
            <Highlight text={hit.matchSnippet} q={query} />
          </div>
        )}
        <div className="mt-0.5 truncate text-xs text-ink-400">
          {loc?.name ?? '—'} · {group?.name ?? '—'}
        </div>
      </div>
    </button>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const i = lower.indexOf(ql);
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-accent-400/30 px-0.5 text-white">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function snippet(text: string, q: string): string {
  const lower = text.toLowerCase();
  const i = lower.indexOf(q);
  if (i === -1) return text.slice(0, 120);
  const start = Math.max(0, i - 30);
  const end = Math.min(text.length, i + q.length + 90);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}
