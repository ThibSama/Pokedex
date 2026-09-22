import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { fetchPokemonById } from '@/api/pokeApi';
import { useFrameWidth } from '@/components/AppShell';
import { PrimaryButton, StateView } from '@/components/Controls';
import { goBack, PokedexHeader, PokedexScreen, PokedexSurface } from '@/components/PokedexShell';
import { PokemonCard } from '@/components/PokemonCard';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { COLORS, MESSAGE, RADIUS, SHELL, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';
import type { NationalDexId, PokemonSummary } from '@/types/pokemon';
import { GRID_GAP, gridColumns, gridTileWidth } from '@/utils/grid';

type LoadStatus = 'loading' | 'idle' | 'error';

export default function CollectionScreen() {
  const { hydrated, favoriteIds } = useFavorites();
  const frameWidth = useFrameWidth();

  const [items, setItems] = useState<PokemonSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Summaries already fetched this session; removing a favorite must not
  // re-request the ones that stay.
  const cache = useRef(new Map<NationalDexId, PokemonSummary>());

  // Only the persisted favorite ids are requested — never the full Dex.
  const key = favoriteIds.join(',');

  useEffect(() => {
    if (!hydrated) return;
    const ids: NationalDexId[] = key.length === 0 ? [] : key.split(',').map(Number);
    const missing = ids.filter((id) => !cache.current.has(id));

    // Builds the list in favorite insertion order from whatever is cached.
    const collect = () => ids.map((id) => cache.current.get(id)).filter((item) => item !== undefined);

    if (missing.length === 0) {
      setItems(collect());
      setErrorMessage(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    Promise.all(missing.map(fetchPokemonById))
      .then((summaries) => {
        if (cancelled || !mounted.current) return;
        for (const summary of summaries) cache.current.set(summary.id, summary);
        setItems(collect());
        setErrorMessage(null);
        setStatus('idle');
      })
      .catch((error: unknown) => {
        if (cancelled || !mounted.current) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Three columns on a phone, dropping to two only on unusually narrow frames.
  const { columns, cardWidth } = useMemo(() => {
    const content = frameWidth - 2 * SHELL.inset - 2 * SHELL.listPadding;
    const count = gridColumns(content);
    return { columns: count, cardWidth: gridTileWidth(content, count) };
  }, [frameWidth]);

  const count = favoriteIds.length;

  return (
    <PokedexScreen>
      <PokedexHeader
        title="Collection"
        trailing={hydrated && count > 0 ? `${count} favori${count > 1 ? 's' : ''}` : undefined}
        onBack={() => goBack('/')}
      />

      <PokedexSurface>
        {!hydrated || status === 'loading' ? (
          <StateView>
            <ActivityIndicator color={COLORS.red} />
            <Text style={MESSAGE.muted}>
              {hydrated ? 'Chargement de la collection…' : 'Lecture de la collection…'}
            </Text>
          </StateView>
        ) : status === 'error' ? (
          <StateView>
            <Text style={MESSAGE.error}>Collection indisponible</Text>
            <Text style={MESSAGE.muted}>{errorMessage}</Text>
            <PrimaryButton label="Réessayer" onPress={retry} />
          </StateView>
        ) : items.length === 0 ? (
          <StateView>
            <View style={styles.emptyBadge}>
              <MaterialCommunityIcons name="heart-outline" size={44} color={COLORS.red} />
            </View>
            <Text style={styles.emptyTitle}>Collection vide</Text>
            <Text style={MESSAGE.muted}>
              Ouvrez la fiche d’un Pokémon et touchez le cœur pour l’ajouter à votre collection.
            </Text>
            <PrimaryButton
              label="Ouvrir le Pokédex"
              onPress={() => router.push('/pokedex')}
              accessibilityLabel="Ouvrir le Pokédex"
              accessibilityHint="Affiche la liste des Pokémon"
            />
          </StateView>
        ) : (
          <FlatList
            // `items` is already in favorite insertion order, oldest first.
            data={items}
            key={`grid-${columns}`}
            numColumns={columns}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <PokemonCard pokemon={item} width={cardWidth} />}
            contentContainerStyle={styles.list}
            columnWrapperStyle={columns > 1 ? styles.column : undefined}
          />
        )}
      </PokedexSurface>
    </PokedexScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SHELL.listPadding,
    paddingBottom: SPACING.lg,
    gap: GRID_GAP,
    flexGrow: 1,
  },
  column: {
    gap: GRID_GAP,
  },
  emptyBadge: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    ...TYPO.subtitle1,
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.dark,
    textAlign: 'center',
  },
});
