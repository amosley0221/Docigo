import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';

interface TextFormModalProps {
  open: boolean;
  contextLabel?: string;
  onClose: () => void;
  onSubmit: (title: string, body: string, source?: string) => void;
}

export function TextFormModal({
  open,
  contextLabel,
  onClose,
  onSubmit,
}: TextFormModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setBody('');
    setSource('');
  }, [open]);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New text"
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
                title.trim(),
                body.trim(),
                source.trim() || undefined,
              )
            }
          >
            <Icon name="check" width={14} height={14} />
            Add
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
