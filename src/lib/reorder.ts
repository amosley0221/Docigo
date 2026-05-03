import { useRef, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';

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

export function dropPositionFromEvent(
  e: { clientY: number },
  el: HTMLElement,
): DropPosition {
  const rect = el.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  return e.clientY < midpoint ? 'before' : 'after';
}

interface DragHandlersOptions<T extends { id: string }> {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  /** Drag-data MIME type so unrelated drags (file uploads) don't reorder. */
  mimeType: string;
  /** Set to false to fully disable reorder (rows behave as plain content). */
  enabled?: boolean;
}

const TAP_SLOP_PX = 6;

/**
 * Reorderable list of `{ id }` items.
 *
 * Two surfaces:
 *  - `bind(id)` — attach to the row container. On mouse-only devices
 *    (no touchscreen) the whole row is HTML5-draggable for the
 *    familiar click-and-drag flow. On touch devices the row is
 *    plain content so taps fire onClick on the first interaction;
 *    only the handle below moves it.
 *  - `handle(id)` — attach to a small drag handle inside the row.
 *    On touch devices the handle owns Pointer Events: pressing the
 *    handle and moving starts a drag; releasing commits or cancels.
 *    On mouse-only devices `handle` returns `hidden: true` so callers
 *    can choose not to render the handle at all.
 *
 * The visible accent indicator and `draggingId` work for both paths.
 */
export function useReorderable<T extends { id: string }>({
  items,
  onReorder,
  mimeType,
  enabled = true,
}: DragHandlersOptions<T>) {
  const isTouchDevice = useMediaQuery('(any-pointer: coarse)');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overState, setOverState] = useState<DragOverState | null>(null);
  const overStateRef = useRef<DragOverState | null>(null);

  // ---- HTML5 DnD (mouse) -------------------------------------------------

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
    overStateRef.current = { id, pos };
  };

  const onDragLeave = (_e: React.DragEvent<HTMLElement>, id: string) => {
    setOverState((prev) => (prev?.id === id ? null : prev));
  };

  const onDrop = (e: React.DragEvent<HTMLElement>, targetId: string) => {
    if (!draggingId && !hasMime(e, mimeType)) return;
    e.preventDefault();
    const fromId = draggingId ?? (e.dataTransfer?.getData(mimeType) || null);
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

  // ---- Pointer events on a dedicated handle (touch) ----------------------

  const handleRef = useRef<{
    id: string | null;
    x: number;
    y: number;
    active: boolean;
  }>({ id: null, x: 0, y: 0, active: false });

  const onHandlePointerDown = (
    e: React.PointerEvent<HTMLElement>,
    id: string,
  ) => {
    if (e.pointerType === 'mouse') return; // mouse drags via the row
    const t = handleRef.current;
    t.id = id;
    t.x = e.clientX;
    t.y = e.clientY;
    t.active = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return;
    const t = handleRef.current;
    if (!t.id) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (!t.active) {
      if (Math.hypot(dx, dy) < TAP_SLOP_PX) return;
      t.active = true;
      setDraggingId(t.id);
      try {
        navigator.vibrate?.(20);
      } catch {
        // ignore
      }
    }
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row =
      (el?.closest?.('[data-reorder-id]') as HTMLElement | null) ?? null;
    const targetId = row?.dataset.reorderId;
    if (row && targetId && targetId !== t.id) {
      const rect = row.getBoundingClientRect();
      const pos: DropPosition =
        e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setOverState((prev) =>
        prev?.id === targetId && prev.pos === pos
          ? prev
          : { id: targetId, pos },
      );
      overStateRef.current = { id: targetId, pos };
    } else {
      setOverState(null);
      overStateRef.current = null;
    }
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return;
    const t = handleRef.current;
    if (t.active) {
      const fromId = t.id;
      const ov = overStateRef.current;
      if (fromId && ov && ov.id !== fromId) {
        const ids = items.map((i) => i.id);
        const next = reorderIds(ids, fromId, ov.id, ov.pos);
        if (next.join('|') !== ids.join('|')) onReorder(next);
      }
    }
    t.id = null;
    t.active = false;
    overStateRef.current = null;
    setDraggingId(null);
    setOverState(null);
  };

  const onHandlePointerCancel = () => {
    const t = handleRef.current;
    t.id = null;
    t.active = false;
    overStateRef.current = null;
    setDraggingId(null);
    setOverState(null);
  };

  function cleanup() {
    setDraggingId(null);
    setOverState(null);
    overStateRef.current = null;
  }

  type RowBind = React.HTMLAttributes<HTMLElement> & {
    draggable?: boolean;
    'data-reorder-id'?: string;
  };

  type HandleBind = React.HTMLAttributes<HTMLElement> & {
    /** True when callers should skip rendering the handle. */
    hidden?: boolean;
  };

  return {
    draggingId,
    overState,
    /** Whether the active device should render a drag handle. */
    needsHandle: enabled && isTouchDevice,
    bind: (id: string): RowBind => {
      if (!enabled) return { 'data-reorder-id': id, draggable: false };
      if (isTouchDevice) {
        // Row itself is plain on touch — taps go through to inner
        // buttons. Drag is only via the handle.
        return { 'data-reorder-id': id, draggable: false };
      }
      return {
        'data-reorder-id': id,
        draggable: true,
        onDragStart: (e: React.DragEvent<HTMLElement>) => onDragStart(e, id),
        onDragOver: (e: React.DragEvent<HTMLElement>) => onDragOver(e, id),
        onDragLeave: (e: React.DragEvent<HTMLElement>) => onDragLeave(e, id),
        onDrop: (e: React.DragEvent<HTMLElement>) => onDrop(e, id),
        onDragEnd,
      };
    },
    handle: (id: string): HandleBind => {
      if (!enabled || !isTouchDevice) return { hidden: true };
      return {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) =>
          onHandlePointerDown(e, id),
        onPointerMove: onHandlePointerMove,
        onPointerUp: onHandlePointerUp,
        onPointerCancel: onHandlePointerCancel,
      };
    },
  };
}

function hasMime(e: React.DragEvent, mime: string): boolean {
  return e.dataTransfer ? Array.from(e.dataTransfer.types).includes(mime) : false;
}
