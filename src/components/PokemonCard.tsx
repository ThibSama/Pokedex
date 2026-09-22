import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PALETTE } from '@/constants/typeColors';
import type { PokemonSummary } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

/** `row` is the Collection list presentation; `grid` is the compact Pokédex tile. */
export type PokemonCardVariant = 'row' | 'grid';

interface PokemonCardProps {
  pokemon: PokemonSummary;
  variant?: PokemonCardVariant;
  /** Grid only: tile width, computed from the window so 3 columns always fit. */
  width?: number;
}

/** Same wording for both variants, so VoiceOver/TalkBack read a card identically. */
function accessibilityLabelFor(pokemon: PokemonSummary): string {
  return `${pokemon.names.fr}, numéro ${formatDexNumber(pokemon.id)}, type ${pokemon.types.join(' et ')}`;
}

export function PokemonCard({ pokemon, variant = 'row', width }: PokemonCardProps) {
  return (
    <Link href={{ pathname: '/pokemon/[id]', params: { id: pokemon.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabelFor(pokemon)}
        accessibilityHint="Ouvre la fiche détaillée du Pokémon"
        style={({ pressed }) => [
          variant === 'grid' ? [styles.tile, width !== undefined && { width }] : styles.card,
          pressed && styles.pressed,
        ]}
      >
        {variant === 'grid' ? (
          <>
            <Text style={styles.tileDexNumber}>{formatDexNumber(pokemon.id)}</Text>
            <Image source={pokemon.sprites.normal} style={styles.tileArtwork} contentFit="contain" />
            <View style={styles.tileFooter}>
              <Text style={styles.tileName} numberOfLines={1}>
                {pokemon.names.fr}
              </Text>
            </View>
          </>
        ) : (
          <>
            <Image source={pokemon.sprites.normal} style={styles.artwork} contentFit="contain" />
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
          </>
        )}
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
  tile: {
    backgroundColor: PALETTE.white,
    borderRadius: 8,
    paddingTop: 4,
    alignItems: 'center',
    overflow: 'hidden',
    // Figma card elevation; `elevation` is Android-only and ignored elsewhere.
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tileDexNumber: {
    alignSelf: 'flex-end',
    fontSize: 10,
    color: PALETTE.medium,
    fontVariant: ['tabular-nums'],
    paddingRight: 8,
  },
  tileArtwork: {
    width: '100%',
    height: 72,
    marginTop: -4,
  },
  tileFooter: {
    width: '100%',
    marginTop: 4,
    backgroundColor: PALETTE.background,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tileName: {
    fontSize: 11,
    fontWeight: '500',
    color: PALETTE.dark,
    textAlign: 'center',
  },
});
