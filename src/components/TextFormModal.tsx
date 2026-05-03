import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';

interface TextFormModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initial?: { title: string; body: string; source?: string };
  contextLabel?: string;
  onClose: () => void;
  onSubmit: (title: string, body: string, source?: string) => void;
}

export function TextFormModal({
  open,
  mode = 'create',
  initial,
  contextLabel,
  onClose,
  onSubmit,
}: TextFormModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setTitle(initial.title);
      setBody(initial.body);
      setSource(initial.source ?? '');
    } else {
      setTitle('');
      setBody('');
      setSource('');
    }
  }, [open, mode, initial]);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const trimmedSource = source.trim();
  const filled = trimmedTitle.length > 0 && trimmedBody.length > 0;
  const unchanged =
    mode === 'edit' &&
    initial !== undefined &&
    trimmedTitle === initial.title.trim() &&
    trimmedBody === initial.body.trim() &&
    trimmedSource === (initial.source ?? '').trim();
  const canSubmit = filled && !unchanged;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New text' : 'Edit text'}
      subtitle={contextLabel}
      width={560}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit(
                trimmedTitle,
                trimmedBody,
                trimmedSource.length > 0 ? trimmedSource : undefined,
              )
            }
          >
            <Icon name="check" width={14} height={14} />
            {mode === 'create' ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="label">Title</div>
          <input
            autoFocus
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lecture summary, Favorite passage"
            maxLength={120}
          />
        </div>
        <div>
          <div className="label">Text</div>
          <textarea
            className="input min-h-[200px] resize-y leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type or paste a quote, note, or block of text…"
          />
        </div>
        <div>
          <div className="label">Source (optional)</div>
          <input
            className="input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Atomic Habits, ch. 4 · or a URL"
            maxLength={200}
          />
        </div>
      </div>
    </Modal>
  );
}
