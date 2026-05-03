import { useMemo, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { useStore } from '../state/store';
import type {
  GroupT,
  Item,
  ItemKind,
  LocationKind,
  LocationT,
} from '../lib/types';
import { LocationFormModal } from './LocationFormModal';
import { useReorderable } from '../lib/reorder';
import { useIsMobile } from '../lib/useMediaQuery';
import { useConfirm } from './ConfirmProvider';
import { useFavorites } from '../state/favorites';

const KIND_ICON: Record<LocationKind, IconName> = {
  work: 'briefcase',
  school: 'graduation',
  personal: 'home',
  project: 'spark',
  custom: 'folder',
};

const KIND_LABEL: Record<LocationKind, string> = {
  work: 'Work',
  school: 'School',
  personal: 'Personal',
  project: 'Project',
  custom: 'Other',
};

const ITEM_KIND_ICON: Record<ItemKind, IconName> = {
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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCollapse: () => void;
}

export function Sidebar({ collapsed, onToggle, onCollapse }: SidebarProps) {
  const store = useStore();
  const favorites = useFavorites();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<LocationT | null>(null);

  const locReorder = useReorderable({
    items: store.locations,
    onReorder: store.reorderLocations,
    mimeType: 'application/x-docigo-location',
  });

  const resolvedFavorites = useMemo(() => {
    const groupById = new Map(store.groups.map((g) => [g.id, g]));
    const itemById = new Map(store.items.map((i) => [i.id, i]));
    return favorites.favorites
      .map((f) => {
        if (f.kind === 'group') {
          const g = groupById.get(f.id);
          return g ? ({ kind: 'group' as const, group: g } as const) : null;
        }
        const item = itemById.get(f.id);
        return item ? ({ kind: 'item' as const, item } as const) : null;
      })
      .filter(
        (
          x,
        ): x is
          | { kind: 'group'; group: GroupT }
          | { kind: 'item'; item: Item } => x !== null,
      );
  }, [favorites.favorites, store.groups, store.items]);

  const openGroup = (g: GroupT) => {
    store.setActiveLocation(g.locationId);
    store.setActiveGroup(g.locationId, g.id);
    onCollapse();
  };

  const openItem = (item: Item) => {
    store.setActiveLocation(item.locationId);
    store.setActiveGroup(item.locationId, item.groupId);
    store.setActiveItem(item.groupId, item.id);
    onCollapse();
  };

  if (collapsed) {
    // On mobile a collapsed sidebar disappears entirely (the top-bar menu
    // button is the entry point). On desktop it stays as a slim icon rail.
    if (isMobile) return null;
    return (
      <aside className="flex h-full w-14 flex-col items-center gap-1 border-r border-white/5 bg-black/40 py-3">
        <button
          className="rounded-lg p-2 text-ink-200 hover:bg-white/10 hover:text-white"
          onClick={onToggle}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <Icon name="menu" />
        </button>
        <div className="my-2 h-px w-8 bg-white/5" />
        <button
          onClick={() => store.goHome()}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
            store.viewMode === 'home'
              ? 'bg-white/10 text-white'
              : 'text-ink-300 hover:bg-white/5'
          }`}
          title="Home"
          aria-label="Home"
        >
          <Icon name="home" />
        </button>
        {store.locations.map((loc) => {
          const isActive =
            store.viewMode === 'location' && loc.id === store.activeLocationId;
          return (
            <button
              key={loc.id}
              onClick={() => store.setActiveLocation(loc.id)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition ${
                isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5'
              }`}
              title={loc.name}
            >
              <span
                className="absolute -left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r"
                style={{ background: isActive ? loc.color : 'transparent' }}
              />
              <Icon name={KIND_ICON[loc.kind]} />
            </button>
          );
        })}
        <button
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-white/5 hover:text-white"
          onClick={() => setOpenCreate(true)}
          title="New location"
        >
          <Icon name="plus" />
        </button>
      </aside>
    );
  }

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCollapse}
          aria-hidden
        />
      )}
      <aside
        className={
          isMobile
            ? 'safe-top safe-bottom fixed inset-y-0 left-0 z-50 flex h-full w-[85%] max-w-[320px] flex-col border-r border-white/5 bg-ink-950/95 shadow-glow'
            : 'flex h-full w-72 flex-col border-r border-white/5 bg-black/40'
        }
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <Icon name="logo" />
            <div className="font-display text-lg font-bold tracking-tight text-white">
              Docigo
            </div>
          </div>
          <button
            className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse"
          >
            <Icon name="menu" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => {
              store.goHome();
              onCollapse();
            }}
            className={`mb-2 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
              store.viewMode === 'home'
                ? 'bg-white/10 text-white shadow-soft'
                : 'text-ink-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-500/30 to-fuchsia-500/30 text-accent-200 ring-1 ring-accent-500/30">
              <Icon name="home" width={14} height={14} />
            </span>
            <span className="flex-1 truncate font-medium">Home</span>
          </button>
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Locations
            </div>
            <button
              className="rounded-md p-1 text-ink-300 hover:bg-white/10 hover:text-white"
              onClick={() => setOpenCreate(true)}
              title="New location"
            >
              <Icon name="plus" width={14} height={14} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {store.locations.map((loc) => {
              const isActive =
            store.viewMode === 'location' && loc.id === store.activeLocationId;
              const itemCount = store.items.filter((i) => i.locationId === loc.id).length;
              // Count every group/subgroup under this location for the
              // cascade-delete prompt, not just the top-level ones.
              const groupCount = store.groups.filter((g) => g.locationId === loc.id).length;
              const isDragging = locReorder.draggingId === loc.id;
              const indicator =
                locReorder.overState?.id === loc.id && locReorder.draggingId !== loc.id
                  ? locReorder.overState.pos
                  : null;
              return (
                <div
                  key={loc.id}
                  {...locReorder.bind(loc.id)}
                  className={`group relative flex items-center gap-1 rounded-lg pr-1 transition ${
                    isDragging ? 'opacity-40' : ''
                  } ${
                    isActive
                      ? 'bg-white/10 text-white shadow-soft'
                      : 'text-ink-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {indicator && (
                    <span
                      className={`pointer-events-none absolute left-0 right-0 h-0.5 rounded bg-accent-400 ${
                        indicator === 'before' ? 'top-0' : 'bottom-0'
                      }`}
                    />
                  )}
                  <span
                    {...locReorder.handle(loc.id)}
                    className={`flex h-9 cursor-grab items-center justify-center text-ink-500 active:cursor-grabbing ${
                      locReorder.needsHandle
                        ? 'w-7 px-1.5 text-ink-300'
                        : 'w-3 opacity-0 group-hover:opacity-100'
                    }`}
                    title="Drag to reorder"
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                  <button
                    onClick={() => {
                      store.setActiveLocation(loc.id);
                      onCollapse();
                    }}
                    className="flex flex-1 items-center gap-2.5 rounded-lg pl-1 pr-2.5 py-2 text-left text-sm"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{
                        background: `${loc.color}1f`,
                        color: loc.color,
                        boxShadow: isActive ? `inset 0 0 0 1px ${loc.color}66` : undefined,
                      }}
                    >
                      <Icon name={KIND_ICON[loc.kind]} width={15} height={15} />
                    </span>
                    <span className="flex-1 truncate font-medium">{loc.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-ink-400">
                      {KIND_LABEL[loc.kind]}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(loc);
                    }}
                    className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    title="Edit location"
                    aria-label={`Edit ${loc.name}`}
                  >
                    <Icon name="edit" width={13} height={13} />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const detail =
                        groupCount === 0 && itemCount === 0
                          ? ''
                          : ` This will also remove ${groupCount} group${
                              groupCount === 1 ? '' : 's'
                            } and ${itemCount} item${itemCount === 1 ? '' : 's'}.`;
                      const ok = await confirm({
                        title: `Delete “${loc.name}”?`,
                        message: `This can’t be undone.${detail}`,
                        confirmLabel: 'Delete location',
                        destructive: true,
                      });
                      if (ok) store.deleteLocation(loc.id);
                    }}
                    className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
                    title="Delete location"
                    aria-label={`Delete ${loc.name}`}
                  >
                    <Icon name="trash" width={13} height={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-1 flex-1 overflow-y-auto border-t border-white/5 px-3 pt-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              <Icon name="star" width={11} height={11} />
              Favorites
            </div>
            <span className="text-[10px] tabular-nums text-ink-500">
              {favorites.favorites.length}/{favorites.max}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 pb-3">
            {resolvedFavorites.length === 0 && (
              <div className="px-2 py-2 text-xs leading-snug text-ink-400">
                Tap the star next to a folder or file to pin it here.
              </div>
            )}
            {resolvedFavorites.map((entry) => {
              if (entry.kind === 'group') {
                const g = entry.group;
                const count = store.items.filter((i) => i.groupId === g.id).length;
                const loc = store.locations.find((l) => l.id === g.locationId);
                return (
                  <div
                    key={`group-${g.id}`}
                    className="group/fav flex items-center gap-1 rounded-lg pr-1 text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                  >
                    <button
                      onClick={() => openGroup(g)}
                      className="flex flex-1 items-center gap-2 px-2.5 py-1.5 text-left"
                      title={loc ? `${loc.name} · ${g.name}` : g.name}
                    >
                      <Icon
                        name="folder"
                        width={14}
                        height={14}
                        className="shrink-0 text-ink-400"
                      />
                      <span className="flex-1 truncate">{g.name}</span>
                      <span className="text-xs text-ink-400">{count}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        favorites.toggleFavorite('group', g.id);
                      }}
                      className="rounded-md p-1 text-amber-300 transition hover:bg-white/10"
                      title="Remove from favorites"
                      aria-label={`Unfavorite ${g.name}`}
                    >
                      <Icon name="star-filled" width={13} height={13} />
                    </button>
                  </div>
                );
              }
              const item = entry.item;
              const loc = store.locations.find((l) => l.id === item.locationId);
              return (
                <div
                  key={`item-${item.id}`}
                  className="group/fav flex items-center gap-1 rounded-lg pr-1 text-sm text-ink-200 hover:bg-white/5 hover:text-white"
                >
                  <button
                    onClick={() => openItem(item)}
                    className="flex flex-1 items-center gap-2 px-2.5 py-1.5 text-left"
                    title={loc ? `${loc.name} · ${item.name}` : item.name}
                  >
                    <Icon
                      name={ITEM_KIND_ICON[item.kind]}
                      width={14}
                      height={14}
                      className="shrink-0 text-ink-400"
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      favorites.toggleFavorite('item', item.id);
                    }}
                    className="rounded-md p-1 text-amber-300 transition hover:bg-white/10"
                    title="Remove from favorites"
                    aria-label={`Unfavorite ${item.name}`}
                  >
                    <Icon name="star-filled" width={13} height={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/5 px-4 py-3 text-[11px] text-ink-400">
          <div className="flex items-center gap-1.5">
            <Icon name="sparkle" width={12} height={12} />
            Stay in flow.
          </div>
        </div>
      </aside>

      <LocationFormModal
        open={openCreate}
        mode="create"
        onClose={() => setOpenCreate(false)}
        onSubmit={(value) => {
          store.addLocation(value);
          setOpenCreate(false);
        }}
      />

      <LocationFormModal
        open={!!editing}
        mode="edit"
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={(value) => {
          if (editing) store.updateLocation(editing.id, value);
          setEditing(null);
        }}
      />
    </>
  );
}
