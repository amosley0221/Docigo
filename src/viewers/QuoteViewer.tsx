import { Fragment, useEffect } from 'react';
import type { ReactNode } from 'react';
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
    <div className="h-full overflow-y-auto overflow-x-hidden p-4 md:p-8">
      <article className="glass relative mx-auto max-w-3xl overflow-hidden rounded-2xl px-5 py-6 shadow-soft md:px-9 md:py-8">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-400/70 via-accent-500/50 to-fuchsia-500/40"
        />
        <header className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
          <Icon name="quote" width={12} height={12} />
          Text
        </header>
        <h2 className="mt-2 font-display text-xl font-bold leading-tight tracking-tight text-white md:text-2xl">
          {highlight ? renderHighlighted(item.name, highlight) : item.name}
        </h2>
        <div className="mt-4 whitespace-pre-wrap break-words font-serif text-base leading-relaxed text-ink-100 md:text-[1.0625rem]">
          {linkify(item.text, highlight)}
        </div>
        {item.source && (
          <div className="mt-5 break-words border-t border-white/5 pt-4 text-sm text-ink-300">
            — {linkify(item.source, highlight)}
          </div>
        )}
        <div className="mt-4 text-xs text-ink-500">
          Added {new Date(item.createdAt).toLocaleString()}
        </div>
      </article>
    </div>
  );
}

/** Splits text into URL / non-URL spans, wraps URLs in anchor tags that open
 *  in a new tab, and runs the search highlighter on every span so matches
 *  remain visible inside or outside a link. */
function linkify(text: string, highlight?: string): ReactNode {
  const urlRe = /\bhttps?:\/\/[^\s<>"'`]+/gi;
  const trailingPunct = /[.,;:!?)\]]+$/;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text)) !== null) {
    let url = match[0];
    let trail = '';
    const tp = url.match(trailingPunct);
    if (tp) {
      trail = tp[0];
      url = url.slice(0, -trail.length);
    }
    if (match.index > last) {
      const seg = text.slice(last, match.index);
      out.push(
        <Fragment key={key++}>
          {highlight ? renderHighlighted(seg, highlight) : seg}
        </Fragment>,
      );
    }
    out.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-accent-300 underline decoration-accent-400/40 underline-offset-2 transition hover:text-accent-200 hover:decoration-accent-300"
      >
        {highlight ? renderHighlighted(url, highlight) : url}
      </a>,
    );
    if (trail) {
      out.push(
        <Fragment key={key++}>
          {highlight ? renderHighlighted(trail, highlight) : trail}
        </Fragment>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last === 0) {
    return highlight ? renderHighlighted(text, highlight) : text;
  }
  if (last < text.length) {
    const seg = text.slice(last);
    out.push(
      <Fragment key={key++}>
        {highlight ? renderHighlighted(seg, highlight) : seg}
      </Fragment>,
    );
  }
  return out;
}

function renderHighlighted(text: string, query: string) {
  const q = query.toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const out: ReactNode[] = [];
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
