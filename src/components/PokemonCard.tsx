import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { usePokemonText } from '@/i18n/pokemonText';
import { createThemedStyles } from '@/theme/ThemeProvider';
import { OPACITY, RADIUS, SHADOW } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';
import type { PokemonSummary } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

interface PokemonCardProps {
  pokemon: PokemonSummary;
  width?: number;
}

export function PokemonCard({ pokemon, width }: PokemonCardProps) {
  const { t } = useTranslation();
  const { name, cardLabel } = usePokemonText();
  const styles = useStyles();
  // `Link asChild` passe par le Slot de Radix, qui fusionne les styles par spread :
  // une fonction ou un tableau de styles deviendrait `{}`. D'où l'état pressed manuel.
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
        // Ça navigue, donc c'est un lien : Entrée le suit sur le web.
        role="link"
        accessibilityLabel={cardLabel(pokemon)}
        accessibilityHint={t('pokemon.openHint')}
        style={style}>
        <Text style={styles.tileDexNumber}>{formatDexNumber(pokemon.id)}</Text>
        {/* Le label de la tuile nomme déjà le Pokémon : l'artwork est décoratif. */}
        <Image source={pokemon.sprites.normal} style={styles.tileArtwork} contentFit="contain" accessibilityLabel="" />
        <View style={styles.tileFooter}>
          <Text style={styles.tileName} numberOfLines={1}>
            {name(pokemon)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const TILE_PADDING_TOP = 2;
const TILE_ARTWORK_SIZE = 72;

const useStyles = createThemedStyles((c) => ({
  tile: {
    backgroundColor: c.card,
    borderRadius: RADIUS.sheet,
    paddingTop: TILE_PADDING_TOP,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOW.tile,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
  tileDexNumber: {
    ...TYPO.caption,
    alignSelf: 'flex-end',
    color: c.textMuted,
    fontVariant: ['tabular-nums'],
    paddingRight: 8,
  },
  tileArtwork: {
    width: '100%',
    height: TILE_ARTWORK_SIZE,
  },
  tileFooter: {
    width: '100%',
    backgroundColor: c.surfaceMuted,
    borderBottomLeftRadius: RADIUS.sheet,
    borderBottomRightRadius: RADIUS.sheet,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tileName: {
    ...TYPO.body3,
    color: c.text,
    textAlign: 'center',
  },
}));
