import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { classifyFile, humanSize } from '../lib/files';
import type { ItemKind } from '../lib/types';

export interface PendingFile {
  kind: 'file';
  file: File;
  itemKind: ItemKind;
  preview?: string;
}

export interface PendingQuote {
  kind: 'quote';
  text: string;
  preview: string;
}

export type Pending = PendingFile | PendingQuote;

interface AssignModalProps {
  open: boolean;
  pending: Pending | null;
  /** Number of file pendings remaining in the queue, including the current one. */
  fileQueueLength?: number;
  onClose: () => void;
  onAssign: (
    target: { locationId: string; groupId: string },
    options?: { applyToAll?: boolean },
  ) => void;
}

export function AssignModal({
  open,
  pending,
  fileQueueLength = 1,
  onClose,
  onAssign,
}: AssignModalProps) {
  const store = useStore();
  const [locationId, setLocationId] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(
    () => (locationId ? store.groupsInLocation(locationId) : []),
    [locationId, store],
  );

  useEffect(() => {
    if (!open) return;
    const initialLoc = store.activeLocationId ?? store.locations[0]?.id ?? '';
    setLocationId(initialLoc);
    const firstGroup = initialLoc
      ? store.groupsInLocation(initialLoc)[0]?.id ?? ''
      : '';
    setGroupId(firstGroup);
    setCreatingGroup(false);
    setNewGroupName('');
    setApplyToAll(true);
    setBusy(false);
  }, [open, store]);

  useEffect(() => {
    if (!locationId) return;
    const list = store.groupsInLocation(locationId);
    if (!list.find((g) => g.id === groupId)) {
      setGroupId(list[0]?.id ?? '');
      setCreatingGroup(list.length === 0);
    }
  }, [locationId, store, groupId]);

  if (!pending) return null;

  const isFile = pending.kind === 'file';
  const showBatch = isFile && fileQueueLength > 1;
  const title = showBatch
    ? `Organize ${fileQueueLength} files`
    : isFile
      ? 'Organize this file'
      : 'Save this quote';
  const subtitle = showBatch
    ? 'Pick one place for all of them, or save just this file.'
    : isFile
      ? 'Choose where it lives so you can find it later.'
      : 'Pick a location and group for the quote.';

  const canSubmit =
    !!locationId && (!!groupId || (creatingGroup && newGroupName.trim().length > 0));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      width={520}
      footer={
        <>
          <button className="btn-ghost" disabled={busy} onClick={onClose}>
            Skip
          </button>
          <button
            className="btn-primary"
            disabled={!canSubmit || busy}
            onClick={async () => {
              setBusy(true);
              try {
                let gid = groupId;
                if (creatingGroup && newGroupName.trim()) {
                  const g = await store.addGroup(
                    locationId,
                    newGroupName.trim(),
                  );
                  gid = g.id;
                }
                if (!gid) return;
                onAssign(
                  { locationId, groupId: gid },
                  { applyToAll: showBatch && applyToAll },
                );
              } finally {
                // The modal will close on success, but reset just in case it
                // stays open (e.g., a duplicate prompt fires).
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Uploading…
              </>
            ) : (
              <>
                <Icon name="check" width={14} height={14} />
                {showBatch && applyToAll
                  ? `Save all ${fileQueueLength} files`
                  : isFile
                    ? 'Save file'
                    : 'Save quote'}
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-ink-200">
            <Icon name={pending.kind === 'quote' ? 'quote' : iconForKind(pending.itemKind)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-white">
              {pending.kind === 'file' ? pending.file.name : 'New quote'}
            </div>
            <div className="text-xs text-ink-400">
              {pending.kind === 'file'
                ? `${pending.file.type || 'file'} · ${humanSize(pending.file.size)}`
                : `${pending.text.length} characters`}
            </div>
            {pending.kind === 'quote' && (
              <div className="mt-2 max-h-24 overflow-hidden text-ellipsis text-sm italic text-ink-300">
                “{pending.preview}”
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="label">Location</div>
          <div className="grid grid-cols-2 gap-2">
            {store.locations.map((l) => (
              <button
                key={l.id}
                onClick={() => setLocationId(l.id)}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                  l.id === locationId
                    ? 'border-accent-500 bg-accent-500/15 text-white'
                    : 'border-white/10 bg-white/[0.02] text-ink-200 hover:border-white/20'
                }`}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md"
                  style={{ background: `${l.color}1f`, color: l.color }}
                >
                  <Icon name="folder" width={14} height={14} />
                </span>
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="label mb-0">Group</div>
            <button
              className="text-xs text-accent-300 hover:text-accent-200"
              onClick={() => {
                setCreatingGroup((v) => !v);
                setNewGroupName('');
              }}
            >
              {creatingGroup ? 'Pick existing' : '+ New group'}
            </button>
          </div>
          {creatingGroup || groups.length === 0 ? (
            <input
              autoFocus
              className="input"
              placeholder="Group name (e.g. Reports)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    g.id === groupId
                      ? 'border-accent-500 bg-accent-500/15 text-white'
                      : 'border-white/10 bg-white/[0.02] text-ink-200 hover:border-white/20'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {showBatch && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.05] text-accent-500"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">
                Apply to all {fileQueueLength} files
              </div>
              <div className="text-xs text-ink-400">
                Save every file you just dropped to this location and group.
                Uncheck to organize them one at a time.
              </div>
            </div>
          </label>
        )}
      </div>
    </Modal>
  );
}

function iconForKind(k: ItemKind) {
  switch (k) {
    case 'spreadsheet':
      return 'sheet' as const;
    case 'document':
      return 'doc' as const;
    case 'pdf':
      return 'pdf' as const;
    case 'image':
      return 'image' as const;
    case 'text':
      return 'text' as const;
    case 'quote':
      return 'quote' as const;
    default:
      return 'folder' as const;
  }
}

export function inferPendingFromFile(file: File): PendingFile {
  return { kind: 'file', file, itemKind: classifyFile(file) };
}
