import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useStore } from './store';

export type FavoriteKind = 'group' | 'item';

export interface Favorite {
  kind: FavoriteKind;
  id: string;
  addedAt: number;
}

export const FAVORITES_MAX = 10;

export type ToggleResult = 'added' | 'removed' | 'limit';

interface FavoritesContextValue {
  favorites: Favorite[];
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggleFavorite: (kind: FavoriteKind, id: string) => ToggleResult;
  max: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function storageKey(userId: string) {
  return `docigo:favorites:${userId}`;
}

function loadFromStorage(userId: string): Favorite[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Favorite => {
        if (!x || typeof x !== 'object') return false;
        const v = x as Record<string, unknown>;
        return (
          (v.kind === 'group' || v.kind === 'item') &&
          typeof v.id === 'string' &&
          typeof v.addedAt === 'number'
        );
      })
      .slice(0, FAVORITES_MAX);
  } catch {
    return [];
  }
}

function saveToStorage(userId: string, favs: Favorite[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(favs));
  } catch {
    // localStorage unavailable (private mode, quota) — favorites are
    // session-only in that case.
  }
}

interface FavoritesProviderProps {
  userId: string;
  children: ReactNode;
}

export function FavoritesProvider({ userId, children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<Favorite[]>(() =>
    loadFromStorage(userId),
  );

  // Reload when the signed-in user changes.
  useEffect(() => {
    setFavorites(loadFromStorage(userId));
  }, [userId]);

  const isFavorite = useCallback<FavoritesContextValue['isFavorite']>(
    (kind, id) => favorites.some((f) => f.kind === kind && f.id === id),
    [favorites],
  );

  const toggleFavorite = useCallback<FavoritesContextValue['toggleFavorite']>(
    (kind, id) => {
      let result: ToggleResult = 'removed';
      setFavorites((prev) => {
        const exists = prev.some((f) => f.kind === kind && f.id === id);
        if (exists) {
          const next = prev.filter((f) => !(f.kind === kind && f.id === id));
          saveToStorage(userId, next);
          result = 'removed';
          return next;
        }
        if (prev.length >= FAVORITES_MAX) {
          result = 'limit';
          return prev;
        }
        const next = [...prev, { kind, id, addedAt: Date.now() }];
        saveToStorage(userId, next);
        result = 'added';
        return next;
      });
      return result;
    },
    [userId],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, isFavorite, toggleFavorite, max: FAVORITES_MAX }),
    [favorites, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      <FavoritesPruner setFavorites={setFavorites} userId={userId} />
      {children}
    </FavoritesContext.Provider>
  );
}

/** Drops favorites whose target group/item no longer exists. Mounted inside
 *  the provider so it can read both the store and persist on cleanup. */
function FavoritesPruner({
  setFavorites,
  userId,
}: {
  setFavorites: React.Dispatch<React.SetStateAction<Favorite[]>>;
  userId: string;
}) {
  const { groups, items, ready } = useStore();

  useEffect(() => {
    if (!ready) return;
    const groupIds = new Set(groups.map((g) => g.id));
    const itemIds = new Set(items.map((i) => i.id));
    setFavorites((prev) => {
      const next = prev.filter((f) =>
        f.kind === 'group' ? groupIds.has(f.id) : itemIds.has(f.id),
      );
      if (next.length === prev.length) return prev;
      saveToStorage(userId, next);
      return next;
    });
  }, [groups, items, ready, setFavorites, userId]);

  return null;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
