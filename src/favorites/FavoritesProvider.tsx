import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isSupportedDexId } from '@/api/pokeApi';
import { loadFavorites, saveFavorites } from '@/storage/favoritesStorage';
import type { FavoritePokemon, NationalDexId, SpriteVariant } from '@/types/pokemon';

interface FavoritesContextValue {
  /** Faux tant que les favoris stockés n'ont pas été lus. */
  hydrated: boolean;
  /** Ordre d'insertion, du plus ancien au plus récent. */
  favoriteEntries: FavoritePokemon[];
  favoriteIds: NationalDexId[];
  getFavorite: (id: number) => FavoritePokemon | undefined;
  isFavorite: (id: number) => boolean;
  /** `variant` n'est lu qu'au premier ajout : un favori existant garde sa variante stockée. */
  addFavorite: (id: number, variant?: SpriteVariant) => void;
  removeFavorite: (id: number) => void;
  toggleFavorite: (id: number, variant?: SpriteVariant) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

// Seuls l'id et la variante sont persistés ; le reste est rechargé depuis PokéAPI.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteEntries, setFavoriteEntries] = useState<FavoritePokemon[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Miroir de `favoriteEntries` : une mutation lit la dernière valeur sans attendre de re-rendu.
  const entriesRef = useRef<FavoritePokemon[]>([]);
  // Sérialise les écritures : la dernière mutation est toujours la dernière écrite.
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  const enqueueWrite = useCallback((next: FavoritePokemon[]) => {
    writeChain.current = writeChain.current.then(() =>
      saveFavorites(next).catch(() => {
        // Un échec de stockage ne doit pas casser l'UI : la mémoire fait foi et la
        // prochaine écriture réussie répare les données.
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
      // Une collection v1 est réécrite une fois au schéma actuel, via la même chaîne.
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
      // Ignoré avant hydratation, sinon le stockage serait écrasé par [].
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
