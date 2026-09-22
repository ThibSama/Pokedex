import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchPokemonById } from '@/api/pokeApi';
import { PokemonCard } from '@/components/PokemonCard';
import { useFavorites } from '@/favorites/FavoritesProvider';
import type { NationalDexId, PokemonSummary } from '@/types/pokemon';

type LoadStatus = 'loading' | 'idle' | 'error';

export default function CollectionScreen() {
  const { hydrated, favoriteIds } = useFavorites();

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

  if (!hydrated || status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>{hydrated ? 'Chargement de la collection…' : 'Lecture de la collection…'}</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Collection indisponible</Text>
        <Text style={styles.muted}>{errorMessage}</Text>
        <Pressable onPress={retry} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Collection vide</Text>
        <Text style={styles.muted}>
          Ouvrez un Pokémon dans le Pokédex et touchez « ☆ Collection » pour l’ajouter ici.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <PokemonCard pokemon={item} />}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
