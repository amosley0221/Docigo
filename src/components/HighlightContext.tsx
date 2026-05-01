import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

interface HighlightTarget {
  itemId: string;
  query: string;
}

interface HighlightApi {
  /** Currently-pending highlight target, or null. */
  target: HighlightTarget | null;
  /** Called by SearchBar when a content match is opened. */
  request: (target: HighlightTarget) => void;
  /** Called by a viewer once it has applied (or rejected) the highlight. */
  consume: (itemId: string) => void;
}

const Ctx = createContext<HighlightApi | null>(null);

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HighlightTarget | null>(null);

  const request = useCallback((t: HighlightTarget) => {
    setTarget(t);
  }, []);

  const consume = useCallback((itemId: string) => {
    setTarget((prev) => (prev?.itemId === itemId ? null : prev));
  }, []);

  const value = useMemo<HighlightApi>(
    () => ({ target, request, consume }),
    [target, request, consume],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHighlight(): HighlightApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHighlight must be used inside HighlightProvider');
  return ctx;
}

/**
 * Returns the highlight query string if this item is the current target,
 * otherwise an empty string. Consumption is the caller's responsibility;
 * call `useHighlight().consume(itemId)` once you've scrolled/highlighted.
 */
export function useHighlightFor(itemId: string): string {
  const { target } = useHighlight();
  return target?.itemId === itemId ? target.query : '';
}
