import type { FileItem } from './types';
import * as api from './api';

interface NativeAppAction {
  /** UI label like "Download" or "Open PDF". */
  label: string;
  /**
   * 'open' opens the signed URL in a new tab so the browser / OS can
   * route to its default handler (browsers preview PDFs natively, etc).
   * 'download' streams the file to the user's device. The OS / browser
   * then opens it with whatever app the user has associated with the
   * file extension.
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

  // Pull the blob and trigger a regular browser download. Wrapping the
  // Blob with the original mime type makes Safari attach the right
  // extension on the saved file (it would otherwise re-derive the
  // extension from a generic application/octet-stream).
  const blob = await api.downloadBlob(item.blobKey);
  const mime = item.mime || blob.type || 'application/octet-stream';
  const typed = blob.type === mime ? blob : new Blob([blob], { type: mime });

  const url = URL.createObjectURL(typed);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
