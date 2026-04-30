import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import type { GroupT } from '../lib/types';

interface GroupFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: GroupT | null;
  contextLabel?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function GroupFormModal({
  open,
  mode,
  initial,
  contextLabel,
  onClose,
  onSubmit,
}: GroupFormModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(mode === 'edit' && initial ? initial.name : '');
  }, [open, mode, initial]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New group' : 'Rename group'}
      subtitle={contextLabel ?? undefined}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={
              !name.trim() ||
              (mode === 'edit' && !!initial && name.trim() === initial.name)
            }
            onClick={() => onSubmit(name.trim())}
          >
            <Icon name="check" width={14} height={14} />
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </>
      }
    >
      <div>
        <div className="label">Group name</div>
        <input
          autoFocus
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Reports, Lecture Notes, Travel"
        />
      </div>
    </Modal>
  );
}
