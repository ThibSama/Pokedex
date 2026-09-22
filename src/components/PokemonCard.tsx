import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PokemonSummary } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

interface PokemonCardProps {
  pokemon: PokemonSummary;
}

export function PokemonCard({ pokemon }: PokemonCardProps) {
  return (
    <Link href={{ pathname: '/pokemon/[id]', params: { id: pokemon.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <Image
          source={pokemon.sprites.normal}
          style={styles.artwork}
          contentFit="contain"
          accessibilityLabel={pokemon.names.fr}
        />
        <View style={styles.body}>
          <Text style={styles.dexNumber}>{formatDexNumber(pokemon.id)}</Text>
          <Text style={styles.name}>{pokemon.names.fr}</Text>
          <View style={styles.types}>
            {pokemon.types.map((type) => (
              <Text key={type} style={styles.type}>
                {type}
              </Text>
            ))}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  pressed: {
    opacity: 0.7,
  },
  artwork: {
    width: 64,
    height: 64,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  dexNumber: {
    fontSize: 13,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
  },
  types: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  type: {
    fontSize: 12,
    textTransform: 'capitalize',
    color: '#374151',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
