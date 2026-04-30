import { useEffect, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { ViewerError, ViewerLoading } from './Status';

export function TextViewer({ item }: { item: FileItem }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <ViewerError message={error} />;
  if (text === null) return <ViewerLoading label="Reading file…" />;

  const isJson = item.name.toLowerCase().endsWith('.json');
  const display = isJson ? safePretty(text) : text;

  return (
    <div className="flex h-full justify-center overflow-auto p-6">
      <div className="glass max-w-4xl flex-1 rounded-2xl px-8 py-8 shadow-soft">
        <pre className="whitespace-pre-wrap break-words font-mono text-[13.5px] leading-relaxed text-ink-100">
          {display}
        </pre>
      </div>
    </div>
  );
}

function safePretty(t: string) {
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return t;
  }
}
