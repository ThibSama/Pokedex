import { StyleSheet, Text } from 'react-native';

import { getTypeColor } from '@/constants/typeColors';
import { usePokemonText } from '@/i18n/pokemonText';
import { foregroundOn } from '@/theme/contrast';
import { RADIUS } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';

interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const { typeLabel } = usePokemonText();
  const color = getTypeColor(type);
  // Texte blanc ou sombre selon l'accent : au moins 4,5:1 pour les 18 types.
  return <Text style={[styles.badge, { backgroundColor: color, color: foregroundOn(color) }]}>{typeLabel(type)}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    ...TYPO.subtitle3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
});
