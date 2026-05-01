import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlob } from '../lib/db';
import type { FileItem } from '../lib/types';
import { ViewerError, ViewerLoading } from './Status';
import { Icon } from '../components/Icon';
import { useHighlight, useHighlightFor } from '../components/HighlightContext';

interface ParsedSheet {
  name: string;
  rows: string[][];
}

export function SpreadsheetViewer({ item }: { item: FileItem }) {
  const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<number, string>>({});
  const [globalQuery, setGlobalQuery] = useState('');
  const highlight = useHighlightFor(item.id);
  const { consume } = useHighlight();
  const firstMatchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setSheets(null);
    setError(null);
    setActive(0);
    setFilters({});
    setGlobalQuery('');
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

  // Reset filters when switching sheets
  useEffect(() => {
    setFilters({});
    setGlobalQuery('');
  }, [active]);

  // When the search bar opens this file with a content match, prefill the
  // sheet's global search so the user immediately sees the matching rows,
  // and scroll the first match into view.
  useEffect(() => {
    if (!highlight || !sheets) return;
    const term = highlight.trim();
    if (!term) {
      consume(item.id);
      return;
    }
    setFilters({});
    setGlobalQuery(term);
    // Scroll happens after the filtered body renders. Defer to next frame.
    requestAnimationFrame(() => {
      firstMatchRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      consume(item.id);
    });
  }, [highlight, sheets, item.id, consume]);

  const current = sheets ? sheets[active] : null;
  const headers = current?.rows[0] ?? [];
  const body = current?.rows.slice(1) ?? [];
  const colCount = current
    ? Math.max(headers.length, ...body.map((r) => r.length))
    : 0;

  const filteredBody = useMemo(() => {
    if (!current) return [];
    const colFilters = Object.entries(filters)
      .map(([c, q]) => [Number(c), q.trim().toLowerCase()] as const)
      .filter(([, q]) => q.length > 0);
    const gq = globalQuery.trim().toLowerCase();
    if (colFilters.length === 0 && !gq) return body;
    return body.filter((row) => {
      if (colFilters.some(([c, q]) => !(row[c] ?? '').toLowerCase().includes(q))) {
        return false;
      }
      if (gq) {
        return row.some((cell) => (cell ?? '').toLowerCase().includes(gq));
      }
      return true;
    });
  }, [body, filters, globalQuery, current]);

  const activeFilterCount =
    Object.values(filters).filter((v) => v.trim().length > 0).length +
    (globalQuery.trim() ? 1 : 0);

  if (error) return <ViewerError message={error} />;
  if (!sheets) return <ViewerLoading label="Reading spreadsheet…" />;
  if (sheets.length === 0)
    return <ViewerError message="Spreadsheet contains no sheets" />;

  const clearAll = () => {
    setFilters({});
    setGlobalQuery('');
  };

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

      <div className="flex items-center gap-2 border-b border-white/5 bg-black/15 px-4 py-2">
        <div className="relative flex-1 max-w-sm">
          <Icon
            name="search"
            width={14}
            height={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            className="input pl-8 py-1.5 text-sm"
            placeholder="Search this sheet…"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
          />
        </div>
        <button
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
            showFilters
              ? 'border-accent-500/50 bg-accent-500/15 text-white'
              : 'border-white/10 bg-white/[0.03] text-ink-200 hover:bg-white/[0.07]'
          }`}
          onClick={() => setShowFilters((v) => !v)}
          title="Toggle column filters"
        >
          <Icon name="search" width={13} height={13} />
          Column filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 rounded-full bg-accent-500/40 px-1.5 py-px text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            className="rounded-md px-2 py-1 text-xs text-ink-300 hover:bg-white/5 hover:text-white"
            onClick={clearAll}
          >
            Clear
          </button>
        )}
        <div className="ml-auto text-xs text-ink-400">
          {filteredBody.length} of {body.length} row
          {body.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 p-2 md:p-4">
        <div
          className="glass min-h-0 flex-1 overflow-auto rounded-xl"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="grid w-full text-sm" style={{ minWidth: `${colCount * 140}px` }}>
            <div
              className="sticky top-0 z-10 grid border-b border-white/10 bg-black/40 backdrop-blur-md"
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
            {showFilters && (
              <div
                className="sticky z-10 grid border-b border-white/10 bg-black/30 backdrop-blur-md"
                style={{
                  gridTemplateColumns: `48px repeat(${colCount}, minmax(140px, 1fr))`,
                  top: '36px',
                }}
              >
                <div className="px-2 py-1.5 text-right text-[10px] text-ink-500">▾</div>
                {Array.from({ length: colCount }).map((_, c) => (
                  <div key={c} className="px-1.5 py-1.5">
                    <input
                      className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white outline-none transition placeholder:text-ink-500 focus:border-accent-500/60 focus:bg-white/[0.07]"
                      placeholder="Filter…"
                      value={filters[c] ?? ''}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, [c]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            {(() => {
              const hl = globalQuery.trim().toLowerCase();
              let firstHit = -1;
              if (hl) {
                firstHit = filteredBody.findIndex((row) =>
                  row.some((cell) => (cell ?? '').toLowerCase().includes(hl)),
                );
              }
              return filteredBody.map((row, r) => {
                const isFirstHit = r === firstHit;
                return (
                  <div
                    key={r}
                    ref={isFirstHit ? firstMatchRef : undefined}
                    className={`grid border-b border-white/5 transition ${
                      isFirstHit
                        ? 'bg-accent-500/15 ring-1 ring-inset ring-accent-500/40'
                        : 'hover:bg-white/[0.03]'
                    }`}
                    style={{
                      gridTemplateColumns: `48px repeat(${colCount}, minmax(140px, 1fr))`,
                    }}
                  >
                    <div className="px-3 py-2 text-right text-[11px] font-medium text-ink-500">
                      {r + 1}
                    </div>
                    {Array.from({ length: colCount }).map((_, c) => {
                      const v = row[c] ?? '';
                      const num =
                        typeof v === 'string' &&
                        /^-?[\d,]+(\.\d+)?$/.test(v.trim());
                      return (
                        <div
                          key={c}
                          className={`truncate px-3 py-2 text-ink-100 ${
                            num ? 'text-right tabular-nums' : ''
                          }`}
                          title={v}
                        >
                          {hl ? renderCellHighlighted(v, hl) : v}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
            {filteredBody.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-ink-400">
                {body.length === 0
                  ? 'Empty sheet.'
                  : 'No rows match the current filters.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderCellHighlighted(value: string, qLower: string): React.ReactNode {
  const lower = value.toLowerCase();
  const i = lower.indexOf(qLower);
  if (i === -1) return value;
  return (
    <>
      {value.slice(0, i)}
      <mark className="rounded bg-accent-400/40 px-0.5 text-white">
        {value.slice(i, i + qLower.length)}
      </mark>
      {value.slice(i + qLower.length)}
    </>
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
