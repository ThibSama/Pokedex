import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isSupportedDexId } from '@/api/pokeApi';
import { loadFavoriteIds, saveFavoriteIds } from '@/storage/favoritesStorage';
import type { NationalDexId } from '@/types/pokemon';

interface FavoritesContextValue {
  /** False until persisted favorites have been read once. */
  hydrated: boolean;
  /** Favorite Dex ids in insertion order (oldest first). */
  favoriteIds: NationalDexId[];
  isFavorite: (id: number) => boolean;
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
  toggleFavorite: (id: number) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Holds the favorite Dex ids and mirrors every change to AsyncStorage.
 *
 * Only ids are persisted; names, sprites and types are always re-fetched from
 * PokéAPI. Writes are chained so two quick toggles cannot land out of order.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<NationalDexId[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Mirrors `favoriteIds` so a mutation reads the latest value without
  // depending on a re-render having happened first.
  const idsRef = useRef<NationalDexId[]>([]);
  // Serializes writes: each save waits for the previous one to settle, so the
  // last mutation is always the last thing written.
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    loadFavoriteIds().then((ids) => {
      if (cancelled) return;
      idsRef.current = ids;
      setFavoriteIds(ids);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: NationalDexId[]) => {
    idsRef.current = next;
    setFavoriteIds(next);
    writeChain.current = writeChain.current.then(() =>
      saveFavoriteIds(next).catch(() => {
        // Storage failure must not crash the UI; memory stays authoritative
        // for this session and the next successful write repairs the payload.
      }),
    );
  }, []);

  const addFavorite = useCallback(
    (id: number) => {
      // Ignore mutations before hydration, which would overwrite stored ids with [].
      if (!hydrated || !isSupportedDexId(id) || idsRef.current.includes(id)) return;
      commit([...idsRef.current, id]);
    },
    [commit, hydrated],
  );

  const removeFavorite = useCallback(
    (id: number) => {
      if (!hydrated || !idsRef.current.includes(id)) return;
      commit(idsRef.current.filter((entry) => entry !== id));
    },
    [commit, hydrated],
  );

  const toggleFavorite = useCallback(
    (id: number) => {
      if (idsRef.current.includes(id)) removeFavorite(id);
      else addFavorite(id);
    },
    [addFavorite, removeFavorite],
  );

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const isFavorite = useCallback((id: number) => favoriteSet.has(id), [favoriteSet]);

  const value = useMemo(
    () => ({ hydrated, favoriteIds, isFavorite, addFavorite, removeFavorite, toggleFavorite }),
    [hydrated, favoriteIds, isFavorite, addFavorite, removeFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (context === null) {
    throw new Error('useFavorites must be used inside a <FavoritesProvider>.');
  }
  return context;
}
