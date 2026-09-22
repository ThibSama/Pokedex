import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_BATCH_SIZE, fetchPokemonBatch } from '@/api/pokeApi';
import { PokemonCard } from '@/components/PokemonCard';
import { getTypeColor, PALETTE } from '@/constants/typeColors';
import { FONT_FAMILY, TYPO } from '@/theme/typography';
import type { PokemonSummary } from '@/types/pokemon';
import {
  DEFAULT_LIST_OPTIONS,
  applyListOptions,
  collectTypes,
  mergeUnique,
  type ListOptions,
  type SortMode,
} from '@/utils/pokemonList';

type LoadStatus = 'loading' | 'loadingMore' | 'idle' | 'error';

const SORT_LABELS: Record<SortMode, string> = { dex: 'numéro du Pokédex', name: 'nom' };
/** Icon-only sort control: the glyph itself says which order is active. */
const SORT_ICONS: Record<SortMode, 'sort-numeric-variant' | 'sort-alphabetical-variant'> = {
  dex: 'sort-numeric-variant',
  name: 'sort-alphabetical-variant',
};
const SORT_MODES = Object.keys(SORT_ICONS) as SortMode[];

/** Figma list frame 1017:431. */
const POKEDEX_RED = '#DC0A2D';
const HEADER_PADDING = 16;
const COLUMNS = 3;
/** White sheet inset from the red shell, per Figma. */
const SHELL_PADDING = 4;
const LIST_PADDING = 12;
const GRID_GAP = 8;

/**
 * Tile width for exactly `COLUMNS` columns across the grid's content box.
 * Fractional on purpose: rounding down leaves unused white space on the right.
 * 360px → 104, 393px → 115.
 */
