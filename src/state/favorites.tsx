import { useCallback, useMemo } from 'react';
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

interface FavoritesValue {
  favorites: Favorite[];
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggleFavorite: (kind: FavoriteKind, id: string) => ToggleResult;
  max: number;
}

/** Pass-through wrapper kept so call sites stay unchanged. Favorites now live
 *  on the groups/items rows themselves so they sync via Supabase. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useFavorites(): FavoritesValue {
  const store = useStore();

  const favorites = useMemo<Favorite[]>(() => {
    const out: Favorite[] = [];
    for (const g of store.groups) {
      if (g.favoritedAt) {
        out.push({ kind: 'group', id: g.id, addedAt: g.favoritedAt });
      }
    }
    for (const it of store.items) {
      if (it.favoritedAt) {
        out.push({ kind: 'item', id: it.id, addedAt: it.favoritedAt });
      }
    }
    // Most recently favorited last so consumer ordering ("oldest first") stays
    // stable as users add new favorites. Sidebar/HomePage consumers can flip
    // this if they want newest-first.
    out.sort((a, b) => a.addedAt - b.addedAt);
    return out;
  }, [store.groups, store.items]);

  const isFavorite = useCallback<FavoritesValue['isFavorite']>(
    (kind, id) => {
      if (kind === 'group') {
        return !!store.groups.find((g) => g.id === id)?.favoritedAt;
      }
      return !!store.items.find((i) => i.id === id)?.favoritedAt;
    },
    [store.groups, store.items],
  );

  const toggleFavorite = useCallback<FavoritesValue['toggleFavorite']>(
    (kind, id) => {
      const currentlyFav = isFavorite(kind, id);
      if (!currentlyFav && favorites.length >= FAVORITES_MAX) return 'limit';
      if (kind === 'group') store.setGroupFavorite(id, !currentlyFav);
      else store.setItemFavorite(id, !currentlyFav);
      return currentlyFav ? 'removed' : 'added';
    },
    [favorites.length, isFavorite, store],
  );

  return useMemo<FavoritesValue>(
    () => ({ favorites, isFavorite, toggleFavorite, max: FAVORITES_MAX }),
    [favorites, isFavorite, toggleFavorite],
  );
}
