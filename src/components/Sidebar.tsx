import { useMemo, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { useStore } from '../state/store';
import type { LocationKind } from '../lib/types';
import { Modal } from './Modal';

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

const PALETTE = [
  '#4361ff',
  '#aa3bff',
  '#ff5e7a',
  '#22b8a6',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#e879f9',
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCollapse: () => void;
}

export function Sidebar({ collapsed, onToggle, onCollapse }: SidebarProps) {
  const store = useStore();
  const [openCreate, setOpenCreate] = useState(false);
  const [openGroup, setOpenGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LocationKind>('work');
  const [color, setColor] = useState(PALETTE[0]);

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
              return (
                <button
                  key={loc.id}
                  onClick={() => {
                    store.setActiveLocation(loc.id);
                    onCollapse();
                  }}
                  className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    isActive
                      ? 'bg-white/10 text-white shadow-soft'
                      : 'text-ink-200 hover:bg-white/5 hover:text-white'
                  }`}
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

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="New location"
        subtitle="Create a workspace for a job, class, or project."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpenCreate(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!name.trim()}
              onClick={() => {
                store.addLocation({ name: name.trim(), kind, color });
                setName('');
                setKind('work');
                setColor(PALETTE[0]);
                setOpenCreate(false);
              }}
            >
              <Icon name="check" width={14} height={14} />
              Create
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="label">Name</div>
            <input
              autoFocus
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Side Job, Bio 201, Travel Plans"
            />
          </div>
          <div>
            <div className="label">Type</div>
            <div className="grid grid-cols-5 gap-2">
              {(['work', 'school', 'personal', 'project', 'custom'] as LocationKind[]).map((k) => (
                <button
                  key={k}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition ${
                    kind === k
                      ? 'border-accent-500 bg-accent-500/15 text-white'
                      : 'border-white/10 bg-white/[0.02] text-ink-200 hover:border-white/20'
                  }`}
                  onClick={() => setKind(k)}
                >
                  <Icon name={KIND_ICON[k]} />
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Accent color</div>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className={`h-7 w-7 rounded-full transition ${
                    color === c ? 'ring-2 ring-white/70' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={openGroup}
        onClose={() => setOpenGroup(false)}
        title="New group"
        subtitle={active ? `Inside ${active.name}` : ''}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpenGroup(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!groupName.trim() || !active}
              onClick={() => {
                if (!active) return;
                store.addGroup(active.id, groupName.trim());
                setGroupName('');
                setOpenGroup(false);
              }}
            >
              <Icon name="check" width={14} height={14} />
              Create
            </button>
          </>
        }
      >
        <div>
          <div className="label">Group name</div>
          <input
            autoFocus
            className="input"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Reports, Lecture Notes, Travel"
          />
        </div>
      </Modal>
    </>
  );
}
