import { useEffect, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { ViewerError, ViewerLoading } from './Status';
import { humanSize } from '../lib/files';

export function ImageViewer({ item }: { item: FileItem }) {
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
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load image');
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.blobKey]);

  if (error) return <ViewerError message={error} />;
  if (!url) return <ViewerLoading label="Loading image…" />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <div className="glass relative max-h-[80%] max-w-full overflow-hidden rounded-2xl p-2 shadow-soft">
        <img
          src={url}
          alt={item.name}
          className="max-h-[68vh] max-w-full rounded-xl object-contain"
        />
      </div>
      <div className="text-xs text-ink-400">
        {item.mime || 'image'} · {humanSize(item.size)}
      </div>
    </div>
  );
}