function tileWidth(windowWidth: number): number {
  const content = windowWidth - 2 * SHELL_PADDING - 2 * LIST_PADDING;
  return Math.max(48, (content - (COLUMNS - 1) * GRID_GAP) / COLUMNS);
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function PokedexScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Canonical loaded data, in fetch order. Never sorted/filtered in place.
  const [items, setItems] = useState<PokemonSummary[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [options, setOptions] = useState<ListOptions>(DEFAULT_LIST_OPTIONS);

  // Guards against concurrent duplicate page requests (e.g. repeated onEndReached).
  const inFlight = useRef(false);
  const mounted = useRef(true);

  // Performs the request. Callers set the pending status first (initial state is already 'loading').
  const loadPage = useCallback((offset: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    fetchPokemonBatch({ offset, limit: DEFAULT_BATCH_SIZE })
      .then((batch) => {
        if (!mounted.current) return;
        setItems((current) => mergeUnique(current, batch.items));
        setNextOffset(offset + batch.items.length);
        setHasMore(batch.hasMore);
        setStatus('idle');
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        setStatus('error');
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadPage(0);
    return () => {
      mounted.current = false;
    };
  }, [loadPage]);

  const startLoad = (offset: number) => {
    if (inFlight.current) return;
    setStatus(offset === 0 ? 'loading' : 'loadingMore');
    setErrorMessage(null);
    loadPage(offset);
  };

  const loadMore = () => {
    if (hasMore && status === 'idle') startLoad(nextOffset);
  };

  const retry = () => startLoad(nextOffset);

  // Search/sort/filter are derived purely from client state — no network involved.
  const visible = useMemo(() => applyListOptions(items, options), [items, options]);
  const availableTypes = useMemo(() => collectTypes(items), [items]);
  const cardWidth = useMemo(() => tileWidth(width), [width]);

  const isInitialLoading = status === 'loading' && items.length === 0;
  const isInitialError = status === 'error' && items.length === 0;

  return (
    <View style={styles.screen}>
      {/* One coherent red header area: back, title, search, sort and type filters. */}
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
          <MaterialCommunityIcons name="pokeball" size={24} color={PALETTE.white} />
          <Text style={styles.title} accessibilityRole="header">
            Pokédex
          </Text>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.searchField}>
            <MaterialCommunityIcons name="magnify" size={18} color={POKEDEX_RED} />
            <TextInput
              value={options.query}
              onChangeText={(query) => setOptions((o) => ({ ...o, query }))}
              placeholder="Rechercher"
              placeholderTextColor={PALETTE.medium}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              style={styles.searchInput}
              accessibilityLabel="Rechercher un Pokémon parmi ceux déjà chargés"
              accessibilityHint="Filtre la liste par nom français, nom anglais ou numéro du Pokédex"
            />
          </View>
          <View style={styles.sortGroup} accessibilityRole="radiogroup">
            {SORT_MODES.map((mode) => {
              const selected = options.sort === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setOptions((o) => ({ ...o, sort: mode }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Trier par ${SORT_LABELS[mode]}`}
                  style={({ pressed }) => [
                    styles.sortButton,
                    selected && styles.sortButtonSelected,
                    pressed && styles.pressed,
                  ]}>
                  <MaterialCommunityIcons
                    name={SORT_ICONS[mode]}
                    size={18}
                    color={selected ? PALETTE.white : POKEDEX_RED}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Type filtering rides in the header so it never squeezes the grid. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersScroll}>
          <FilterChip
            label="Tous"
            color={null}
            selected={options.type === null}
            onPress={() => setOptions((o) => ({ ...o, type: null }))}
          />
          {availableTypes.map((type) => (
            <FilterChip
              key={type}
              label={type}
              color={getTypeColor(type)}
              selected={options.type === type}
              onPress={() => setOptions((o) => ({ ...o, type: o.type === type ? null : type }))}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.sheet}>
        {isInitialLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={POKEDEX_RED} />
            <Text style={styles.muted}>Chargement des Pokémon…</Text>
          </View>
        ) : isInitialError ? (
          <View style={styles.centered}>
            <Text style={styles.error}>Impossible de charger les Pokémon.</Text>
            <Text style={styles.muted}>{errorMessage}</Text>
            <Pressable onPress={retry} style={styles.button} accessibilityRole="button">
              <Text style={styles.buttonText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visible}
            key={`grid-${COLUMNS}`}
            numColumns={COLUMNS}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <PokemonCard pokemon={item} variant="grid" width={cardWidth} />}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.column}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.muted}>Aucun Pokémon chargé ne correspond.</Text>
              </View>
            }
            ListFooterComponent={
              <ListFooter
                status={status}
                hasMore={hasMore}
                loadedCount={items.length}
                errorMessage={errorMessage}
                onRetry={retry}
                onLoadMore={loadMore}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

function FilterChip({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  /** Type accent, or null for the catch-all chip, which shows no dot. */
  color: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label === 'Tous' ? 'Afficher tous les types' : `Filtrer par le type ${label}`}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      {color !== null && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, selected && { color: color ?? POKEDEX_RED }]}>{label}</Text>
    </Pressable>
  );
}

function ListFooter({
  status,
  hasMore,
  loadedCount,
  errorMessage,
  onRetry,
  onLoadMore,
}: {
  status: LoadStatus;
  hasMore: boolean;
  loadedCount: number;
  errorMessage: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  if (status === 'loadingMore') {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={POKEDEX_RED} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.footer}>
        <Text style={styles.error}>Échec du chargement.</Text>
        <Text style={styles.muted}>{errorMessage}</Text>
        <Pressable onPress={onRetry} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }
  if (!hasMore) {
    return (
      <View style={styles.footer}>
        <Text style={styles.muted}>Fin du Pokédex — {loadedCount} Pokémon chargés.</Text>
      </View>
    );
  }
  return (
    <View style={styles.footer}>
      <Text style={styles.muted}>{loadedCount} Pokémon chargés.</Text>
      <Pressable
        onPress={onLoadMore}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Charger plus de Pokémon">
        <Text style={styles.buttonText}>Charger plus</Text>
      </Pressable>
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
    gap: 12,
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
    color: PALETTE.white,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: HEADER_PADDING,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: PALETTE.white,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    // Body1 without its 14px line-height, which would clip descenders in a native input.
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: PALETTE.dark,
  },
  sortGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    borderRadius: 20,
    padding: 4,
    backgroundColor: PALETTE.white,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  sortButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonSelected: {
    backgroundColor: POKEDEX_RED,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: HEADER_PADDING,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chipSelected: {
    backgroundColor: PALETTE.white,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    ...TYPO.subtitle3,
    color: PALETTE.white,
    textTransform: 'capitalize',
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
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
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
