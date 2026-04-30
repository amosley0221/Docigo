import { useEffect, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { ViewerError, ViewerLoading } from './Status';

interface ParsedSheet {
  name: string;
  rows: string[][];
}

export function SpreadsheetViewer({ item }: { item: FileItem }) {
  const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSheets(null);
    setError(null);
    setActive(0);
    (async () => {
      try {
        const blob = await getBlob(item.blobKey);
        if (!blob) throw new Error('File data unavailable');
        const buf = await blob.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(buf, { type: 'array' });
        const parsed: ParsedSheet[] = wb.SheetNames.map((n) => {
          const ws = wb.Sheets[n];
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
            header: 1,
            blankrows: false,
            defval: '',
          });
          return { name: n, rows: rows.map((r) => r.map((c) => String(c ?? ''))) };
        });
        if (!cancelled) setSheets(parsed);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to read spreadsheet');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.blobKey]);

  if (error) return <ViewerError message={error} />;
  if (!sheets) return <ViewerLoading label="Reading spreadsheet…" />;
  if (sheets.length === 0)
    return <ViewerError message="Spreadsheet contains no sheets" />;

  const current = sheets[active];
  const headers = current.rows[0] ?? [];
  const body = current.rows.slice(1);
  const colCount = Math.max(headers.length, ...body.map((r) => r.length));

  return (
    <div className="flex h-full flex-col">
      {sheets.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/5 bg-black/20 px-3 py-1.5">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActive(i)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition ${
                i === active
                  ? 'bg-white/10 text-white'
                  : 'text-ink-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <div className="glass overflow-hidden rounded-xl">
          <div className="grid w-full text-sm" style={{ minWidth: `${colCount * 140}px` }}>
            <div
              className="sticky top-0 grid border-b border-white/10 bg-black/40 backdrop-blur-md"
              style={{ gridTemplateColumns: `48px repeat(${colCount}, minmax(140px, 1fr))` }}
            >
              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500" />
              {Array.from({ length: colCount }).map((_, c) => (
                <div
                  key={c}
                  className="truncate px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-300"
                  title={headers[c] ?? colLetter(c)}
                >
                  {headers[c] || colLetter(c)}
                </div>
              ))}
            </div>
            {body.map((row, r) => (
              <div
                key={r}
                className="grid border-b border-white/5 transition hover:bg-white/[0.03]"
                style={{ gridTemplateColumns: `48px repeat(${colCount}, minmax(140px, 1fr))` }}
              >
                <div className="px-3 py-2 text-right text-[11px] font-medium text-ink-500">
                  {r + 1}
                </div>
                {Array.from({ length: colCount }).map((_, c) => {
                  const v = row[c] ?? '';
                  const num = typeof v === 'string' && /^-?[\d,]+(\.\d+)?$/.test(v.trim());
                  return (
                    <div
                      key={c}
                      className={`truncate px-3 py-2 text-ink-100 ${
                        num ? 'text-right tabular-nums' : ''
                      }`}
                      title={v}
                    >
                      {v}
                    </div>
                  );
                })}
              </div>
            ))}
            {body.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-ink-400">
                Empty sheet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function colLetter(i: number): string {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

