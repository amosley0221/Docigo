import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { GroupView } from './GroupView';
import { Icon } from './Icon';
import type { GroupT } from '../lib/types';
import { GroupFormModal } from './GroupFormModal';
import { useReorderable, type DragOverState } from '../lib/reorder';
import { useIsMobile } from '../lib/useMediaQuery';
import { useUploader } from './UploaderContext';
import { useConfirm } from './ConfirmProvider';

interface NewGroupTarget {
  /** Null = create a top-level group under the active location. */
  parentGroupId: string | null;
}

export function Workspace() {
  const store = useStore();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const active = store.locations.find((l) => l.id === store.activeLocationId);

  const allGroupsInLocation = useMemo(
    () => (active ? store.groups.filter((g) => g.locationId === active.id) : []),
    [active, store.groups],
  );
  const topGroups = useMemo(
    () => (active ? store.groupsInLocation(active.id) : []),
    [active, store],
  );

  const [editingGroup, setEditingGroup] = useState<GroupT | null>(null);
  const [newGroup, setNewGroup] = useState<NewGroupTarget | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const storedActiveGroupId = active
    ? store.activeGroupByLocation[active.id]
    : undefined;

  // The active group can be at any depth; look it up across the whole
  // in-location list, falling back to the first top-level group if the
  // stored id is stale or unset.
  const currentGroupId =
    storedActiveGroupId &&
    allGroupsInLocation.find((g) => g.id === storedActiveGroupId)
      ? storedActiveGroupId
      : topGroups[0]?.id ?? null;
  const currentGroup =
    allGroupsInLocation.find((g) => g.id === currentGroupId) ?? null;

  const setActiveGroupId = (id: string) => {
    if (active) store.setActiveGroup(active.id, id);
  };

  // Auto-expand ancestors of the active group so the tree highlights it.
  useEffect(() => {
    if (!currentGroup) return;
    setExpanded((prev) => {
      const next = { ...prev };
      let cursor: GroupT | undefined = currentGroup;
      while (cursor?.parentGroupId) {
        next[cursor.parentGroupId] = true;
        cursor = allGroupsInLocation.find((g) => g.id === cursor!.parentGroupId);
      }
      return next;
    });
  }, [currentGroup?.id, allGroupsInLocation]);

  const onDeleteGroup = async (g: GroupT) => {
    const childCount = allGroupsInLocation.filter(
      (x) => x.parentGroupId === g.id,
    ).length;
    const itemCount = store.itemsInGroup(g.id).length;
    const detail =
      childCount === 0 && itemCount === 0
        ? 'This group is empty.'
        : `This will also remove ${childCount} subgroup${childCount === 1 ? '' : 's'} and ${itemCount} item${itemCount === 1 ? '' : 's'}.`;
    const ok = await confirm({
      title: `Delete “${g.name}”?`,
      message: detail,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) store.deleteGroup(g.id);
  };

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-ink-400">
        Pick a location to get started.
      </div>
    );
  }

  const formModals = (
    <>
      <GroupFormModal
        open={!!editingGroup}
        mode="edit"
        initial={editingGroup}
        contextLabel={contextLabelFor(editingGroup, allGroupsInLocation, active.name)}
        onClose={() => setEditingGroup(null)}
        onSubmit={(name) => {
          if (editingGroup) store.renameGroup(editingGroup.id, name);
          setEditingGroup(null);
        }}
      />
      <GroupFormModal
        open={!!newGroup}
        mode="create"
        contextLabel={
          newGroup?.parentGroupId
            ? `Inside ${allGroupsInLocation.find((g) => g.id === newGroup.parentGroupId)?.name ?? '…'}`
            : `Inside ${active.name}`
        }
        onClose={() => setNewGroup(null)}
        onSubmit={async (name) => {
          if (!newGroup) return;
          const g = await store.addGroup(active.id, name, newGroup.parentGroupId);
          if (newGroup.parentGroupId) {
            setExpanded((prev) => ({ ...prev, [newGroup.parentGroupId!]: true }));
          }
          store.setActiveGroup(active.id, g.id);
          setNewGroup(null);
        }}
      />
    </>
  );

  if (isMobile) {
    // On mobile there's no chevron UI to expand subgroups, so always show
    // every group in the location regardless of the tree's expanded state.
    const allExpanded: Record<string, boolean> = {};
    for (const g of allGroupsInLocation) allExpanded[g.id] = true;
    const flat = flattenGroups(topGroups, allGroupsInLocation, allExpanded);
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/5 bg-black/20 px-3 py-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Groups
          </span>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
            {flat.length === 0 && (
              <span className="text-xs text-ink-400">No groups yet.</span>
            )}
            {flat.map(({ group, depth, hasChildren }) => {
              const isActive = group.id === currentGroupId;
              const count = store.itemsInGroup(group.id).length;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                    isActive
                      ? 'border-accent-500/60 bg-accent-500/15 text-white'
                      : 'border-white/10 bg-white/[0.02] text-ink-200'
                  }`}
                  style={{ marginLeft: depth * 6 }}
                >
                  <Icon
                    name={hasChildren ? 'folder' : 'folder'}
                    width={11}
                    height={11}
                  />
                  <span className="max-w-[140px] truncate">{group.name}</span>
                  <span className="text-[10px] text-ink-400">{count}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() =>
              setNewGroup({ parentGroupId: currentGroup?.id ?? null })
            }
            className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white"
            aria-label="New group"
            title={
              currentGroup
                ? `New subgroup in ${currentGroup.name}`
                : 'New group'
            }
          >
            <Icon name="plus" width={14} height={14} />
          </button>
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
            <GroupView
              group={currentGroup}
              onCreateSubgroup={() =>
                setNewGroup({ parentGroupId: currentGroup.id })
              }
            />
          ) : (
            <EmptyLocation
              locName={active.name}
              onCreateGroup={() => setNewGroup({ parentGroupId: null })}
            />
          )}
        </main>
        {formModals}
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-r border-white/5 bg-black/20">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              {active.name}
            </div>
            <div className="mt-0.5 font-display text-base font-semibold text-white">
              Groups
            </div>
          </div>
          <button
            onClick={() => setNewGroup({ parentGroupId: null })}
            className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white"
            title="New group"
            aria-label="New group"
          >
            <Icon name="plus" width={14} height={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {topGroups.length === 0 && (
            <div className="px-2 py-2 text-xs text-ink-400">
              No groups yet — drop a file or click “+” to add one.
            </div>
          )}
          <GroupTree
            parentId={null}
            groups={allGroupsInLocation}
            currentId={currentGroupId}
            expanded={expanded}
            setExpanded={setExpanded}
            depth={0}
            onSelect={(id) => setActiveGroupId(id)}
            onAddChild={(parentId) => setNewGroup({ parentGroupId: parentId })}
            onEdit={(g) => setEditingGroup(g)}
            onDelete={onDeleteGroup}
            store={store}
          />
        </div>
      </aside>
      <main className="min-h-0 min-w-0">
        {currentGroup ? (
          <GroupView
            group={currentGroup}
            onCreateSubgroup={() =>
              setNewGroup({ parentGroupId: currentGroup.id })
            }
          />
        ) : (
          <EmptyLocation
            locName={active.name}
            onCreateGroup={() => setNewGroup({ parentGroupId: null })}
          />
        )}
      </main>
      {formModals}
    </div>
  );
}

function contextLabelFor(
  g: GroupT | null,
  all: GroupT[],
  locationName: string,
): string | undefined {
  if (!g) return undefined;
  const path: string[] = [];
  let cursor: GroupT | undefined = g;
  while (cursor?.parentGroupId) {
    const p = all.find((x) => x.id === cursor!.parentGroupId);
    if (!p) break;
    path.unshift(p.name);
    cursor = p;
  }
  if (path.length === 0) return `Inside ${locationName}`;
  return `Inside ${locationName} › ${path.join(' › ')}`;
}

interface FlatRow {
  group: GroupT;
  depth: number;
  hasChildren: boolean;
}

/** Depth-first flatten that respects the expanded map. */
function flattenGroups(
  topGroups: GroupT[],
  all: GroupT[],
  expanded: Record<string, boolean>,
): FlatRow[] {
  const out: FlatRow[] = [];
  const walk = (group: GroupT, depth: number) => {
    const children = all.filter((g) => g.parentGroupId === group.id);
    out.push({ group, depth, hasChildren: children.length > 0 });
    if (children.length && expanded[group.id]) {
      for (const c of children) walk(c, depth + 1);
    }
  };
  for (const g of topGroups) walk(g, 0);
  return out;
}

function GroupTree({
  parentId,
  groups,
  currentId,
  expanded,
  setExpanded,
  depth,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  store,
}: {
  parentId: string | null;
  groups: GroupT[];
  currentId: string | null;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  depth: number;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (g: GroupT) => void;
  onDelete: (g: GroupT) => void;
  store: ReturnType<typeof useStore>;
}) {
  const siblings = groups.filter((g) => (g.parentGroupId ?? null) === parentId);
  const reorder = useReorderable<GroupT>({
    items: siblings,
    onReorder: (orderedIds) => store.reorderGroups(orderedIds),
    mimeType: 'application/x-docigo-group',
  });

  if (siblings.length === 0) return null;

  return (
    <>
      {siblings.map((g) => {
        const childCount = groups.filter((x) => x.parentGroupId === g.id).length;
        const itemCount = store.itemsInGroup(g.id).length;
        const isExpanded = !!expanded[g.id];
        const isActive = g.id === currentId;
        const dragOver =
          reorder.overState && reorder.overState.id === g.id
            ? reorder.overState
            : null;
        const isDragging = reorder.draggingId === g.id;
        return (
          <div key={g.id}>
            <GroupTreeRow
              group={g}
              depth={depth}
              hasChildren={childCount > 0}
              isExpanded={isExpanded}
              isActive={isActive}
              itemCount={itemCount}
              dragBind={reorder.bind(g.id)}
              isDragging={isDragging}
              dragOver={dragOver}
              onToggle={() =>
                setExpanded((prev) => ({ ...prev, [g.id]: !prev[g.id] }))
              }
              onSelect={() => onSelect(g.id)}
              onAddChild={() => onAddChild(g.id)}
              onEdit={() => onEdit(g)}
              onDelete={() => onDelete(g)}
            />
            {isExpanded && childCount > 0 && (
              <GroupTree
                parentId={g.id}
                groups={groups}
                currentId={currentId}
                expanded={expanded}
                setExpanded={setExpanded}
                depth={depth + 1}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                store={store}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function GroupTreeRow({
  group,
  depth,
  hasChildren,
  isExpanded,
  isActive,
  itemCount,
  dragBind,
  isDragging,
  dragOver,
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
}: {
  group: GroupT;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isActive: boolean;
  itemCount: number;
  dragBind: React.HTMLAttributes<HTMLElement> & { draggable?: boolean };
  isDragging: boolean;
  dragOver: DragOverState | null;
  onToggle: () => void;
  onSelect: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const indicator = dragOver && !isDragging ? dragOver.pos : null;
  return (
    <div
      {...dragBind}
      style={{ paddingLeft: depth * 12 }}
      className={`group relative mb-0.5 flex w-full items-center rounded-lg px-1 transition ${
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-7 w-5 shrink-0 items-center justify-center text-ink-500 transition hover:text-white"
        title={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : ''}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {hasChildren ? (
          <Icon
            name="chevron-right"
            width={12}
            height={12}
            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="block h-1 w-1 rounded-full bg-ink-600" />
        )}
      </button>
      <button
        onClick={onSelect}
        className="flex flex-1 items-center gap-2 px-1 py-2 text-left text-sm"
      >
        <Icon name="folder" width={13} height={13} className="text-ink-400" />
        <span className="flex-1 truncate">{group.name}</span>
        <span className="text-xs text-ink-400">{itemCount}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddChild();
        }}
        className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
        title="New subgroup"
        aria-label={`Add subgroup to ${group.name}`}
      >
        <Icon name="plus" width={12} height={12} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
        title="Rename"
        aria-label={`Rename ${group.name}`}
      >
        <Icon name="edit" width={12} height={12} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
        title="Delete"
        aria-label={`Delete ${group.name}`}
      >
        <Icon name="trash" width={12} height={12} />
      </button>
    </div>
  );
}

function EmptyLocation({
  locName,
  onCreateGroup,
}: {
  locName: string;
  onCreateGroup: () => void;
}) {
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
        Add a group to start, or just drop files / paste text — Docigo will
        ask where it should live.
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button onClick={onCreateGroup} className="btn-primary">
          <Icon name="plus" width={14} height={14} />
          New group
        </button>
        <button onClick={pickFiles} className="btn-quiet">
          <Icon name="upload" width={14} height={14} />
          Choose files
        </button>
      </div>
    </div>
  );
}
