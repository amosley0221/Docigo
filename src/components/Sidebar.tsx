import { useMemo, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { useStore } from '../state/store';
import type { LocationKind, LocationT } from '../lib/types';
import { LocationFormModal } from './LocationFormModal';
import { GroupFormModal } from './GroupFormModal';

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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCollapse: () => void;
}

export function Sidebar({ collapsed, onToggle, onCollapse }: SidebarProps) {
  const store = useStore();
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<LocationT | null>(null);
  const [openGroup, setOpenGroup] = useState(false);

  const active = store.locations.find((l) => l.id === store.activeLocationId) ?? null;

  const groups = useMemo(
    () => (active ? store.groupsInLocation(active.id) : []),
    [active, store],
  );

  if (collapsed) {
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
        {store.locations.map((loc) => {
          const isActive = loc.id === store.activeLocationId;
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
      <aside className="flex h-full w-72 flex-col border-r border-white/5 bg-black/40">
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
              const isActive = loc.id === store.activeLocationId;
              const itemCount = store.items.filter((i) => i.locationId === loc.id).length;
              const groupCount = store.groupsInLocation(loc.id).length;
              return (
                <div
                  key={loc.id}
                  className={`group flex items-center gap-1 rounded-lg pr-1 transition ${
                    isActive
                      ? 'bg-white/10 text-white shadow-soft'
                      : 'text-ink-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <button
                    onClick={() => {
                      store.setActiveLocation(loc.id);
                      onCollapse();
                    }}
                    className="flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm"
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
                    onClick={(e) => {
                      e.stopPropagation();
                      const detail =
                        groupCount === 0 && itemCount === 0
                          ? ''
                          : ` This will also remove ${groupCount} group${
                              groupCount === 1 ? '' : 's'
                            } and ${itemCount} item${itemCount === 1 ? '' : 's'}.`;
                      if (
                        confirm(
                          `Delete location “${loc.name}”?${detail} This can’t be undone.`,
                        )
                      ) {
                        store.deleteLocation(loc.id);
                      }
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
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              {active ? `Groups in ${active.name}` : 'Groups'}
            </div>
            <button
              className="rounded-md p-1 text-ink-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
              onClick={() => setOpenGroup(true)}
              disabled={!active}
              title="New group"
            >
              <Icon name="plus" width={14} height={14} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 pb-3">
            {groups.length === 0 && (
              <div className="px-2 py-2 text-xs text-ink-400">
                No groups yet. Create one or drop a file.
              </div>
            )}
            {groups.map((g) => {
              const count = store.items.filter((i) => i.groupId === g.id).length;
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-200 hover:bg-white/5"
                >
                  <Icon name="folder" width={14} height={14} className="text-ink-400" />
                  <span className="flex-1 truncate">{g.name}</span>
                  <span className="text-xs text-ink-400">{count}</span>
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

      <GroupFormModal
        open={openGroup}
        mode="create"
        contextLabel={active ? `Inside ${active.name}` : undefined}
        onClose={() => setOpenGroup(false)}
        onSubmit={(name) => {
          if (!active) return;
          store.addGroup(active.id, name);
          setOpenGroup(false);
        }}
      />
    </>
  );
}
