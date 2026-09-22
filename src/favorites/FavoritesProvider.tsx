import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isSupportedDexId } from '@/api/pokeApi';
import { loadFavorites, saveFavorites } from '@/storage/favoritesStorage';
import type { FavoritePokemon, NationalDexId, SpriteVariant } from '@/types/pokemon';

interface FavoritesContextValue {
  /** False until persisted favorites have been read once. */
  hydrated: boolean;
  /** Full favorite records in insertion order (oldest first). */
  favoriteEntries: FavoritePokemon[];
  /** The same records as bare ids, for selection and fetch logic. */
  favoriteIds: NationalDexId[];
  /** The stored favorite for `id`, or undefined when it is not a favorite. */
  getFavorite: (id: number) => FavoritePokemon | undefined;
  isFavorite: (id: number) => boolean;
  /**
   * `variant` is only read when the Pokémon is not a favorite yet: it is what
   * the user had selected at that moment. Adding an existing favorite is a
   * no-op, so a later Normal/Shiny change never rewrites the stored variant.
   */
  addFavorite: (id: number, variant?: SpriteVariant) => void;
  /** Membership removal; the whole record goes, variant included. */
  removeFavorite: (id: number) => void;
  toggleFavorite: (id: number, variant?: SpriteVariant) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Holds the favorite records and mirrors every change to AsyncStorage.
 *
 * Only the Dex id and the chosen artwork variant are persisted; names, sprites
 * and types are always re-fetched from PokéAPI. Writes are chained so two quick
 * toggles cannot land out of order.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteEntries, setFavoriteEntries] = useState<FavoritePokemon[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Mirrors `favoriteEntries` so a mutation reads the latest value without
  // depending on a re-render having happened first.
  const entriesRef = useRef<FavoritePokemon[]>([]);
  // Serializes writes: each save waits for the previous one to settle, so the
  // last mutation is always the last thing written.
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  const enqueueWrite = useCallback((next: FavoritePokemon[]) => {
    writeChain.current = writeChain.current.then(() =>
      saveFavorites(next).catch(() => {
        // Storage failure must not crash the UI; memory stays authoritative
        // for this session and the next successful write repairs the payload.
      }),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadFavorites().then(({ entries, migratedFromV1 }) => {
      if (cancelled) return;
      entriesRef.current = entries;
      setFavoriteEntries(entries);
      setHydrated(true);
      // A v1 collection is rewritten in the current schema once, through the
      // same chain as every other write, so it lands in order.
      if (migratedFromV1) enqueueWrite(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [enqueueWrite]);

  const commit = useCallback(
    (next: FavoritePokemon[]) => {
      entriesRef.current = next;
      setFavoriteEntries(next);
      enqueueWrite(next);
    },
    [enqueueWrite],
  );

  const addFavorite = useCallback(
    (id: number, variant: SpriteVariant = 'normal') => {
      // Ignore mutations before hydration, which would overwrite stored entries with [].
      if (!hydrated || !isSupportedDexId(id) || entriesRef.current.some((entry) => entry.id === id)) return;
      commit([...entriesRef.current, { id, variant }]);
    },
    [commit, hydrated],
  );

  const removeFavorite = useCallback(
    (id: number) => {
      if (!hydrated || !entriesRef.current.some((entry) => entry.id === id)) return;
      commit(entriesRef.current.filter((entry) => entry.id !== id));
    },
    [commit, hydrated],
  );

  const toggleFavorite = useCallback(
    (id: number, variant: SpriteVariant = 'normal') => {
      if (entriesRef.current.some((entry) => entry.id === id)) removeFavorite(id);
      else addFavorite(id, variant);
    },
    [addFavorite, removeFavorite],
  );

  const favoriteIds = useMemo(() => favoriteEntries.map((entry) => entry.id), [favoriteEntries]);
  const favoritesById = useMemo(
    () => new Map(favoriteEntries.map((entry) => [entry.id, entry])),
    [favoriteEntries],
  );
  const getFavorite = useCallback((id: number) => favoritesById.get(id), [favoritesById]);
  const isFavorite = useCallback((id: number) => favoritesById.has(id), [favoritesById]);

  const value = useMemo(
    () => ({
      hydrated,
      favoriteEntries,
      favoriteIds,
      getFavorite,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    }),
    [
      hydrated,
      favoriteEntries,
      favoriteIds,
      getFavorite,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    ],
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
