import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { GroupView } from './GroupView';
import { Icon } from './Icon';
import type { GroupT } from '../lib/types';

export function Workspace() {
  const store = useStore();
  const active = store.locations.find((l) => l.id === store.activeLocationId);
  const groups = useMemo(
    () => (active ? store.groupsInLocation(active.id) : []),
    [active, store],
  );
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const currentGroupId =
    activeGroupId && groups.find((g) => g.id === activeGroupId)
      ? activeGroupId
      : groups[0]?.id ?? null;
  const currentGroup = groups.find((g) => g.id === currentGroupId) ?? null;

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-ink-400">
        Pick a location to get started.
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r border-white/5 bg-black/20">
        <div className="px-4 pb-2 pt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            {active.name}
          </div>
          <div className="mt-0.5 font-display text-base font-semibold text-white">
            Groups
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {groups.length === 0 && (
            <div className="px-2 py-2 text-xs text-ink-400">
              No groups yet — drop a file or use the sidebar to add one.
            </div>
          )}
          {groups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              isActive={g.id === currentGroupId}
              count={store.itemsInGroup(g.id).length}
              onSelect={() => setActiveGroupId(g.id)}
              onDelete={() => {
                const count = store.itemsInGroup(g.id).length;
                if (
                  confirm(
                    count
                      ? `Delete group “${g.name}” and remove its ${count} item${count === 1 ? '' : 's'}?`
                      : `Delete group “${g.name}”?`,
                  )
                ) {
                  store.deleteGroup(g.id);
                  if (activeGroupId === g.id) setActiveGroupId(null);
                }
              }}
            />
          ))}
        </div>
      </aside>
      <main className="min-h-0">
        {currentGroup ? <GroupView group={currentGroup} /> : <EmptyLocation locName={active.name} />}
      </main>
    </div>
  );
}

function GroupRow({
  group,
  isActive,
  count,
  onSelect,
  onDelete,
}: {
  group: GroupT;
  isActive: boolean;
  count: number;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group mb-0.5 flex w-full items-center gap-1 rounded-lg px-1 transition ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-ink-200 hover:bg-white/5 hover:text-white'
      }`}
    >
      <button
        onClick={onSelect}
        className="flex flex-1 items-center gap-2 px-1.5 py-2 text-left text-sm"
      >
        <Icon name="folder" width={14} height={14} className="text-ink-400" />
        <span className="flex-1 truncate">{group.name}</span>
        <span className="text-xs text-ink-400">{count}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
        title="Delete group"
        aria-label={`Delete ${group.name}`}
      >
        <Icon name="trash" width={13} height={13} />
      </button>
    </div>
  );
}

function EmptyLocation({ locName }: { locName: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="glass mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-ink-200">
        <Icon name="upload" />
      </div>
      <div className="font-display text-2xl font-bold text-white">
        {locName} is ready.
      </div>
      <div className="mt-2 max-w-md text-sm text-ink-400">
        Drop files (Excel, Word, PDFs, images, text) anywhere on this window, or
        paste text to capture a quote. Docigo will ask which group it should go
        into.
      </div>
    </div>
  );
}
