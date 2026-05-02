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

/**
 * Decide whether the cursor is in the top or bottom half of the row,
 * which determines the drop indicator position (before vs after).
 */
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

const LONG_PRESS_MS = 380;
const TAP_SLOP_PX = 10;

/**
 * Reorderable list of `{ id }` items.
 *
 * - Mouse-equipped devices use HTML5 drag-and-drop (lightweight, no
 *   long-press required).
 * - Devices with any coarse pointer (phones, iPads, touch laptops)
 *   use Pointer Events with a long-press-to-drag gesture so the
 *   first tap fires onClick normally and a deliberate hold starts a
 *   reorder. Vibration is requested on long-press where supported.
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
  // Mirror overState in a ref so the touch pointerup handler can read
  // the latest value without re-binding.
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

  // ---- Pointer events (touch) --------------------------------------------

  const touchRef = useRef<{
    id: string | null;
    x: number;
    y: number;
    timer: number;
    active: boolean;
  }>({ id: null, x: 0, y: 0, timer: 0, active: false });

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.pointerType === 'mouse') return; // mouse uses HTML5 DnD
    const t = touchRef.current;
    if (t.timer) window.clearTimeout(t.timer);
    t.id = id;
    t.x = e.clientX;
    t.y = e.clientY;
    t.active = false;
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    t.timer = window.setTimeout(() => {
      t.active = true;
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // ignore — best-effort
      }
      setDraggingId(id);
      try {
        navigator.vibrate?.(30);
      } catch {
        // ignore
      }
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return;
    const t = touchRef.current;
    if (!t.id) return;
    if (!t.active) {
      // User started scrolling / panning before long-press fired —
      // cancel and let the page scroll normally.
      const dx = e.clientX - t.x;
      const dy = e.clientY - t.y;
      if (Math.hypot(dx, dy) > TAP_SLOP_PX) {
        window.clearTimeout(t.timer);
        t.id = null;
      }
      return;
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
        prev?.id === targetId && prev.pos === pos ? prev : { id: targetId, pos },
      );
      overStateRef.current = { id: targetId, pos };
    } else {
      setOverState(null);
      overStateRef.current = null;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return;
    const t = touchRef.current;
    if (t.timer) window.clearTimeout(t.timer);
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

  const onPointerCancel = () => {
    const t = touchRef.current;
    if (t.timer) window.clearTimeout(t.timer);
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

  type Bind = React.HTMLAttributes<HTMLElement> & {
    draggable?: boolean;
    'data-reorder-id'?: string;
  };

  return {
    draggingId,
    overState,
    bind: (id: string): Bind => {
      if (!enabled) {
        return { draggable: false, 'data-reorder-id': id };
      }
      if (isTouchDevice) {
        // Touch: long-press to start drag. Plain taps fire onClick on
        // child buttons normally because `draggable` is false and we
        // don't preventDefault on initial pointerdown / pointermove.
        return {
          'data-reorder-id': id,
          draggable: false,
          onPointerDown: (e: React.PointerEvent<HTMLElement>) =>
            onPointerDown(e, id),
          onPointerMove,
          onPointerUp,
          onPointerCancel,
        };
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
  };
}

function hasMime(e: React.DragEvent, mime: string): boolean {
  return e.dataTransfer ? Array.from(e.dataTransfer.types).includes(mime) : false;
}
