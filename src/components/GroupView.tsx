import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import type { GroupT, Item, ItemKind, QuoteItem } from '../lib/types';
import { Icon, type IconName } from './Icon';
import { FileViewer } from './FileViewer';
import { humanSize } from '../lib/files';
import { useUploader } from './UploaderContext';
import { useConfirm } from './ConfirmProvider';
import { getNativeAppAction, runNativeAppAction } from '../lib/nativeApp';
import type { FileItem } from '../lib/types';
import { useFavorites } from '../state/favorites';
import { notifyFavoritesLimit } from './Workspace';
import { TextFormModal } from './TextFormModal';

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
  /** Opens a "create subgroup" prompt when invoked. */
  onCreateSubgroup?: () => void;
}

export function GroupView({ group, onCreateSubgroup }: GroupViewProps) {
  const store = useStore();
  const favorites = useFavorites();
  const { pickFiles } = useUploader();
  const confirm = useConfirm();
  const items = store.itemsInGroup(group.id);

  const toggleItemFavorite = (id: string) => {
    const result = favorites.toggleFavorite('item', id);
    if (result === 'limit') notifyFavoritesLimit(favorites.max);
  };
  const activeId = store.activeItemByGroup[group.id] ?? items[items.length - 1]?.id ?? null;
  const active = items.find((i) => i.id === activeId) ?? items[items.length - 1] ?? null;

  const [dropdown, setDropdown] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const [newMenu, setNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteItem | null>(null);

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
  const createText = () => {
    setNewMenu(false);
    setTextModalOpen(true);
  };
  const createSubgroup = () => {
    if (onCreateSubgroup) onCreateSubgroup();
    setNewMenu(false);
  };

  const headerStats = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((acc, i) => {
      acc[i.kind] = (acc[i.kind] ?? 0) + 1;
      return acc;
    }, {});
    return counts;
  }, [items]);

  // Build a breadcrumb of ancestor groups so the header shows
  // "Semester › Course › ..." when the active group is nested.
  const breadcrumb = useMemo(() => {
    const path: string[] = [];
    let cursor: GroupT | undefined = group;
    while (cursor?.parentGroupId) {
      const parent = store.groups.find((g) => g.id === cursor!.parentGroupId);
      if (!parent) break;
      path.unshift(parent.name);
      cursor = parent;
    }
    return path;
  }, [group, store.groups]);

  return (
    <div className="flex h-full flex-col">
      <GroupHeader
        group={group}
        breadcrumb={breadcrumb}
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
                    isFavorite={favorites.isFavorite('item', it.id)}
                    onSelect={() => {
                      store.setActiveItem(group.id, it.id);
                      setDropdown(false);
                    }}
                    onToggleFavorite={() => toggleItemFavorite(it.id)}
                    onDelete={async () => {
                      const ok = await confirm({
                        title: `Remove “${it.name}”?`,
                        message: `It will be deleted from ${group.name}. This can’t be undone.`,
                        confirmLabel: 'Remove',
                        destructive: true,
                      });
                      if (ok) store.deleteItem(it.id);
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
                  {onCreateSubgroup && (
                    <button
                      onClick={createSubgroup}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-accent-300">
                        <Icon name="folder" width={14} height={14} />
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-white">Subgroup</div>
                        <div className="text-[11px] text-ink-400">
                          Nest a folder under this group.
                        </div>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={createText}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-accent-300">
                      <Icon name="text" width={14} height={14} />
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-white">Text</div>
                      <div className="text-[11px] text-ink-400">
                        A titled note or quote to keep here.
                      </div>
                    </div>
                  </button>
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
          {active &&
            (() => {
              const isFav = favorites.isFavorite('item', active.id);
              return (
                <button
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition ${
                    isFav
                      ? 'border-amber-300/40 bg-amber-300/10 text-amber-200 hover:bg-amber-300/15'
                      : 'border-white/10 bg-white/[0.03] text-ink-200 hover:bg-white/[0.07] hover:text-amber-300'
                  }`}
                  onClick={() => toggleItemFavorite(active.id)}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Icon
                    name={isFav ? 'star-filled' : 'star'}
                    width={13}
                    height={13}
                  />
                  <span className="hidden md:inline">
                    {isFav ? 'Favorited' : 'Favorite'}
                  </span>
                </button>
              );
            })()}
          {active && active.kind === 'quote' && (
            <button
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-ink-200 transition hover:bg-white/[0.07]"
              onClick={() => setEditingQuote(active)}
              title="Edit this text"
            >
              <Icon name="edit" width={13} height={13} />
              <span className="hidden md:inline">Edit</span>
            </button>
          )}
          {active && isFileItem(active) && (
            <button
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-ink-200 transition hover:bg-white/[0.07]"
              onClick={async () => {
                try {
                  await runNativeAppAction(active);
                } catch (err) {
                  console.error('Open failed:', err);
                }
              }}
              title={getNativeAppAction(active).label}
            >
              <Icon name="upload" width={13} height={13} className="rotate-180" />
              <span className="hidden md:inline">{getNativeAppAction(active).label}</span>
            </button>
          )}
          {active && (
            <button
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-ink-300 transition hover:bg-red-500/15 hover:text-red-300"
              onClick={async () => {
                const title =
                  active.kind === 'quote' ? 'Remove this quote?' : `Remove “${active.name}”?`;
                const ok = await confirm({
                  title,
                  message: 'This can’t be undone.',
                  confirmLabel: 'Remove',
                  destructive: true,
                });
                if (ok) store.deleteItem(active.id);
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
            <div className="h-full w-full min-w-0">
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

      <TextFormModal
        open={textModalOpen}
        mode="create"
        contextLabel={`Inside ${group.name}`}
        onClose={() => setTextModalOpen(false)}
        onSubmit={async (title, body, source) => {
          const created = await store.addQuote(body, target, source, title);
          store.setActiveItem(group.id, created.id);
          setTextModalOpen(false);
        }}
      />

      <TextFormModal
        open={!!editingQuote}
        mode="edit"
        initial={
          editingQuote
            ? {
                title: editingQuote.name,
                body: editingQuote.text,
                source: editingQuote.source,
              }
            : undefined
        }
        contextLabel={`Inside ${group.name}`}
        onClose={() => setEditingQuote(null)}
        onSubmit={(title, body, source) => {
          if (!editingQuote) return;
          store.updateQuote(editingQuote.id, {
            name: title,
            text: body,
            source: source ?? '',
          });
          setEditingQuote(null);
        }}
      />
    </div>
  );
}

function GroupHeader({
  group,
  subtitle,
  breadcrumb,
}: {
  group: GroupT;
  subtitle: string;
  breadcrumb?: string[];
}) {
  return (
    <div className="border-b border-white/5 bg-black/20 px-3 pb-2 pt-3 md:px-5 md:pb-3 md:pt-4">
      <div className="flex items-center gap-1.5 truncate text-xs text-ink-400">
        <Icon name="folder" width={12} height={12} className="shrink-0" />
        {breadcrumb && breadcrumb.length > 0 ? (
          <span className="truncate">
            {breadcrumb.map((name, i) => (
              <span key={i}>
                {i > 0 && <span className="px-1 text-ink-600">›</span>}
                <span className="text-ink-400">{name}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="hidden md:inline">Group</span>
        )}
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
  isFavorite,
  onSelect,
  onToggleFavorite,
  onDelete,
}: {
  item: Item;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
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
        className={`rounded-md p-1 transition hover:bg-white/10 ${
          isFavorite
            ? 'text-amber-300 opacity-100'
            : 'text-ink-400 opacity-0 hover:text-amber-300 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={
          isFavorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`
        }
      >
        <Icon
          name={isFavorite ? 'star-filled' : 'star'}
          width={13}
          height={13}
        />
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
    </div>
  );
}
