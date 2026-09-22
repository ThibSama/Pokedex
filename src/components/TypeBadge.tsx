import { StyleSheet, Text } from 'react-native';

import { getTypeColor } from '@/constants/typeColors';
import { COLORS, RADIUS } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';

interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return <Text style={[styles.badge, { backgroundColor: getTypeColor(type) }]}>{type}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    ...TYPO.subtitle3,
    color: COLORS.white,
    textTransform: 'capitalize',
    paddingHorizontal: 8,
    paddingVertical: 2,
    // The badge is 20px tall, so the pill radius is what it always rendered as.
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
});
