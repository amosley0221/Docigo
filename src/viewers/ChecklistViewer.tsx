import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChecklistEntry, ChecklistItemT } from '../lib/types';
import { useStore } from '../state/store';
import { Icon } from '../components/Icon';
import { uid } from '../lib/files';
import { useHighlight, useHighlightFor } from '../components/HighlightContext';

export function ChecklistViewer({ item }: { item: ChecklistItemT }) {
  const store = useStore();
  const entries = item.entries;
  const newInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const highlight = useHighlightFor(item.id);
  const { consume } = useHighlight();
  const matchedEntryId = useMemo(() => {
    if (!highlight) return null;
    const q = highlight.toLowerCase();
    return entries.find((e) => e.text.toLowerCase().includes(q))?.id ?? null;
  }, [entries, highlight]);
  const matchedRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!highlight) return;
    if (matchedRef.current) {
      matchedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    consume(item.id);
  }, [highlight, matchedEntryId, item.id, consume]);

  const stats = useMemo(() => {
    const done = entries.filter((e) => e.done).length;
    return { done, total: entries.length };
  }, [entries]);

  const update = (next: ChecklistEntry[]) => {
    store.updateChecklist(item.id, { entries: next });
  };

  const addEntry = (text: string) => {
    const t = text.trim();
    if (!t) return;
    update([...entries, { id: uid('chk'), text: t, done: false }]);
    setDraft('');
    newInputRef.current?.focus();
  };

  const toggleEntry = (id: string) => {
    update(entries.map((e) => (e.id === id ? { ...e, done: !e.done } : e)));
  };

  const editEntry = (id: string, text: string) => {
    update(entries.map((e) => (e.id === id ? { ...e, text } : e)));
  };

  const deleteEntry = (id: string) => {
    update(entries.filter((e) => e.id !== id));
  };

  const clearDone = () => {
    update(entries.filter((e) => !e.done));
  };

  return (
    <div className="flex h-full justify-center overflow-auto p-6">
      <div className="glass max-w-2xl flex-1 rounded-2xl px-8 py-7 shadow-soft">
        <ChecklistTitle item={item} />

        <div className="mt-4 mb-5 flex items-center gap-3">
          <ProgressBar done={stats.done} total={stats.total} />
          <div className="text-xs text-ink-400">
            {stats.done} of {stats.total} done
          </div>
          {stats.done > 0 && (
            <button
              className="ml-auto text-xs text-ink-300 hover:text-white"
              onClick={clearDone}
            >
              Clear completed
            </button>
          )}
        </div>

        <ul className="space-y-1">
          {entries.length === 0 && (
            <li className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-3 text-sm text-ink-400">
              Empty checklist. Add your first item below.
            </li>
          )}
          {entries.map((entry) => (
            <ChecklistRow
              key={entry.id}
              entry={entry}
              highlight={matchedEntryId === entry.id ? highlight : ''}
              rowRef={matchedEntryId === entry.id ? matchedRef : undefined}
              onToggle={() => toggleEntry(entry.id)}
              onEdit={(t) => editEntry(entry.id, t)}
              onDelete={() => deleteEntry(entry.id)}
            />
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addEntry(draft);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-white/15 bg-white/[0.03] text-ink-500">
            +
          </span>
          <input
            ref={newInputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an item and press Enter…"
            className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-ink-500"
          />
          {draft.trim() && (
            <button type="submit" className="btn-primary py-1 text-xs">
              <Icon name="check" width={12} height={12} />
              Add
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function ChecklistTitle({ item }: { item: ChecklistItemT }) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  useEffect(() => setName(item.name), [item.name]);

  if (editing) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== item.name) store.renameItem(item.id, name.trim());
          else setName(item.name);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setName(item.name);
            setEditing(false);
          }
        }}
        className="w-full bg-transparent font-display text-2xl font-bold tracking-tight text-white outline-none"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left font-display text-2xl font-bold tracking-tight text-white hover:text-accent-200"
      title="Click to rename"
    >
      {item.name}
    </button>
  );
}

function ChecklistRow({
  entry,
  highlight,
  rowRef,
  onToggle,
  onEdit,
  onDelete,
}: {
  entry: ChecklistEntry;
  highlight?: string;
  rowRef?: React.RefObject<HTMLLIElement | null>;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(entry.text);
  useEffect(() => setText(entry.text), [entry.text]);

  return (
    <li
      ref={rowRef}
      className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${
        highlight
          ? 'bg-accent-500/15 ring-1 ring-accent-500/40'
          : 'hover:bg-white/[0.04]'
      }`}
    >
      <button
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          entry.done
            ? 'border-accent-500/60 bg-accent-500/40 text-white'
            : 'border-white/15 bg-white/[0.03] text-transparent hover:border-white/30'
        }`}
        aria-pressed={entry.done}
      >
        <Icon name="check" width={12} height={12} />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== entry.text) onEdit(text);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setText(entry.text);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`flex-1 bg-transparent py-1 text-sm outline-none ${
          entry.done ? 'text-ink-400 line-through' : 'text-white'
        }`}
      />
      <button
        onClick={onDelete}
        className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
        title="Remove"
      >
        <Icon name="x" width={12} height={12} />
      </button>
    </li>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent-500 to-fuchsia-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
