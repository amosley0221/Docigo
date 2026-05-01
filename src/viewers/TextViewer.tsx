import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { ViewerError, ViewerLoading } from './Status';
import { useHighlight, useHighlightFor } from '../components/HighlightContext';

export function TextViewer({ item }: { item: FileItem }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const highlight = useHighlightFor(item.id);
  const { consume } = useHighlight();
  const firstHitRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
    (async () => {
      try {
        const blob = await getBlob(item.blobKey);
        if (!blob) throw new Error('File data unavailable');
        const t = await blob.text();
        if (!cancelled) setText(t);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to read file');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.blobKey]);

  const isJson = item.name.toLowerCase().endsWith('.json');
  const display = useMemo(
    () => (text === null ? '' : isJson ? safePretty(text) : text),
    [text, isJson],
  );

  // After we render with a highlight, scroll to the first hit and clear.
  useEffect(() => {
    if (!highlight || !text) return;
    const el = firstHitRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    consume(item.id);
  }, [highlight, text, item.id, consume]);

  if (error) return <ViewerError message={error} />;
  if (text === null) return <ViewerLoading label="Reading file…" />;

  return (
    <div className="flex h-full justify-center overflow-auto p-6">
      <div className="glass max-w-4xl flex-1 rounded-2xl px-8 py-8 shadow-soft">
        <pre className="whitespace-pre-wrap break-words font-mono text-[13.5px] leading-relaxed text-ink-100">
          {highlight ? renderHighlighted(display, highlight, firstHitRef) : display}
        </pre>
      </div>
    </div>
  );
}

function renderHighlighted(
  text: string,
  query: string,
  firstRef: React.RefObject<HTMLSpanElement | null>,
) {
  const q = query.toLowerCase();
  if (!q) return text;
  const out: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  let i = 0;
  let firstMark = true;
  while (i < text.length) {
    const next = lower.indexOf(q, i);
    if (next === -1) {
      out.push(text.slice(i));
      break;
    }
    if (next > i) out.push(text.slice(i, next));
    const before = text.slice(next, next + query.length);
    out.push(
      <span
        key={`m-${next}`}
        ref={firstMark ? firstRef : undefined}
        className="rounded bg-accent-400/40 px-0.5 text-white"
      >
        {before}
      </span>,
    );
    firstMark = false;
    i = next + query.length;
  }
  return out;
}

function safePretty(t: string) {
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return t;
  }
}
