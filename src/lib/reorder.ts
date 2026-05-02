import { useState } from 'react';

export type DropPosition = 'before' | 'after';

export interface DragOverState {
  id: string;
  pos: DropPosition;
}

export function reorderIds(
  ids: string[],
  fromId: string,
  toId: string,
  pos: DropPosition,
): string[] {
  if (fromId === toId) return ids;
  const without = ids.filter((id) => id !== fromId);
  const idx = without.indexOf(toId);
  if (idx === -1) return ids;
  const insertAt = pos === 'after' ? idx + 1 : idx;
  without.splice(insertAt, 0, fromId);
  return without;
}

/**
 * Decide whether the cursor is in the top or bottom half of the row,
 * which determines the drop indicator position (before vs after).
 */
export function dropPositionFromEvent(
  e: React.DragEvent,
  el: HTMLElement,
): DropPosition {
  const rect = el.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  return e.clientY < midpoint ? 'before' : 'after';
}

interface DragHandlersOptions<T extends { id: string }> {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  /**
   * The drag-data MIME type used to scope this drop zone so that
   * unrelated drags (e.g. file uploads) don't reorder rows.
   */
  mimeType: string;
  /**
   * When false, bind() returns no drag attributes — taps on rows fire
   * normal clicks. Useful for touch-only devices where HTML5 drag
   * eats the first tap.
   */
  enabled?: boolean;
}

export function useReorderable<T extends { id: string }>({
  items,
  onReorder,
  mimeType,
  enabled = true,
}: DragHandlersOptions<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overState, setOverState] = useState<DragOverState | null>(null);

  const onDragStart = (e: React.DragEvent<HTMLElement>, id: string) => {
    setDraggingId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(mimeType, id);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLElement>, id: string) => {
    if (!hasMime(e, mimeType) && !draggingId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const pos = dropPositionFromEvent(e, e.currentTarget);
    setOverState((prev) =>
      prev?.id === id && prev.pos === pos ? prev : { id, pos },
    );
  };

  const onDragLeave = (_e: React.DragEvent<HTMLElement>, id: string) => {
    setOverState((prev) => (prev?.id === id ? null : prev));
  };

  const onDrop = (e: React.DragEvent<HTMLElement>, targetId: string) => {
    if (!draggingId && !hasMime(e, mimeType)) return;
    e.preventDefault();
    const fromId =
      draggingId ?? (e.dataTransfer?.getData(mimeType) || null);
    if (!fromId || fromId === targetId) {
      cleanup();
      return;
    }
    const pos = dropPositionFromEvent(e, e.currentTarget);
    const ids = items.map((i) => i.id);
    const next = reorderIds(ids, fromId, targetId, pos);
    if (next.join('|') !== ids.join('|')) onReorder(next);
    cleanup();
  };

  const onDragEnd = () => cleanup();

  function cleanup() {
    setDraggingId(null);
    setOverState(null);
  }

  return {
    draggingId,
    overState,
    bind: (id: string) =>
      enabled
        ? {
            draggable: true,
            onDragStart: (e: React.DragEvent<HTMLElement>) =>
              onDragStart(e, id),
            onDragOver: (e: React.DragEvent<HTMLElement>) => onDragOver(e, id),
            onDragLeave: (e: React.DragEvent<HTMLElement>) =>
              onDragLeave(e, id),
            onDrop: (e: React.DragEvent<HTMLElement>) => onDrop(e, id),
            onDragEnd,
          }
        : { draggable: false as const },
  };
}

function hasMime(e: React.DragEvent, mime: string): boolean {
  return e.dataTransfer ? Array.from(e.dataTransfer.types).includes(mime) : false;
}
