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
  onCancel: () => void;
  onReplace: () => void;
  onRename: (newName: string) => void;
}

export function DuplicateModal({
  open,
  existing,
  incoming,
  suggestedName,
  onCancel,
  onReplace,
  onRename,
}: DuplicateModalProps) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(suggestedName);

  useEffect(() => {
    if (!open) return;
    setRenaming(false);
    setName(suggestedName);
  }, [open, suggestedName]);

  if (!existing || !incoming) return null;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="A file with this name exists"
      subtitle="Replace the current file or save this one with a new name."
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
              onClick={() => onRename(name.trim())}
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
            <button className="btn-primary" onClick={onReplace}>
              <Icon name="check" width={14} height={14} />
              Replace
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
