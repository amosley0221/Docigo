import type { ItemKind } from './types';

export function classifyFile(file: File): ItemKind {
  const name = file.name.toLowerCase();
  const m = file.type;
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv') ||
    m.includes('spreadsheet') ||
    m === 'text/csv'
  ) {
    return 'spreadsheet';
  }
  if (
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    m.includes('word') ||
    m === 'application/msword' ||
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'document';
  }
  if (
    m.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.json') ||
    name.endsWith('.log')
  ) {
    return 'text';
  }
  return 'unknown';
}

export function humanSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function splitName(name: string): { stem: string; ext: string } {
  const i = name.lastIndexOf('.');
  if (i <= 0) return { stem: name, ext: '' };
  return { stem: name.slice(0, i), ext: name.slice(i) };
}

export function nextUniqueName(name: string, existing: Set<string>): string {
  if (!existing.has(name)) return name;
  const { stem, ext } = splitName(name);
  let i = 2;
  while (existing.has(`${stem} (${i})${ext}`)) i++;
  return `${stem} (${i})${ext}`;
}
