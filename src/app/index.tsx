import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchPokemonById } from '@/api/pokeApi';
import { PokedexHeader, PokedexScreen, PokedexSurface } from '@/components/PokedexShell';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeColor, withAlpha } from '@/constants/typeColors';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { COLORS, MESSAGE, OPACITY, OVERLAY, RADIUS, SPACING } from '@/theme/tokens';
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

  const accent = state.status === 'success' ? getTypeColor(state.pokemon.types[0]) : COLORS.medium;
  const favoriteCount = favoriteIds.length;
  const isFallbackHero = hydrated && favoriteCount === 0;

  return (
    <PokedexScreen>
      <PokedexHeader title="Pokédex" subtitle="Johto & Kanto · 251 Pokémon" />

      {/* Home is a screen inside the Pokédex, not a separate page: the white
          sheet holds the hero and the shortcuts, and only the hero itself is
          painted in the Pokémon's type color. */}
      <PokedexSurface>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { backgroundColor: accent }]}>
            {/* Same watermark as the detail screen, so the two heroes read alike. */}
            <View style={styles.watermark} pointerEvents="none">
              <MaterialCommunityIcons name="pokeball" size={WATERMARK_SIZE} color={OVERLAY.watermark} />
            </View>

            <Text style={styles.heroKicker}>{isFallbackHero ? 'Pokémon vedette' : 'Votre vedette'}</Text>

            {!hydrated || state.status === 'loading' ? (
              <View style={styles.heroPlaceholder} accessibilityRole="progressbar">
                <ActivityIndicator color={COLORS.white} />
                <Text style={styles.heroPlaceholderText}>
                  {hydrated ? 'Chargement du Pokémon…' : 'Lecture de la collection…'}
                </Text>
              </View>
            ) : state.status === 'error' ? (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroPlaceholderText}>Impossible de charger la vedette.</Text>
                <Text style={MESSAGE.onColor}>{state.message}</Text>
                {/* White pill on the type accent: the hero's own action form,
                    matching the "Voir la fiche" pill below it. */}
                <Pressable
                  onPress={retry}
                  accessibilityRole="button"
                  accessibilityLabel="Réessayer de charger le Pokémon vedette"
                  style={({ pressed }) => [styles.heroPill, pressed && styles.pressed]}>
                  <Text style={styles.heroPillText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={openHero}
                accessibilityRole="button"
                accessibilityLabel={`${state.pokemon.names.fr}, numéro ${formatDexNumber(state.pokemon.id)}, type ${state.pokemon.types.join(' et ')}`}
                accessibilityHint="Ouvre la fiche détaillée du Pokémon"
                style={({ pressed }) => [styles.heroBody, pressed && styles.pressed]}>
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
                  <Text style={styles.heroPillText}>Voir la fiche</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={accent} />
                </View>
              </Pressable>
            )}
          </View>

          <View style={styles.actions}>
            <ActionCard
              accent={COLORS.red}
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
      </PokedexSurface>
    </PokedexScreen>
  );
}

/** One shortcut tile: accent icon chip, label, and a live count in accent. */
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
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    gap: SPACING.md,
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
    color: OVERLAY.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  heroPlaceholderText: {
    ...TYPO.subtitle1,
    color: COLORS.white,
    textAlign: 'center',
  },
  heroPill: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
  },
  heroPillText: {
    ...TYPO.subtitle1,
    color: COLORS.dark,
  },
  heroBody: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroArtwork: {
    width: 220,
    height: 220,
  },
  heroDexNumber: {
    ...TYPO.subtitle2,
    color: OVERLAY.text,
    fontVariant: ['tabular-nums'],
  },
  heroName: {
    ...TYPO.headline,
    fontSize: 32,
    lineHeight: 40,
    color: COLORS.white,
  },
  heroTypes: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  heroCta: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 14,
    paddingRight: 10,
    height: 32,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.white,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.card,
    // A thick accent edge is what keeps the two tiles telling themselves apart.
    borderTopWidth: 4,
    padding: 14,
    gap: SPACING.xs,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  actionTitle: {
    ...TYPO.subtitle1,
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.dark,
  },
  actionSubtitle: {
    ...TYPO.body3,
    color: COLORS.medium,
  },
  actionMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginTop: 6,
  },
  actionValue: {
    ...TYPO.headline,
    fontVariant: ['tabular-nums'],
  },
  actionUnit: {
    ...TYPO.body3,
    color: COLORS.medium,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
});
