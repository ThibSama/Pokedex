import { StyleSheet, Text } from 'react-native';

import { getTypeColor } from '@/constants/typeColors';
import { usePokemonText } from '@/i18n/pokemonText';
import { COLORS, RADIUS } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';

interface TypeBadgeProps {
  /** Canonical PokéAPI slug (`dark`): drives the color; only the label is translated. */
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const { typeLabel } = usePokemonText();
  return <Text style={[styles.badge, { backgroundColor: getTypeColor(type) }]}>{typeLabel(type)}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    ...TYPO.subtitle3,
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    // The badge is 20px tall, so the pill radius is what it always rendered as.
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
});
