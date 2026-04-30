import type { ItemKind } from './types';

/** Cap extracted text size so the search index doesn't balloon. */
const MAX_TEXT_LEN = 200_000;

export async function extractSearchText(
  file: File,
  kind: ItemKind,
): Promise<string | null> {
  try {
    if (kind === 'spreadsheet') return await extractSpreadsheet(file);
    if (kind === 'document') return await extractDocument(file);
    if (kind === 'text') return await extractTextFile(file);
    // PDFs and images are skipped: PDF parsing requires a heavy dep, and
    // images have no textual content without OCR.
    return null;
  } catch {
    return null;
  }
}

async function extractSpreadsheet(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array' });
  let out = '';
  for (const name of wb.SheetNames) {
    out += `\n# ${name}\n`;
    out += XLSX.utils.sheet_to_csv(wb.Sheets[name]);
    if (out.length >= MAX_TEXT_LEN) break;
  }
  return out.slice(0, MAX_TEXT_LEN);
}

async function extractDocument(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const mammoth = await import('mammoth/mammoth.browser.js');
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value ?? '').slice(0, MAX_TEXT_LEN);
}

async function extractTextFile(file: File): Promise<string> {
  const text = await file.text();
  return text.slice(0, MAX_TEXT_LEN);
}
