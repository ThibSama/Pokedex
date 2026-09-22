import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchPokemonById } from '@/api/pokeApi';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeColor, PALETTE, withAlpha } from '@/constants/typeColors';
import { useFavorites } from '@/favorites/FavoritesProvider';
import type { NationalDexId, PokemonSummary } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

/** Shown as the hero while the collection is still empty. */
const FALLBACK_HERO_ID: NationalDexId = 197;

/** Outcome of the hero fetch, tagged with the id it was requested for. */
type HeroResult =
  | { id: NationalDexId; status: 'success'; pokemon: PokemonSummary }
  | { id: NationalDexId; status: 'error'; message: string };

function pickRandom(ids: readonly NationalDexId[]): NationalDexId {
  return ids[Math.floor(Math.random() * ids.length)];
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hydrated, favoriteIds } = useFavorites();

  const [heroId, setHeroId] = useState<NationalDexId | null>(null);
  const [result, setResult] = useState<HeroResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  const favoritesKey = favoriteIds.join(',');
  const [selectedFor, setSelectedFor] = useState<string | null>(null);

  // Hero selection is adjusted during render (the React "derived state" pattern)
  // and guarded by `selectedFor`, so the random draw runs once per favorite set
  // instead of on every render.
  if (hydrated && selectedFor !== favoritesKey) {
    setSelectedFor(favoritesKey);
    if (favoriteIds.length === 0) {
      // No collection yet, or the last favorite was just removed.
      setHeroId(FALLBACK_HERO_ID);
    } else if (heroId === null || !favoriteIds.includes(heroId)) {
      // Keep the current hero while it is still a favorite; a new one is drawn
      // only on first selection or when the hero left the collection.
      setHeroId(pickRandom(favoriteIds));
    }
  }

  useEffect(() => {
    if (heroId === null) return;
    const requestedId = heroId;
    let cancelled = false;
    // Exactly one summary request: Home never loads the Dex or every favorite.
    fetchPokemonById(requestedId)
      .then((pokemon) => {
        if (!cancelled) setResult({ id: requestedId, status: 'success', pokemon });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({
            id: requestedId,
            status: 'error',
            message: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [heroId, attempt]);

  // A result belongs to the current hero only while its id still matches, so
  // selecting another hero shows the loading state without an extra setState.
  const state = useMemo<HeroResult | { status: 'loading' }>(
    () => (result !== null && result.id === heroId ? result : { status: 'loading' }),
    [result, heroId],
  );

  const retry = useCallback(() => {
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);
  const openHero = useCallback(() => {
    if (state.status === 'success') {
      router.push({ pathname: '/pokemon/[id]', params: { id: state.pokemon.id } });
    }
  }, [router, state]);

  const accent = state.status === 'success' ? getTypeColor(state.pokemon.types[0]) : PALETTE.medium;
  const favoriteCount = favoriteIds.length;
  const isFallbackHero = hydrated && favoriteCount === 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.hero, { backgroundColor: accent }]}>
          <Text style={styles.heroKicker}>{isFallbackHero ? 'Pokémon vedette' : 'Votre vedette'}</Text>

          {!hydrated || state.status === 'loading' ? (
            <View style={styles.heroPlaceholder} accessibilityRole="progressbar">
              <ActivityIndicator color={PALETTE.white} />
              <Text style={styles.heroPlaceholderText}>
                {hydrated ? 'Chargement du Pokémon…' : 'Lecture de la collection…'}
              </Text>
            </View>
          ) : state.status === 'error' ? (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>Impossible de charger la vedette.</Text>
              <Text style={styles.heroErrorDetail}>{state.message}</Text>
              <Pressable
                onPress={retry}
                accessibilityRole="button"
                accessibilityLabel="Réessayer de charger le Pokémon vedette"
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={openHero}
              accessibilityRole="button"
              accessibilityLabel={`${state.pokemon.names.fr}, numéro ${formatDexNumber(state.pokemon.id)}, type ${state.pokemon.types.join(' et ')}`}
              accessibilityHint="Ouvre la fiche détaillée du Pokémon"
              style={({ pressed }) => [styles.heroBody, pressed && styles.pressed]}
            >
              <Image
                source={state.pokemon.sprites.normal}
                style={styles.heroArtwork}
                contentFit="contain"
                accessibilityLabel={`Illustration de ${state.pokemon.names.fr}`}
              />
              <Text style={styles.heroDexNumber}>{formatDexNumber(state.pokemon.id)}</Text>
              <Text style={styles.heroName}>{state.pokemon.names.fr}</Text>
              <View style={styles.heroTypes}>
                {state.pokemon.types.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </View>
              <Text style={styles.heroCta}>Voir la fiche →</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/pokedex')}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir le Pokédex"
            accessibilityHint="Affiche la liste des Pokémon"
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <Text style={styles.actionTitle}>Pokédex</Text>
            <Text style={styles.actionSubtitle}>Parcourir et rechercher les 251 Pokémon</Text>
            <Text style={[styles.actionBadge, { backgroundColor: withAlpha(accent, 0.15), color: accent }]}>
              Explorer
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/collection')}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir la collection, ${favoriteCount} Pokémon favori${favoriteCount > 1 ? 's' : ''}`}
            accessibilityHint="Affiche vos Pokémon favoris"
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <Text style={styles.actionTitle}>Collection</Text>
            <Text style={styles.actionSubtitle}>Vos Pokémon favoris, toujours à portée</Text>
            <Text style={[styles.actionBadge, { backgroundColor: withAlpha(accent, 0.15), color: accent }]}>
              {hydrated ? `${favoriteCount} favori${favoriteCount > 1 ? 's' : ''}` : '…'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
    minHeight: 380,
    justifyContent: 'center',
  },
  heroKicker: {
    color: withAlpha(PALETTE.white, 0.85),
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  heroPlaceholderText: {
    color: PALETTE.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroErrorDetail: {
    color: withAlpha(PALETTE.white, 0.8),
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PALETTE.white,
  },
  retryText: {
    color: PALETTE.dark,
    fontWeight: '700',
  },
  heroBody: {
    alignItems: 'center',
    gap: 8,
  },
  heroArtwork: {
    width: 220,
    height: 220,
  },
  heroDexNumber: {
    color: withAlpha(PALETTE.white, 0.85),
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroName: {
    color: PALETTE.white,
    fontSize: 32,
    fontWeight: '800',
  },
  heroTypes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroCta: {
    marginTop: 8,
    color: PALETTE.white,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.dark,
  },
  actionSubtitle: {
    fontSize: 13,
    color: PALETTE.medium,
  },
  actionBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
});
