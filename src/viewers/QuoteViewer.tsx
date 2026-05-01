import { useEffect } from 'react';
import type { QuoteItem } from '../lib/types';
import { useHighlight, useHighlightFor } from '../components/HighlightContext';

export function QuoteViewer({ item }: { item: QuoteItem }) {
  const highlight = useHighlightFor(item.id);
  const { consume } = useHighlight();

  useEffect(() => {
    if (highlight) consume(item.id);
  }, [highlight, item.id, consume]);

  return (
    <div className="flex h-full justify-center overflow-auto p-8">
      <div className="glass max-w-3xl flex-1 rounded-2xl px-10 py-12 shadow-soft">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
          Quote
        </div>
        <div className="mt-3 font-serif text-2xl italic leading-snug text-white">
          <span
            className="mr-1 align-top text-4xl text-accent-400"
            aria-hidden
          >
            “
          </span>
          {highlight ? renderHighlighted(item.text, highlight) : item.text}
          <span className="ml-1 align-baseline text-4xl text-accent-400" aria-hidden>
            ”
          </span>
        </div>
        {item.source && (
          <div className="mt-4 text-sm text-ink-300">— {item.source}</div>
        )}
        <div className="mt-6 text-xs text-ink-500">
          Captured {new Date(item.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function renderHighlighted(text: string, query: string) {
  const q = query.toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const next = lower.indexOf(q, i);
    if (next === -1) {
      out.push(text.slice(i));
      break;
    }
    if (next > i) out.push(text.slice(i, next));
    out.push(
      <mark
        key={`m-${next}`}
        className="rounded bg-accent-400/40 px-0.5 text-white"
      >
        {text.slice(next, next + query.length)}
      </mark>,
    );
    i = next + query.length;
  }
  return out;
}
