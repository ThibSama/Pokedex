import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchPokemonBatch } from '@/api/pokeApi';
import type { PokemonSummary } from '@/types/pokemon';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: PokemonSummary[] };

function formatDexNumber(id: number) {
  return `#${String(id).padStart(3, '0')}`;
}

export default function PokedexScreen() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  useEffect(() => {
    let cancelled = false;

    fetchPokemonBatch({ offset: 0 })
      .then((batch) => {
        if (!cancelled) setState({ status: 'success', items: batch.items });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <View style={styles.container}>
      {/* Temporary navigation action until the list links to details. */}
      <Link href="/pokemon/197" style={styles.link}>
        Open #197 (temporary)
      </Link>

      {state.status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading Pokémon…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.error}>Could not load Pokémon.</Text>
          <Text style={styles.muted}>{state.message}</Text>
          <Pressable onPress={retry} style={styles.button}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'success' && state.items.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.muted}>No Pokémon found.</Text>
        </View>
      )}

      {state.status === 'success' && state.items.length > 0 && (
        <FlatList
          data={state.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.dexNumber}>{formatDexNumber(item.id)}</Text>
              <Text style={styles.name}>{item.apiName}</Text>
              <Text style={styles.muted}>{item.types.join(' / ')}</Text>
            </View>
          )}
        />
      )}
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
    padding: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d5db',
  },
  dexNumber: {
    width: 56,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: '#6b7280',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
  },
  error: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c',
  },
  link: {
    fontSize: 16,
    color: '#1d4ed8',
    padding: 16,
    textAlign: 'center',
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
