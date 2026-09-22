import { StyleSheet, Text } from 'react-native';

import { getTypeColor, PALETTE } from '@/constants/typeColors';
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
    color: PALETTE.white,
    textTransform: 'capitalize',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
