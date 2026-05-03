import { useEffect } from 'react';
import type { QuoteItem } from '../lib/types';
import { useHighlight, useHighlightFor } from '../components/HighlightContext';
import { Icon } from '../components/Icon';

export function QuoteViewer({ item }: { item: QuoteItem }) {
  const highlight = useHighlightFor(item.id);
  const { consume } = useHighlight();

  useEffect(() => {
    if (highlight) consume(item.id);
  }, [highlight, item.id, consume]);

  return (
    <div className="flex h-full justify-center overflow-auto p-4 md:p-8">
      <article className="glass relative max-w-3xl flex-1 overflow-hidden rounded-2xl px-6 py-7 shadow-soft md:px-10 md:py-10">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-400/70 via-accent-500/50 to-fuchsia-500/40"
        />
        <header className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
          <Icon name="quote" width={12} height={12} />
          Text
        </header>
        <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
          {highlight
            ? renderHighlighted(item.name, highlight)
            : item.name}
        </h2>
        <div className="mt-5 whitespace-pre-wrap break-words font-serif text-[1.05rem] leading-relaxed text-ink-100 md:text-lg">
          {highlight ? renderHighlighted(item.text, highlight) : item.text}
        </div>
        {item.source && (
          <div className="mt-5 border-t border-white/5 pt-4 text-sm text-ink-300">
            — {item.source}
          </div>
        )}
        <div className="mt-5 text-xs text-ink-500">
          Added {new Date(item.createdAt).toLocaleString()}
        </div>
      </article>
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
