import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fetchPokemonById, resolveSprite } from '@/api/pokeApi';
import { useFrameWidth } from '@/components/AppShell';
import { PrimaryButton, StateView } from '@/components/Controls';
import { goBack, PokedexHeader, PokedexScreen, PokedexSurface } from '@/components/PokedexShell';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { usePokemonText } from '@/i18n/pokemonText';
import { COLORS, MESSAGE, OPACITY, RADIUS, SHELL, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';
import type { NationalDexId, PokemonSummary, SpriteVariant } from '@/types/pokemon';
import { GRID_GAP, gridColumns, gridTileWidth } from '@/utils/grid';

type LoadStatus = 'loading' | 'idle' | 'error';

const SHINY_BADGE_SIZE = 24;

export default function CollectionScreen() {
  const { t } = useTranslation();
  const { hydrated, favoriteEntries, favoriteIds, getFavorite } = useFavorites();
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
        setErrorMessage(error instanceof Error ? error.message : null);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /**
   * Box geometry. A single favorite is staged as one wide object instead of a
   * lonely tile in the top-left corner; from two on, the box fills two by two
   * and steps down to one column only on unusually narrow frames.
   */
  const { columns, slotWidth } = useMemo(() => {
    const content = frameWidth - 2 * SHELL.inset - 2 * SHELL.listPadding;
    const count = favoriteEntries.length <= 1 ? 1 : gridColumns(content, 2);
    return { columns: count, slotWidth: gridTileWidth(content, count) };
  }, [frameWidth, favoriteEntries.length]);

  const count = favoriteIds.length;

  return (
    <PokedexScreen>
      <PokedexHeader
        title={t('collection.title')}
        trailing={hydrated && count > 0 ? t('collection.count', { count }) : undefined}
        onBack={() => goBack('/')}
      />

      <PokedexSurface>
        {!hydrated || status === 'loading' ? (
          <StateView>
            <ActivityIndicator color={COLORS.red} />
            <Text style={MESSAGE.muted}>
              {t(hydrated ? 'collection.loading' : 'common.readingCollection')}
            </Text>
          </StateView>
        ) : status === 'error' ? (
          <StateView>
            <Text style={MESSAGE.error}>{t('collection.error')}</Text>
            <Text style={MESSAGE.muted}>{errorMessage ?? t('common.unknownError')}</Text>
            <PrimaryButton label={t('common.retry')} onPress={retry} />
          </StateView>
        ) : items.length === 0 ? (
          <StateView>
            <View style={styles.emptyBadge}>
              <MaterialCommunityIcons name="heart-outline" size={44} color={COLORS.red} />
            </View>
            <Text style={styles.emptyTitle}>{t('collection.emptyTitle')}</Text>
            <Text style={MESSAGE.muted}>{t('collection.emptyBody')}</Text>
            <PrimaryButton
              label={t('collection.openPokedex')}
              onPress={() => router.push('/pokedex')}
              accessibilityLabel={t('home.pokedexCard.label')}
              accessibilityHint={t('home.pokedexCard.hint')}
            />
          </StateView>
        ) : (
          <FlatList
            // `items` is already in favorite insertion order, oldest first.
            data={items}
            key={`box-${columns}`}
            numColumns={columns}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <CollectionSlot
                pokemon={item}
                width={slotWidth}
                variant={getFavorite(item.id)?.variant ?? 'normal'}
              />
            )}
            contentContainerStyle={styles.box}
            columnWrapperStyle={columns > 1 ? styles.boxRow : undefined}
          />
        )}
      </PokedexSurface>
    </PokedexScreen>
  );
}

/**
 * One Pokémon in the box: artwork on a soft slot, its name underneath, and a
 * sparkle badge when the favorite was stored as Shiny. No Dex number, no footer
 * band — the artwork is the object, the slot is only where it stands.
 */
function CollectionSlot({
  pokemon,
  width,
  variant,
}: {
  pokemon: PokemonSummary;
  /** Slot width; the slot is square so the artwork scales with the box. */
  width: number;
  /** Stored variant of this favorite, which is what the slot must show. */
  variant: SpriteVariant;
}) {
  const { t } = useTranslation();
  const { name, cardLabel } = usePokemonText();
  // `Link asChild` hands the child to Radix's Slot, which merges styles with an
  // object spread: a style *function* or array would silently become `{}`. So
  // press state is tracked here and flattened into the single object Slot takes.
  const [pressed, setPressed] = useState(false);
  const style = StyleSheet.flatten<ViewStyle>([styles.slot, { width, height: width }, pressed && styles.pressed]);

  const isShiny = variant === 'shiny';
  const sprite = resolveSprite(pokemon.sprites, variant);

  return (
    <Link href={{ pathname: '/pokemon/[id]', params: { id: pokemon.id, variant } }} asChild>
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={cardLabel(pokemon, isShiny)}
        accessibilityHint={t('pokemon.openHint')}
        style={style}>
        {isShiny && (
          <View style={styles.shinyBadge}>
            <MaterialCommunityIcons name="star-four-points" size={14} color={COLORS.red} />
          </View>
        )}
        {sprite !== null && (
          <Image source={sprite} style={styles.slotArtwork} contentFit="contain" />
        )}
        <Text style={styles.slotName} numberOfLines={1}>
          {name(pokemon)}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  box: {
    // A sparse box sits in the middle of the sheet instead of hugging the top
    // edge; once it is taller than the sheet this grows with the content.
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SHELL.listPadding,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    gap: GRID_GAP,
  },
  boxRow: {
    gap: GRID_GAP,
  },
  slot: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
  slotArtwork: {
    flex: 1,
    alignSelf: 'stretch',
  },
  slotName: {
    ...TYPO.body2,
    color: COLORS.dark,
    textAlign: 'center',
  },
  shinyBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: SHINY_BADGE_SIZE,
    height: SHINY_BADGE_SIZE,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
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
