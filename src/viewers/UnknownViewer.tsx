import { useEffect, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { Icon } from '../components/Icon';
import { humanSize } from '../lib/files';

export function UnknownViewer({ item }: { item: FileItem }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      const blob = await getBlob(item.blobKey);
      if (!blob) return;
      revoke = URL.createObjectURL(blob);
      setUrl(revoke);
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [item.blobKey]);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="glass max-w-md rounded-2xl px-8 py-10 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-ink-200">
          <Icon name="folder" />
        </div>
        <div className="font-display text-lg font-semibold text-white">{item.name}</div>
        <div className="mt-1 text-sm text-ink-400">
          {item.mime || 'Unknown type'} · {humanSize(item.size)}
        </div>
        <div className="mt-4 text-sm text-ink-300">
          We can’t preview this file type yet, but it’s safely stored in your workspace.
        </div>
        {url && (
          <a
            href={url}
            download={item.name}
            className="btn-quiet mt-5 inline-flex"
          >
            <Icon name="upload" width={14} height={14} className="rotate-180" />
            Download
          </a>
        )}
      </div>
    </div>
  );
}
