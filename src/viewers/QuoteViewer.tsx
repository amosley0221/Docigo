import type { QuoteItem } from '../lib/types';

export function QuoteViewer({ item }: { item: QuoteItem }) {
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
          {item.text}
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
