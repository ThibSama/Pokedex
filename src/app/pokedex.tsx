import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DEFAULT_BATCH_SIZE, fetchPokemonBatch } from '@/api/pokeApi';
import { useFrameWidth } from '@/components/AppShell';
import { PrimaryButton, StateView } from '@/components/Controls';
import { goBack, PokedexHeader, PokedexScreen, PokedexSurface } from '@/components/PokedexShell';
import { PokemonCard } from '@/components/PokemonCard';
import { getTypeColor } from '@/constants/typeColors';
import { COLORS, MESSAGE, OPACITY, OVERLAY, RADIUS, SHADOW, SHELL, SPACING } from '@/theme/tokens';
import { FONT_FAMILY, TYPO } from '@/theme/typography';
import type { PokemonSummary } from '@/types/pokemon';
import { GRID_GAP, gridTileWidth } from '@/utils/grid';
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
const COLUMNS = 3;

/** Content box the grid lays out in, inside the red shell and the white sheet. */
function gridContentWidth(frameWidth: number): number {
  return frameWidth - 2 * SHELL.inset - 2 * SHELL.listPadding;
}

export default function PokedexListScreen() {
  const width = useFrameWidth();

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
  const cardWidth = useMemo(() => gridTileWidth(gridContentWidth(width), COLUMNS), [width]);

  const isInitialLoading = status === 'loading' && items.length === 0;
  const isInitialError = status === 'error' && items.length === 0;

  return (
    <PokedexScreen>
      {/* One coherent red header area: back, title, search, sort and type filters. */}
      <PokedexHeader title="Pokédex" onBack={() => goBack('/')}>
        <View style={styles.controlsRow}>
          <View style={styles.searchField}>
            <MaterialCommunityIcons name="magnify" size={18} color={COLORS.red} />
            <TextInput
              value={options.query}
              onChangeText={(query) => setOptions((o) => ({ ...o, query }))}
              placeholder="Rechercher"
              placeholderTextColor={COLORS.medium}
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
                    color={selected ? COLORS.white : COLORS.red}
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
      </PokedexHeader>

      <PokedexSurface>
        {isInitialLoading ? (
          <StateView>
            <ActivityIndicator color={COLORS.red} />
            <Text style={MESSAGE.muted}>Chargement des Pokémon…</Text>
          </StateView>
        ) : isInitialError ? (
          <StateView>
            <Text style={MESSAGE.error}>Impossible de charger les Pokémon.</Text>
            <Text style={MESSAGE.muted}>{errorMessage}</Text>
            <PrimaryButton label="Réessayer" onPress={retry} />
          </StateView>
        ) : (
          <FlatList
            data={visible}
            key={`grid-${COLUMNS}`}
            numColumns={COLUMNS}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <PokemonCard pokemon={item} width={cardWidth} />}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.column}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <StateView>
                <Text style={MESSAGE.muted}>Aucun Pokémon chargé ne correspond.</Text>
              </StateView>
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
      </PokedexSurface>
    </PokedexScreen>
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
      <Text style={[styles.chipText, selected && { color: color ?? COLORS.red }]}>{label}</Text>
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
        <ActivityIndicator color={COLORS.red} />
        <Text style={MESSAGE.muted}>Chargement…</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.footer}>
        <Text style={MESSAGE.error}>Échec du chargement.</Text>
        <Text style={MESSAGE.muted}>{errorMessage}</Text>
        <PrimaryButton label="Réessayer" onPress={onRetry} />
      </View>
    );
  }
  if (!hasMore) {
    return (
      <View style={styles.footer}>
        <Text style={MESSAGE.muted}>Fin du Pokédex — {loadedCount} Pokémon chargés.</Text>
      </View>
    );
  }
  return (
    <View style={styles.footer}>
      <Text style={MESSAGE.muted}>{loadedCount} Pokémon chargés.</Text>
      <PrimaryButton
        label="Charger plus"
        onPress={onLoadMore}
        accessibilityLabel="Charger plus de Pokémon"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SHELL.headerPadding,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 40,
    borderRadius: RADIUS.field,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOW.float,
  },
  searchInput: {
    flex: 1,
    // Body1 without its 14px line-height, which would clip descenders in a native input.
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.dark,
  },
  sortGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    height: 40,
    borderRadius: RADIUS.field,
    padding: SPACING.xs,
    backgroundColor: COLORS.white,
    ...SHADOW.float,
  },
  sortButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonSelected: {
    backgroundColor: COLORS.red,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SHELL.headerPadding,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: RADIUS.chip,
    backgroundColor: OVERLAY.fill,
  },
  chipSelected: {
    backgroundColor: COLORS.white,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
  },
  chipText: {
    ...TYPO.subtitle3,
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  list: {
    paddingHorizontal: SHELL.listPadding,
    paddingBottom: SPACING.lg,
    gap: GRID_GAP,
    flexGrow: 1,
  },
  column: {
    gap: GRID_GAP,
  },
  footer: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
});
