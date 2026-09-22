import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { PALETTE } from '@/constants/typeColors';
import { TYPO } from '@/theme/typography';
import type { PokemonSummary } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

interface PokemonCardProps {
  pokemon: PokemonSummary;
  /** Tile width, computed from the frame so the columns always fit. */
  width?: number;
}

/** The single grid tile used by both the Pokédex and the Collection. */
export function PokemonCard({ pokemon, width }: PokemonCardProps) {
  // `Link asChild` hands the child to Radix's Slot, which merges styles with
  // `{ ...slotStyle, ...childStyle }`. Spreading a style *function* — or an
  // array — into an object silently yields `{}`, dropping every style including
  // the computed tile width. So press state is tracked here and the result is
  // flattened into the single plain object Slot can actually merge.
  const [pressed, setPressed] = useState(false);
  const style = StyleSheet.flatten<ViewStyle>([
    styles.tile,
    width !== undefined && { width },
    pressed && styles.pressed,
  ]);

  return (
    <Link href={{ pathname: '/pokemon/[id]', params: { id: pokemon.id } }} asChild>
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={`${pokemon.names.fr}, numéro ${formatDexNumber(pokemon.id)}, type ${pokemon.types.join(' et ')}`}
        accessibilityHint="Ouvre la fiche détaillée du Pokémon"
        style={style}>
        <Text style={styles.tileDexNumber}>{formatDexNumber(pokemon.id)}</Text>
        <Image source={pokemon.sprites.normal} style={styles.tileArtwork} contentFit="contain" />
        <View style={styles.tileFooter}>
          <Text style={styles.tileName} numberOfLines={1}>
            {pokemon.names.fr}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const TILE_PADDING_TOP = 2;
/** Figma artwork box inside a tile. */
const TILE_ARTWORK_SIZE = 72;

const styles = StyleSheet.create({
  /**
   * Figma tile: 104x108 at a 360px frame. The height is composed rather than
   * fixed — 2 (padding) + 12 (Dex number) + 72 (artwork) + 22 (name band).
   */
  tile: {
    backgroundColor: PALETTE.white,
    borderRadius: 8,
    paddingTop: TILE_PADDING_TOP,
    alignItems: 'center',
    overflow: 'hidden',
    // Figma card elevation; `elevation` is Android-only and ignored elsewhere.
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  tileDexNumber: {
    ...TYPO.caption,
    alignSelf: 'flex-end',
    color: PALETTE.medium,
    fontVariant: ['tabular-nums'],
    paddingRight: 8,
  },
  tileArtwork: {
    width: '100%',
    height: TILE_ARTWORK_SIZE,
  },
  tileFooter: {
    width: '100%',
    backgroundColor: PALETTE.background,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tileName: {
    ...TYPO.body3,
    color: PALETTE.dark,
    textAlign: 'center',
  },
});
