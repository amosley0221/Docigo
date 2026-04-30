import { useEffect, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { ViewerError, ViewerLoading } from './SpreadsheetViewer';

export function DocumentViewer({ item }: { item: FileItem }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setError(null);
    (async () => {
      try {
        const blob = await getBlob(item.blobKey);
        if (!blob) throw new Error('File data unavailable');
        const buf = await blob.arrayBuffer();
        const mammoth = await import('mammoth/mammoth.browser.js');
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        if (!cancelled) setHtml(result.value || '<em>Empty document</em>');
      } catch (e) {
        if (!cancelled) {
          // Older .doc isn't supported by mammoth.
          if (item.name.toLowerCase().endsWith('.doc')) {
            setError(
              'Legacy .doc format is not supported. Save the file as .docx and try again.',
            );
          } else {
            setError(e instanceof Error ? e.message : 'Failed to render document');
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.blobKey, item.name]);

  if (error) return <ViewerError message={error} />;
  if (html === null) return <ViewerLoading label="Rendering document…" />;

  return (
    <div className="flex h-full justify-center overflow-auto p-6">
      <div className="glass max-w-3xl flex-1 rounded-2xl px-10 py-12 shadow-soft">
        <article
          className="docigo-doc font-serif text-[15.5px] leading-relaxed text-ink-100"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <style>{`
        .docigo-doc h1 { font-family: 'Plus Jakarta Sans', system-ui; color: #fff; font-size: 28px; margin: 0 0 0.5em; font-weight: 700; }
        .docigo-doc h2 { font-family: 'Plus Jakarta Sans', system-ui; color: #fff; font-size: 22px; margin: 1.4em 0 0.4em; font-weight: 700; }
        .docigo-doc h3 { font-family: 'Plus Jakarta Sans', system-ui; color: #fff; font-size: 18px; margin: 1.2em 0 0.3em; font-weight: 600; }
        .docigo-doc p { margin: 0.7em 0; }
        .docigo-doc ul, .docigo-doc ol { margin: 0.6em 0 0.6em 1.2em; }
        .docigo-doc li { margin: 0.25em 0; }
        .docigo-doc strong { color: #fff; }
        .docigo-doc a { color: #94b2ff; text-decoration: underline; text-underline-offset: 2px; }
        .docigo-doc table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 14px; }
        .docigo-doc th, .docigo-doc td { border: 1px solid rgba(255,255,255,0.08); padding: 8px 10px; }
        .docigo-doc th { background: rgba(255,255,255,0.04); color: #fff; text-align: left; }
        .docigo-doc img { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }
        .docigo-doc blockquote { border-left: 3px solid #4361ff; padding: 0.4em 1em; color: #d8d9df; margin: 1em 0; background: rgba(67,97,255,0.06); border-radius: 0 8px 8px 0; }
      `}</style>
    </div>
  );
}
