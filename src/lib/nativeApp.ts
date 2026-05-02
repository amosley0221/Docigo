import type { FileItem } from './types';
import * as api from './api';

interface NativeAppAction {
  /** UI label like "Open in Excel" or "Download". */
  label: string;
  /**
   * 'office' uses an ms-office: URI scheme that hands the file to a
   * locally installed Microsoft app. 'open' opens the signed URL in a
   * new tab (the browser/OS picks the handler — usually Adobe Reader
   * for PDFs). 'download' streams the file as an attachment.
   */
  mode: 'office' | 'open' | 'download';
  /** ms-office scheme prefix when mode === 'office'. */
  officeScheme?: 'ms-excel' | 'ms-word' | 'ms-powerpoint';
}

const OFFICE_BY_EXT: Record<string, { scheme: 'ms-excel' | 'ms-word' | 'ms-powerpoint'; app: string }> = {
  xlsx: { scheme: 'ms-excel', app: 'Excel' },
  xls: { scheme: 'ms-excel', app: 'Excel' },
  xlsm: { scheme: 'ms-excel', app: 'Excel' },
  csv: { scheme: 'ms-excel', app: 'Excel' },
  docx: { scheme: 'ms-word', app: 'Word' },
  doc: { scheme: 'ms-word', app: 'Word' },
  docm: { scheme: 'ms-word', app: 'Word' },
  pptx: { scheme: 'ms-powerpoint', app: 'PowerPoint' },
  ppt: { scheme: 'ms-powerpoint', app: 'PowerPoint' },
  pptm: { scheme: 'ms-powerpoint', app: 'PowerPoint' },
};

export function getNativeAppAction(item: FileItem): NativeAppAction {
  const name = item.name.toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  const office = OFFICE_BY_EXT[ext];
  if (office) {
    return { label: `Open in ${office.app}`, mode: 'office', officeScheme: office.scheme };
  }
  if (ext === 'pdf' || item.kind === 'pdf') {
    return { label: 'Open PDF', mode: 'open' };
  }
  return { label: 'Download', mode: 'download' };
}

/**
 * Run the action for an item. Returns once the action has been kicked
 * off (ms-office handoff is fire-and-forget; download/open complete
 * once the browser hands control to the OS).
 */
export async function runNativeAppAction(item: FileItem): Promise<void> {
  const action = getNativeAppAction(item);
  if (action.mode === 'office') {
    const url = await api.getSignedUrl(item.blobKey, 60 * 30); // 30 min
    window.location.href = `${action.officeScheme}:ofe|u|${url}`;
    return;
  }
  if (action.mode === 'open') {
    const url = await api.getSignedUrl(item.blobKey, 60 * 30);
    window.open(url, '_blank', 'noopener');
    return;
  }
  // Default: download via blob so the filename is preserved.
  const blob = await api.downloadBlob(item.blobKey);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
