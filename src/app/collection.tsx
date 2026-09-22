import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchPokemonById } from '@/api/pokeApi';
import { useFrameWidth } from '@/components/AppShell';
import { PokemonCard } from '@/components/PokemonCard';
import { PALETTE, POKEDEX_RED } from '@/constants/typeColors';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { TYPO } from '@/theme/typography';
import type { NationalDexId, PokemonSummary } from '@/types/pokemon';
import { GRID_GAP, gridColumns, gridTileWidth } from '@/utils/grid';

type LoadStatus = 'loading' | 'idle' | 'error';

/** Same red shell geometry as the Pokédex list, so the two screens match. */
const HEADER_PADDING = 16;
const SHELL_PADDING = 4;
const LIST_PADDING = 12;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function CollectionScreen() {
  const { hydrated, favoriteIds } = useFavorites();
  const insets = useSafeAreaInsets();
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
    const content = frameWidth - 2 * SHELL_PADDING - 2 * LIST_PADDING;
    const count = gridColumns(content);
    return { columns: count, cardWidth: gridTileWidth(content, count) };
  }, [frameWidth]);

  const count = favoriteIds.length;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={goBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Revenir à l’écran précédent"
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={PALETTE.white} />
          </Pressable>
          <MaterialCommunityIcons name="heart" size={22} color={PALETTE.white} />
          <Text style={styles.title} accessibilityRole="header">
            Collection
          </Text>
          {hydrated && count > 0 && (
            <Text style={styles.counter}>
              {count} favori{count > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.sheet}>
        {!hydrated || status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={POKEDEX_RED} />
            <Text style={styles.muted}>
              {hydrated ? 'Chargement de la collection…' : 'Lecture de la collection…'}
            </Text>
          </View>
        ) : status === 'error' ? (
          <View style={styles.centered}>
            <Text style={styles.error}>Collection indisponible</Text>
            <Text style={styles.muted}>{errorMessage}</Text>
            <Pressable
              onPress={retry}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              accessibilityRole="button">
              <Text style={styles.buttonText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <View style={styles.emptyBadge}>
              <MaterialCommunityIcons name="heart-outline" size={44} color={POKEDEX_RED} />
            </View>
            <Text style={styles.emptyTitle}>Collection vide</Text>
            <Text style={styles.muted}>
              Ouvrez la fiche d’un Pokémon et touchez le cœur pour l’ajouter à votre collection.
            </Text>
            <Pressable
              onPress={() => router.push('/pokedex')}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le Pokédex"
              accessibilityHint="Affiche la liste des Pokémon">
              <Text style={styles.buttonText}>Ouvrir le Pokédex</Text>
            </Pressable>
          </View>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: POKEDEX_RED,
  },
  header: {
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: HEADER_PADDING - 8,
    paddingRight: HEADER_PADDING,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPO.headline,
    flex: 1,
    color: PALETTE.white,
  },
  counter: {
    ...TYPO.subtitle2,
    color: PALETTE.white,
    fontVariant: ['tabular-nums'],
  },
  sheet: {
    flex: 1,
    backgroundColor: PALETTE.white,
    marginHorizontal: SHELL_PADDING,
    marginBottom: SHELL_PADDING,
    borderRadius: 8,
    paddingTop: 8,
  },
  list: {
    paddingHorizontal: LIST_PADDING,
    paddingBottom: 16,
    gap: GRID_GAP,
    flexGrow: 1,
  },
  column: {
    gap: GRID_GAP,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.background,
    marginBottom: 4,
  },
  emptyTitle: {
    ...TYPO.subtitle1,
    fontSize: 18,
    lineHeight: 24,
    color: PALETTE.dark,
    textAlign: 'center',
  },
  muted: {
    ...TYPO.body2,
    color: PALETTE.medium,
    textAlign: 'center',
  },
  error: {
    ...TYPO.subtitle1,
    color: POKEDEX_RED,
    textAlign: 'center',
  },
  button: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: POKEDEX_RED,
  },
  buttonText: {
    ...TYPO.subtitle2,
    color: PALETTE.white,
  },
  pressed: {
    opacity: 0.7,
  },
});
