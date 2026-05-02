import type { FileItem } from './types';
import * as api from './api';

interface NativeAppAction {
  /** UI label like "Download" or "Open PDF". */
  label: string;
  /**
   * 'open' opens the signed URL in a new tab so the browser / OS can
   * route to its default handler (browsers preview PDFs natively, etc).
   * 'download' streams the file to the user's device. On platforms that
   * support the Web Share API for files (iOS Safari, recent Android),
   * the share sheet is used so the user can pick an "Open in…" target
   * directly instead of digging through Files.
   */
  mode: 'open' | 'download';
}

export function getNativeAppAction(item: FileItem): NativeAppAction {
  const name = item.name.toLowerCase();
  if (item.kind === 'pdf' || name.endsWith('.pdf')) {
    return { label: 'Open PDF', mode: 'open' };
  }
  return { label: 'Download', mode: 'download' };
}

/** Run the action for an item. Resolves once the action has been kicked off. */
export async function runNativeAppAction(item: FileItem): Promise<void> {
  const action = getNativeAppAction(item);

  if (action.mode === 'open') {
    const url = await api.getSignedUrl(item.blobKey, 60 * 30);
    window.open(url, '_blank', 'noopener');
    return;
  }

  // Download path: pull the blob and either offer the share sheet (iOS,
  // recent Android, Safari with file-share support) or fall back to a
  // direct download anchor.
  const blob = await api.downloadBlob(item.blobKey);
  const mime = item.mime || blob.type || 'application/octet-stream';
  const file = new File([blob], item.name, { type: mime });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: item.name });
      return;
    } catch (err) {
      // User cancelled the share sheet — that's fine, don't double-fire.
      if (err instanceof Error && err.name === 'AbortError') return;
      // Otherwise fall through to the regular download path.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
