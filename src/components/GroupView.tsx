import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import type { GroupT, Item, ItemKind } from '../lib/types';
import { Icon, type IconName } from './Icon';
import { FileViewer } from './FileViewer';
import { humanSize } from '../lib/files';

const ICON_FOR_KIND: Record<ItemKind, IconName> = {
  spreadsheet: 'sheet',
  document: 'doc',
  pdf: 'pdf',
  image: 'image',
  text: 'text',
  quote: 'quote',
  unknown: 'folder',
};

interface GroupViewProps {
  group: GroupT;
}

export function GroupView({ group }: GroupViewProps) {
  const store = useStore();
  const items = store.itemsInGroup(group.id);
  const activeId = store.activeItemByGroup[group.id] ?? items[items.length - 1]?.id ?? null;
  const active = items.find((i) => i.id === activeId) ?? items[items.length - 1] ?? null;

  const tabsRef = useRef<HTMLDivElement>(null);
  const [dropdown, setDropdown] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdown) return;
    const onClick = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDropdown(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [dropdown]);

  const headerStats = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((acc, i) => {
      acc[i.kind] = (acc[i.kind] ?? 0) + 1;
      return acc;
    }, {});
    return counts;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <GroupHeader group={group} subtitle="No items yet." />
        <EmptyHint />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <GroupHeader
        group={group}
        subtitle={`${items.length} item${items.length === 1 ? '' : 's'} · ${Object.entries(
          headerStats,
        )
          .map(([k, n]) => `${n} ${k}`)
          .join(' · ')}`}
      />

      <div className="flex items-center gap-2 border-b border-white/5 bg-black/20 px-3 py-2">
        <div
          ref={tabsRef}
          className="flex flex-1 items-center gap-1 overflow-x-auto scroll-smooth"
        >
          {items.map((it) => {
            const isActive = active?.id === it.id;
            return (
              <div
                key={it.id}
                className={`group/tab flex shrink-0 items-center gap-1 rounded-lg border pl-2.5 pr-1 py-1 text-sm transition ${
                  isActive
                    ? 'border-accent-500/60 bg-accent-500/15 text-white shadow-soft'
                    : 'border-white/10 bg-white/[0.02] text-ink-200 hover:bg-white/[0.06]'
                }`}
                title={it.name}
              >
                <button
                  onClick={() => store.setActiveItem(group.id, it.id)}
                  className="flex items-center gap-2 py-0.5"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md ${
                      isActive ? 'text-white' : 'text-ink-300'
                    }`}
                  >
                    <Icon name={ICON_FOR_KIND[it.kind]} width={13} height={13} />
                  </span>
                  <span className="max-w-[180px] truncate font-medium">{it.name}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove “${it.name}” from ${group.name}?`)) {
                      store.deleteItem(it.id);
                    }
                  }}
                  className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover/tab:opacity-100"
                  title="Remove"
                  aria-label={`Remove ${it.name}`}
                >
                  <Icon name="x" width={12} height={12} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative" ref={ddRef}>
          <button
            className="btn-quiet"
            onClick={() => setDropdown((v) => !v)}
            title="All items"
          >
            <Icon name="chevron-down" width={14} height={14} />
            All
          </button>
          {dropdown && (
            <div className="glass-strong absolute right-0 top-[calc(100%+6px)] z-30 w-72 overflow-hidden rounded-xl shadow-soft">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Items in {group.name}
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    isActive={active?.id === it.id}
                    onSelect={() => {
                      store.setActiveItem(group.id, it.id);
                      setDropdown(false);
                    }}
                    onDelete={() => store.deleteItem(it.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">{active && <FileViewer item={active} />}</div>

      {active && (
        <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-black/20 px-4 py-2 text-xs text-ink-400">
          <div className="min-w-0 truncate">
            <span className="text-ink-200">{active.name}</span>
            <span className="mx-2">·</span>
            {active.kind === 'quote'
              ? `quote · ${active.text.length} chars`
              : `${active.mime || active.kind} · ${humanSize(active.size)}`}
          </div>
          <button
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ink-300 transition hover:bg-red-500/15 hover:text-red-300"
            onClick={() => {
              const label = active.kind === 'quote' ? 'this quote' : `“${active.name}”`;
              if (confirm(`Remove ${label}? This can’t be undone.`)) {
                store.deleteItem(active.id);
              }
            }}
            title="Remove this item"
          >
            <Icon name="trash" width={13} height={13} />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function GroupHeader({
  group,
  subtitle,
}: {
  group: GroupT;
  subtitle: string;
}) {
  return (
    <div className="border-b border-white/5 bg-black/20 px-5 pb-3 pt-4">
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <Icon name="folder" width={12} height={12} />
        Group
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white">
          {group.name}
        </h2>
        <span className="text-sm text-ink-400">{subtitle}</span>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  isActive,
  onSelect,
  onDelete,
}: {
  item: Item;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
        isActive ? 'bg-white/10 text-white' : 'text-ink-200 hover:bg-white/5 hover:text-white'
      }`}
    >
      <button onClick={onSelect} className="flex flex-1 items-center gap-2 text-left">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5">
          <Icon name={ICON_FOR_KIND[item.kind]} width={13} height={13} />
        </span>
        <span className="flex-1 truncate">{item.name}</span>
      </button>
      <button
        className="rounded-md p-1 text-ink-400 opacity-0 hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete"
      >
        <Icon name="trash" width={13} height={13} />
      </button>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="glass mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-ink-200">
        <Icon name="upload" />
      </div>
      <div className="font-display text-xl font-semibold text-white">Drop something in.</div>
      <div className="mt-1 max-w-md text-sm text-ink-400">
        Drag files anywhere on this window, or paste text to capture a quote. Docigo
        will ask where it goes.
      </div>
    </div>
  );
}
