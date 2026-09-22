import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchPokemonById } from '@/api/pokeApi';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeColor, PALETTE, POKEDEX_RED, withAlpha } from '@/constants/typeColors';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { TYPO } from '@/theme/typography';
import type { NationalDexId, PokemonSummary } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

/** Shown as the hero while the collection is still empty. */
const FALLBACK_HERO_ID: NationalDexId = 197;

/** Outcome of the hero fetch, tagged with the id it was requested for. */
type HeroResult =
  | { id: NationalDexId; status: 'success'; pokemon: PokemonSummary }
  | { id: NationalDexId; status: 'error'; message: string };

/** Same barely-there Pokéball the detail screen paints behind its artwork. */
const WATERMARK_SIZE = 208;

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
        <View style={styles.brand}>
          <MaterialCommunityIcons name="pokeball" size={28} color={POKEDEX_RED} />
          <View style={styles.brandText}>
            <Text style={styles.brandTitle} accessibilityRole="header">
              Pokédex
            </Text>
            <Text style={styles.brandSubtitle}>Johto & Kanto · 251 Pokémon</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: accent }]}>
          {/* Same watermark as the detail screen, so the two heroes read alike. */}
          <View style={styles.watermark} pointerEvents="none">
            <MaterialCommunityIcons name="pokeball" size={WATERMARK_SIZE} color="rgba(255, 255, 255, 0.12)" />
          </View>

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
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>Voir la fiche</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={accent} />
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.actions}>
          <ActionCard
            accent={POKEDEX_RED}
            icon="format-list-bulleted"
            title="Pokédex"
            subtitle="Rechercher, trier et filtrer"
            value="251"
            unit="Pokémon"
            accessibilityLabel="Ouvrir le Pokédex"
            accessibilityHint="Affiche la liste des Pokémon"
            onPress={() => router.push('/pokedex')}
          />
          <ActionCard
            accent={accent}
            icon="heart"
            title="Collection"
            subtitle="Vos Pokémon favoris"
            value={hydrated ? String(favoriteCount) : '…'}
            unit={favoriteCount > 1 ? 'favoris' : 'favori'}
            accessibilityLabel={`Ouvrir la collection, ${favoriteCount} Pokémon favori${favoriteCount > 1 ? 's' : ''}`}
            accessibilityHint="Affiche vos Pokémon favoris"
            onPress={() => router.push('/collection')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/** One dashboard tile: accent icon chip, label, and a live count in accent. */
function ActionCard({
  accent,
  icon,
  title,
  subtitle,
  value,
  unit,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: {
  accent: string;
  icon: 'format-list-bulleted' | 'heart';
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.actionCard, { borderTopColor: accent }, pressed && styles.pressed]}
    >
      <View style={[styles.actionIcon, { backgroundColor: withAlpha(accent, 0.14) }]}>
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
      <View style={styles.actionMetric}>
        <Text style={[styles.actionValue, { color: accent }]}>{value}</Text>
        <Text style={styles.actionUnit}>{unit}</Text>
      </View>
    </Pressable>
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
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    gap: 2,
  },
  brandTitle: {
    ...TYPO.headline,
    color: PALETTE.dark,
  },
  brandSubtitle: {
    ...TYPO.body2,
    color: PALETTE.medium,
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
    minHeight: 380,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: -32,
    right: -32,
  },
  heroKicker: {
    ...TYPO.subtitle3,
    color: withAlpha(PALETTE.white, 0.85),
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
    ...TYPO.subtitle1,
    color: PALETTE.white,
    textAlign: 'center',
  },
  heroErrorDetail: {
    ...TYPO.body2,
    color: withAlpha(PALETTE.white, 0.8),
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PALETTE.white,
  },
  retryText: {
    ...TYPO.subtitle1,
    color: PALETTE.dark,
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
    ...TYPO.subtitle2,
    color: withAlpha(PALETTE.white, 0.85),
    fontVariant: ['tabular-nums'],
  },
  heroName: {
    ...TYPO.headline,
    fontSize: 32,
    lineHeight: 40,
    color: PALETTE.white,
  },
  heroTypes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroCta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 14,
    paddingRight: 10,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.white,
  },
  heroCtaText: {
    ...TYPO.subtitle2,
    color: PALETTE.dark,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    // A thick accent edge is what keeps the two tiles telling themselves apart.
    borderTopWidth: 4,
    padding: 14,
    gap: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    ...TYPO.subtitle1,
    fontSize: 16,
    lineHeight: 20,
    color: PALETTE.dark,
  },
  actionSubtitle: {
    ...TYPO.body3,
    color: PALETTE.medium,
  },
  actionMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  actionValue: {
    ...TYPO.headline,
    fontVariant: ['tabular-nums'],
  },
  actionUnit: {
    ...TYPO.body3,
    color: PALETTE.medium,
  },
  pressed: {
    opacity: 0.75,
  },
});
