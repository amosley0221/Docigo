import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { humanSize } from '../lib/files';
import type { Item } from '../lib/types';

interface DuplicateModalProps {
  open: boolean;
  existing: Item | null;
  incoming: { name: string; size: number; mime: string } | null;
  suggestedName: string;
  /**
   * Total file pendings remaining in the queue including the current one.
   * When > 1, the modal exposes "apply this choice to the rest" controls.
   */
  remainingFileCount?: number;
  onCancel: () => void;
  onReplace: (applyToAll: boolean) => void;
  onRename: (newName: string, applyAutoToAll: boolean) => void;
}

export function DuplicateModal({
  open,
  existing,
  incoming,
  suggestedName,
  remainingFileCount = 1,
  onCancel,
  onReplace,
  onRename,
}: DuplicateModalProps) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [applyAll, setApplyAll] = useState(true);

  useEffect(() => {
    if (!open) return;
    setRenaming(false);
    setName(suggestedName);
    setApplyAll(true);
  }, [open, suggestedName]);

  if (!existing || !incoming) return null;

  const showApplyAll = remainingFileCount > 1;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="A file with this name exists"
      subtitle={
        showApplyAll
          ? `1 of ${remainingFileCount} files in this batch already exists.`
          : 'Replace the current file or save this one with a new name.'
      }
      width={520}
      footer={
        renaming ? (
          <>
            <button className="btn-ghost" onClick={() => setRenaming(false)}>
              Back
            </button>
            <button
              className="btn-primary"
              disabled={!name.trim() || name.trim() === existing.name}
              onClick={() => onRename(name.trim(), false)}
            >
              <Icon name="check" width={14} height={14} />
              Save as new
            </button>
          </>
        ) : (
          <>
            <button className="btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-quiet" onClick={() => setRenaming(true)}>
              <Icon name="edit" width={14} height={14} />
              Rename…
            </button>
            {showApplyAll && (
              <button
                className="btn-quiet"
                onClick={() => onRename(suggestedName, true)}
                title="Auto-rename this file and any later collisions in this batch"
              >
                <Icon name="edit" width={14} height={14} />
                Rename all
              </button>
            )}
            <button
              className="btn-primary"
              onClick={() => onReplace(applyAll && showApplyAll)}
            >
              <Icon name="check" width={14} height={14} />
              {showApplyAll && applyAll ? 'Replace all' : 'Replace'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card label="Currently in this group">
            <div className="truncate font-medium text-white">{existing.name}</div>
            <div className="text-xs text-ink-400">
              Saved {new Date(existing.createdAt).toLocaleDateString()}
            </div>
          </Card>
          <Card label="New file" highlight>
            <div className="truncate font-medium text-white">{incoming.name}</div>
            <div className="text-xs text-ink-400">
              {incoming.mime || 'file'} · {humanSize(incoming.size)}
            </div>
          </Card>
        </div>

        {showApplyAll && !renaming && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.05] text-accent-500"
              checked={applyAll}
              onChange={(e) => setApplyAll(e.target.checked)}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">
                Apply Replace to every conflict in this batch
              </div>
              <div className="text-xs text-ink-400">
                Skip this dialog for the remaining {remainingFileCount - 1} file
                {remainingFileCount - 1 === 1 ? '' : 's'}; matching files will
                be replaced. Use “Rename all” instead to auto-rename them.
              </div>
            </div>
          </label>
        )}

        {renaming && (
          <div>
            <div className="label">New name</div>
            <input
              autoFocus
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="mt-1 text-xs text-ink-400">
              Suggested: <span className="text-ink-200">{suggestedName}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Card({
  label,
  highlight,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? 'border-accent-500/40 bg-accent-500/[0.06]'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </div>
      {children}
    </div>
  );
}
