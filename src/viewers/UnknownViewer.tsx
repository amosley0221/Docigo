import type { FileItem } from '../lib/types';
import { Icon } from '../components/Icon';
import { humanSize } from '../lib/files';
import { runNativeAppAction } from '../lib/nativeApp';

interface FileTypeHint {
  /** Headline shown above the message. */
  title: string;
  /** Multi-line explanation. */
  message: string;
  /** Step-by-step action the user can take. */
  steps?: string[];
  /** Override for the Download button label when the typical action
   *  is actually "open in another app". */
  downloadLabel?: string;
}

const POWERPOINT_HINT: FileTypeHint = {
  title: 'PowerPoint files don’t preview in Docigo',
  message:
    'In-browser PowerPoint rendering is unreliable, so we don’t try. Two quick paths:',
  steps: [
    'Export the deck as PDF in PowerPoint (File → Export → PDF) and re-upload — Docigo previews PDFs natively, looks identical.',
    'Or download here and open in PowerPoint with the button below.',
  ],
  downloadLabel: 'Download .pptx',
};

const KEYNOTE_HINT: FileTypeHint = {
  title: 'Keynote files don’t preview in Docigo',
  message:
    'Keynote isn’t a web-friendly format. Easiest fix: export as PDF (File → Export To → PDF) and re-upload.',
  downloadLabel: 'Download .key',
};

const HINTS: Record<string, FileTypeHint> = {
  pptx: POWERPOINT_HINT,
  ppt: POWERPOINT_HINT,
  pptm: POWERPOINT_HINT,
  key: KEYNOTE_HINT,
};

function hintFor(item: FileItem): FileTypeHint | null {
  const name = item.name.toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  return HINTS[ext] ?? null;
}

export function UnknownViewer({ item }: { item: FileItem }) {
  const hint = hintFor(item);

  return (
    <div className="flex h-full items-center justify-center p-6 md:p-8">
      <div className="glass w-full max-w-lg rounded-2xl px-7 py-8 shadow-soft md:px-9 md:py-10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-ink-200">
            <Icon name="folder" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-semibold text-white">
              {item.name}
            </div>
            <div className="mt-0.5 text-xs text-ink-400">
              {item.mime || 'Unknown type'} · {humanSize(item.size)}
            </div>
          </div>
        </div>

        {hint ? (
          <>
            <div className="mt-5 font-display text-base font-semibold text-white">
              {hint.title}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
              {hint.message}
            </p>
            {hint.steps && (
              <ol className="mt-3 space-y-1.5 text-sm text-ink-300">
                {hint.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-accent-200">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="mt-5 text-sm leading-relaxed text-ink-300">
            We can’t preview this file type yet, but it’s safely stored in
            your workspace. Use the button below to download and open it in
            a native app.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              runNativeAppAction(item).catch((err) => console.error(err))
            }
            className="btn-primary"
          >
            <Icon name="upload" width={14} height={14} className="rotate-180" />
            {hint?.downloadLabel ?? 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
