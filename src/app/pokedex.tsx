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
import { PokemonCard } from '@/components/PokemonCard';
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

export default function PokedexScreen() {
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

  if (status === 'loading' && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Chargement des Pokémon…</Text>
      </View>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Impossible de charger les Pokémon.</Text>
        <Text style={styles.muted}>{errorMessage}</Text>
        <Pressable onPress={retry} style={styles.button}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <TextInput
          value={options.query}
          onChangeText={(query) => setOptions((o) => ({ ...o, query }))}
          placeholder="Rechercher (nom, name, apiName, n°)"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          style={styles.search}
        />
        <View style={styles.row}>
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <Chip
              key={mode}
              label={SORT_LABELS[mode]}
              selected={options.sort === mode}
              onPress={() => setOptions((o) => ({ ...o, sort: mode }))}
            />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Chip
            label="Tous"
            selected={options.type === null}
            onPress={() => setOptions((o) => ({ ...o, type: null }))}
          />
          {availableTypes.map((type) => (
            <Chip
              key={type}
              label={type}
              selected={options.type === type}
              onPress={() => setOptions((o) => ({ ...o, type: o.type === type ? null : type }))}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <PokemonCard pokemon={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
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
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
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
        <ActivityIndicator />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.footer}>
        <Text style={styles.error}>Échec du chargement.</Text>
        <Text style={styles.muted}>{errorMessage}</Text>
        <Pressable onPress={onRetry} style={styles.button}>
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
      <Pressable onPress={onLoadMore} style={styles.button}>
        <Text style={styles.buttonText}>Charger plus</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  controls: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  search: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#1d4ed8',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  separator: {
    height: 8,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
