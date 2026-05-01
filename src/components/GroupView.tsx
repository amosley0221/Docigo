import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import type { GroupT, Item, ItemKind } from '../lib/types';
import { Icon, type IconName } from './Icon';
import { FileViewer } from './FileViewer';
import { humanSize } from '../lib/files';
import { useUploader } from './UploaderContext';

function describeItem(item: Item): string {
  switch (item.kind) {
    case 'quote':
      return `quote · ${item.text.length} chars`;
    case 'checklist': {
      const total = item.entries.length;
      const done = item.entries.filter((e) => e.done).length;
      return `checklist · ${done} of ${total} done`;
    }
    case 'chart':
      return `${item.chartType} chart · ${item.data.length} point${item.data.length === 1 ? '' : 's'}`;
    default:
      return `${item.mime || item.kind} · ${humanSize(item.size)}`;
  }
}

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

interface GroupViewProps {
  group: GroupT;
}

export function GroupView({ group }: GroupViewProps) {
  const store = useStore();
  const { pickFiles } = useUploader();
  const items = store.itemsInGroup(group.id);
  const activeId = store.activeItemByGroup[group.id] ?? items[items.length - 1]?.id ?? null;
  const active = items.find((i) => i.id === activeId) ?? items[items.length - 1] ?? null;

  const [dropdown, setDropdown] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const [newMenu, setNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdown) return;
    const onClick = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDropdown(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [dropdown]);

  useEffect(() => {
    if (!newMenu) return;
    const onClick = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node))
        setNewMenu(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [newMenu]);

  const target = { locationId: group.locationId, groupId: group.id };
  const createChecklist = () => {
    store.addChecklist(target, 'New checklist');
    setNewMenu(false);
  };
  const createChart = () => {
    store.addChart(target, 'New chart');
    setNewMenu(false);
  };

  const headerStats = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((acc, i) => {
      acc[i.kind] = (acc[i.kind] ?? 0) + 1;
      return acc;
    }, {});
    return counts;
  }, [items]);

  return (
    <div className="flex h-full flex-col">
      <GroupHeader
        group={group}
        subtitle={
          items.length === 0
            ? 'No items yet.'
            : `${items.length} item${items.length === 1 ? '' : 's'} · ${Object.entries(
                headerStats,
              )
                .map(([k, n]) => `${n} ${k}`)
                .join(' · ')}`
        }
      />

      <div className="flex items-center gap-2 border-b border-white/5 bg-black/20 px-3 py-2 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-3 md:px-4">
        <div className="hidden text-[11px] font-semibold uppercase tracking-wider text-ink-400 md:block">
          File
        </div>
        <div className="relative min-w-0 flex-1 md:w-[clamp(240px,32vw,460px)] md:flex-none" ref={ddRef}>
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-sm text-white transition hover:bg-white/[0.08]"
            onClick={() => setDropdown((v) => !v)}
          >
            {active && (
              <span className="flex h-5 w-5 items-center justify-center rounded-md text-ink-200">
                <Icon name={ICON_FOR_KIND[active.kind]} width={14} height={14} />
              </span>
            )}
            <span className="flex-1 truncate font-medium">
              {active ? active.name : 'Pick a file'}
            </span>
            <span className="text-xs text-ink-400">
              {items.length} item{items.length === 1 ? '' : 's'}
            </span>
            <Icon name="chevron-down" width={14} height={14} className="text-ink-300" />
          </button>
          {dropdown && (
            <div className="glass-strong absolute left-0 top-[calc(100%+6px)] z-30 w-full overflow-hidden rounded-xl shadow-soft md:left-1/2 md:-translate-x-1/2">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Items in {group.name}
              </div>
              <div className="max-h-80 overflow-y-auto p-1">
                {items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    isActive={active?.id === it.id}
                    onSelect={() => {
                      store.setActiveItem(group.id, it.id);
                      setDropdown(false);
                    }}
                    onDelete={() => {
                      if (confirm(`Remove “${it.name}” from ${group.name}?`)) {
                        store.deleteItem(it.id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 md:gap-2">
          <button
            onClick={pickFiles}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-ink-200 transition hover:bg-white/[0.07]"
            title="Upload files into this group"
          >
            <Icon name="upload" width={13} height={13} />
            <span className="hidden md:inline">Upload</span>
          </button>
          <div className="relative" ref={newMenuRef}>
            <button
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-ink-200 transition hover:bg-white/[0.07]"
              onClick={() => setNewMenu((v) => !v)}
              title="Create a new item in this group"
            >
              <Icon name="plus" width={13} height={13} />
              <span className="hidden md:inline">New</span>
              <Icon
                name="chevron-down"
                width={12}
                height={12}
                className="hidden text-ink-400 md:block"
              />
            </button>
            {newMenu && (
              <div className="glass-strong absolute right-0 top-[calc(100%+6px)] z-30 w-56 overflow-hidden rounded-xl shadow-soft">
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Create in {group.name}
                </div>
                <div className="p-1">
                  <button
                    onClick={createChecklist}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-accent-300">
                      <Icon name="checklist" width={14} height={14} />
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-white">Checklist</div>
                      <div className="text-[11px] text-ink-400">
                        Tasks you can check off as you go.
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={createChart}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-fuchsia-300">
                      <Icon name="chart-bar" width={14} height={14} />
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-white">Chart</div>
                      <div className="text-[11px] text-ink-400">
                        Bar, line, or pie from your own data.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          {active && (
            <button
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-ink-300 transition hover:bg-red-500/15 hover:text-red-300"
              onClick={() => {
                const label = active.kind === 'quote' ? 'this quote' : `“${active.name}”`;
                if (confirm(`Remove ${label}? This can’t be undone.`)) {
                  store.deleteItem(active.id);
                }
              }}
              title="Remove this item"
            >
              <Icon name="trash" width={13} height={13} />
              <span className="hidden md:inline">Remove</span>
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {active ? (
          <div className="flex h-full justify-center">
            <div className="h-full w-full min-w-0 md:w-[70%]">
              <FileViewer item={active} />
            </div>
          </div>
        ) : (
          <EmptyHint />
        )}
      </div>

      {active && (
        <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-black/20 px-4 py-2 text-xs text-ink-400">
          <div className="min-w-0 truncate">
            <span className="text-ink-200">{active.name}</span>
            <span className="mx-2">·</span>
            {describeItem(active)}
          </div>
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
    <div className="border-b border-white/5 bg-black/20 px-3 pb-2 pt-3 md:px-5 md:pb-3 md:pt-4">
      <div className="hidden items-center gap-2 text-xs text-ink-400 md:flex">
        <Icon name="folder" width={12} height={12} />
        Group
      </div>
      <div className="mt-0 flex flex-col gap-0 md:mt-1 md:flex-row md:items-baseline md:gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight text-white md:text-2xl">
          {group.name}
        </h2>
        <span className="text-xs text-ink-400 md:text-sm">{subtitle}</span>
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
  const { pickFiles } = useUploader();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <button
        onClick={pickFiles}
        className="glass mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-ink-200 transition hover:bg-white/[0.06] hover:text-white"
        aria-label="Choose files to upload"
        title="Choose files"
      >
        <Icon name="upload" />
      </button>
      <div className="font-display text-xl font-semibold text-white">Add something.</div>
      <div className="mt-1 max-w-md text-sm text-ink-400">
        Tap the upload icon, drop files anywhere on this window, or paste
        text to capture a quote. Docigo will ask where it goes.
      </div>
      <button onClick={pickFiles} className="btn-primary mt-5">
        <Icon name="upload" width={14} height={14} />
        Choose files
      </button>
    </div>
  );
}
