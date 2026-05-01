import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { GroupView } from './GroupView';
import { Icon } from './Icon';
import type { GroupT } from '../lib/types';
import { GroupFormModal } from './GroupFormModal';
import { useReorderable, type DragOverState } from '../lib/reorder';
import { useIsMobile } from '../lib/useMediaQuery';
import { useUploader } from './UploaderContext';

export function Workspace() {
  const store = useStore();
  const isMobile = useIsMobile();
  const active = store.locations.find((l) => l.id === store.activeLocationId);
  const groups = useMemo(
    () => (active ? store.groupsInLocation(active.id) : []),
    [active, store],
  );
  const [editingGroup, setEditingGroup] = useState<GroupT | null>(null);
  const storedActiveGroupId = active
    ? store.activeGroupByLocation[active.id]
    : undefined;

  const groupReorder = useReorderable<GroupT>({
    items: groups,
    onReorder: (orderedIds) => {
      if (active) store.reorderGroups(active.id, orderedIds);
    },
    mimeType: 'application/x-docigo-group',
  });

  const currentGroupId =
    storedActiveGroupId && groups.find((g) => g.id === storedActiveGroupId)
      ? storedActiveGroupId
      : groups[0]?.id ?? null;
  const currentGroup = groups.find((g) => g.id === currentGroupId) ?? null;
  const setActiveGroupId = (id: string) => {
    if (active) store.setActiveGroup(active.id, id);
  };

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-ink-400">
        Pick a location to get started.
      </div>
    );
  }

  const onDeleteGroup = (g: GroupT) => {
    const count = store.itemsInGroup(g.id).length;
    if (
      confirm(
        count
          ? `Delete group “${g.name}” and remove its ${count} item${count === 1 ? '' : 's'}?`
          : `Delete group “${g.name}”?`,
      )
    ) {
      store.deleteGroup(g.id);
    }
  };

  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/5 bg-black/20 px-3 py-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Groups
          </span>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
            {groups.map((g) => {
              const isActive = g.id === currentGroupId;
              const count = store.itemsInGroup(g.id).length;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveGroupId(g.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                    isActive
                      ? 'border-accent-500/60 bg-accent-500/15 text-white'
                      : 'border-white/10 bg-white/[0.02] text-ink-200'
                  }`}
                >
                  <Icon name="folder" width={11} height={11} />
                  <span className="max-w-[120px] truncate">{g.name}</span>
                  <span className="text-[10px] text-ink-400">{count}</span>
                </button>
              );
            })}
            {groups.length === 0 && (
              <span className="text-xs text-ink-400">No groups yet.</span>
            )}
          </div>
          {currentGroup && (
            <button
              onClick={() => setEditingGroup(currentGroup)}
              className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white"
              aria-label="Rename current group"
              title="Rename group"
            >
              <Icon name="edit" width={14} height={14} />
            </button>
          )}
        </div>
        <main className="min-h-0 flex-1">
          {currentGroup ? (
            <GroupView group={currentGroup} />
          ) : (
            <EmptyLocation locName={active.name} />
          )}
        </main>
        <GroupFormModal
          open={!!editingGroup}
          mode="edit"
          initial={editingGroup}
          contextLabel={active ? `Inside ${active.name}` : undefined}
          onClose={() => setEditingGroup(null)}
          onSubmit={(name) => {
            if (editingGroup) store.renameGroup(editingGroup.id, name);
            setEditingGroup(null);
          }}
        />
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
              dragBind={groupReorder.bind(g.id)}
              isDragging={groupReorder.draggingId === g.id}
              dragOver={
                groupReorder.overState && groupReorder.overState.id === g.id
                  ? groupReorder.overState
                  : null
              }
              onSelect={() => setActiveGroupId(g.id)}
              onEdit={() => setEditingGroup(g)}
              onDelete={() => onDeleteGroup(g)}
            />
          ))}
        </div>
      </aside>
      <main className="min-h-0">
        {currentGroup ? <GroupView group={currentGroup} /> : <EmptyLocation locName={active.name} />}
      </main>
      <GroupFormModal
        open={!!editingGroup}
        mode="edit"
        initial={editingGroup}
        contextLabel={active ? `Inside ${active.name}` : undefined}
        onClose={() => setEditingGroup(null)}
        onSubmit={(name) => {
          if (editingGroup) store.renameGroup(editingGroup.id, name);
          setEditingGroup(null);
        }}
      />
    </div>
  );
}

function GroupRow({
  group,
  isActive,
  count,
  dragBind,
  isDragging,
  dragOver,
  onSelect,
  onEdit,
  onDelete,
}: {
  group: GroupT;
  isActive: boolean;
  count: number;
  dragBind: React.HTMLAttributes<HTMLElement> & { draggable?: boolean };
  isDragging: boolean;
  dragOver: DragOverState | null;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const indicator = dragOver && !isDragging ? dragOver.pos : null;
  return (
    <div
      {...dragBind}
      className={`group relative mb-0.5 flex w-full items-center gap-1 rounded-lg px-1 transition ${
        isDragging ? 'opacity-40' : ''
      } ${
        isActive
          ? 'bg-white/10 text-white'
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
        className="flex w-3 cursor-grab items-center justify-center self-stretch text-ink-500 opacity-0 group-hover:opacity-100 active:cursor-grabbing"
        title="Drag to reorder"
        aria-hidden
      >
        ⋮⋮
      </span>
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
          onEdit();
        }}
        className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
        title="Rename group"
        aria-label={`Rename ${group.name}`}
      >
        <Icon name="edit" width={13} height={13} />
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
  const { pickFiles } = useUploader();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <button
        onClick={pickFiles}
        className="glass mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-ink-200 transition hover:bg-white/[0.06] hover:text-white"
        aria-label="Choose files to upload"
        title="Choose files"
      >
        <Icon name="upload" />
      </button>
      <div className="font-display text-2xl font-bold text-white">
        {locName} is ready.
      </div>
      <div className="mt-2 max-w-md text-sm text-ink-400">
        Tap the upload icon, drop files anywhere on this window, or paste
        text to capture a quote. Docigo will ask which group it should go
        into.
      </div>
    </div>
  );
}
