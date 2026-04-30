import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon, type IconName } from './Icon';
import type { LocationKind, LocationT } from '../lib/types';

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

export interface LocationFormValue {
  name: string;
  kind: LocationKind;
  color: string;
}

interface LocationFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: LocationT | null;
  onClose: () => void;
  onSubmit: (value: LocationFormValue) => void;
}

export function LocationFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: LocationFormModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LocationKind>('work');
  const [color, setColor] = useState(PALETTE[0]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setKind(initial.kind);
      setColor(initial.color);
    } else {
      setName('');
      setKind('work');
      setColor(PALETTE[0]);
    }
  }, [open, mode, initial]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New location' : 'Edit location'}
      subtitle={
        mode === 'create'
          ? 'Create a workspace for a job, class, or project.'
          : 'Update the name, type, or accent color.'
      }
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({ name: name.trim(), kind, color })
            }
          >
            <Icon name="check" width={14} height={14} />
            {mode === 'create' ? 'Create' : 'Save changes'}
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
            {(['work', 'school', 'personal', 'project', 'custom'] as LocationKind[]).map(
              (k) => (
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
              ),
            )}
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
  );
}
