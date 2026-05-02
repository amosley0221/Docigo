import { supabase } from './supabase';
import type { FileItem } from './types';

const CONVERT_URL = import.meta.env.VITE_CONVERT_URL as string | undefined;

/** File extensions whose contents we send to the conversion service. */
const CONVERTIBLE_EXTS = new Set(['pptx', 'ppt', 'pptm', 'key']);

export function isConvertible(name: string): boolean {
  const lower = name.toLowerCase();
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : '';
  return CONVERTIBLE_EXTS.has(ext);
}

export function isConversionConfigured(): boolean {
  return Boolean(CONVERT_URL);
}

/**
 * Send a file to the conversion service and return the resulting PDF
 * blob. Throws if the service isn't configured, the user isn't signed
 * in, or the conversion fails.
 */
export async function convertToPdf(file: File | Blob, fileName: string): Promise<Blob> {
  if (!CONVERT_URL) throw new Error('Conversion service not configured');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');

  const form = new FormData();
  form.append('file', file, fileName);

  const res = await fetch(`${CONVERT_URL.replace(/\/$/, '')}/convert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    let message = `Conversion failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.blob();
}

/** Sibling storage path for a file's derived PDF. */
export function derivedPdfPath(item: FileItem): string {
  return `${item.blobKey}.pdf`;
}
