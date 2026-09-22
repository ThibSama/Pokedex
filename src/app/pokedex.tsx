import { Stack } from 'expo-router';
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

import { DEFAULT_BATCH_SIZE, fetchPokemonBatch } from '@/api/pokeApi';
import { PokemonCard } from '@/components/PokemonCard';
import { getTypeColor, PALETTE } from '@/constants/typeColors';
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

const SORT_LABELS: Record<SortMode, string> = { dex: 'N° Dex', name: 'Nom' };

/** Figma list frame 1024:1850. */
const POKEDEX_RED = '#DC0A2D';
const COLUMNS = 3;
const SHELL_PADDING = 8;
const LIST_PADDING = 12;
const GRID_GAP = 8;

/**
 * Tile width that always fits 3 columns, derived from the window rather than the
 * 360px Figma frame. The floor only guards against a degenerate window width.
 */
function tileWidth(windowWidth: number): number {
  const available = windowWidth - 2 * SHELL_PADDING - 2 * LIST_PADDING - (COLUMNS - 1) * GRID_GAP;
  return Math.max(48, Math.floor(available / COLUMNS));
}

export default function PokedexScreen() {
  const { width } = useWindowDimensions();

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
      {/* The screen paints its own red header area, so the native bar only keeps the back affordance. */}
      <Stack.Screen
        options={{
          headerTitle: '',
          headerStyle: { backgroundColor: POKEDEX_RED },
          headerTintColor: PALETTE.white,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Pokédex
        </Text>
        <View style={styles.controlsRow}>
          <TextInput
            value={options.query}
            onChangeText={(query) => setOptions((o) => ({ ...o, query }))}
            placeholder="Rechercher"
            placeholderTextColor={PALETTE.medium}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            style={styles.search}
            accessibilityLabel="Rechercher un Pokémon parmi ceux déjà chargés"
            accessibilityHint="Filtre la liste par nom français, nom anglais ou numéro du Pokédex"
          />
          <View style={styles.sortGroup} accessibilityRole="radiogroup">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => {
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
                  ]}
                >
                  <Text style={[styles.sortText, selected && styles.sortTextSelected]}>
                    {SORT_LABELS[mode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersScroll}
        >
          <FilterChip
            label="Tous"
            color={PALETTE.medium}
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
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label === 'Tous' ? 'Afficher tous les types' : `Filtrer par le type ${label}`}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
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
        accessibilityLabel="Charger plus de Pokémon"
      >
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
    paddingHorizontal: SHELL_PADDING + 8,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    color: PALETTE.white,
    fontSize: 24,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    minHeight: 44,
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: PALETTE.dark,
  },
  sortGroup: {
    flexDirection: 'row',
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 2,
  },
  sortButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  sortButtonSelected: {
    backgroundColor: POKEDEX_RED,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '700',
    color: POKEDEX_RED,
  },
  sortTextSelected: {
    color: PALETTE.white,
  },
  sheet: {
    flex: 1,
    backgroundColor: PALETTE.white,
    marginHorizontal: SHELL_PADDING,
    marginBottom: SHELL_PADDING,
    borderRadius: 12,
    paddingTop: 8,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: LIST_PADDING,
    paddingBottom: 8,
  },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.light,
    backgroundColor: PALETTE.background,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.medium,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: PALETTE.white,
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
    fontSize: 14,
    color: PALETTE.medium,
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    fontWeight: '600',
    color: POKEDEX_RED,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: POKEDEX_RED,
  },
  buttonText: {
    color: PALETTE.white,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
