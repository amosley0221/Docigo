import { useEffect, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { ViewerError, ViewerLoading } from './SpreadsheetViewer';

export function PdfViewer({ item }: { item: FileItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    (async () => {
      try {
        const blob = await getBlob(item.blobKey);
        if (!blob) throw new Error('File data unavailable');
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load PDF');
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.blobKey]);

  if (error) return <ViewerError message={error} />;
  if (!url) return <ViewerLoading label="Loading PDF…" />;

  return (
    <div className="h-full bg-black/30 p-3">
      <div className="glass h-full overflow-hidden rounded-xl">
        <iframe
          src={url}
          title={item.name}
          className="h-full w-full bg-white"
          style={{ colorScheme: 'light' }}
        />
      </div>
    </div>
  );
}
