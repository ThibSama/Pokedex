import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '@/constants/typeColors';
import { COLORS } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';

/** Maximum base stat in the main series; bars are scaled against it. */
export const MAX_BASE_STAT = 255;
const FILL_DURATION_MS = 800;

interface StatBarProps {
  label: string;
  value: number;
  /** Accent color for label, fill and tinted track. */
  color: string;
  /** Stagger offset before the fill starts. */
  delayMs?: number;
}

/**
 * Animated base-stat row. The fill starts at 0 on mount and eases to
 * `value / 255` on the UI thread; re-renders with the same `value` do not restart it.
 */
export function StatBar({ label, value, color, delayMs = 0 }: StatBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(Math.max(value, 0), MAX_BASE_STAT) / MAX_BASE_STAT;
    progress.set(
      withDelay(delayMs, withTiming(target, { duration: FILL_DURATION_MS, easing: Easing.out(Easing.cubic) })),
    );
  }, [value, delayMs, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.get() * 100}%`,
  }));

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <View style={styles.divider} />
      <Text style={styles.value}>{String(value).padStart(3, '0')}</Text>
      <View style={[styles.track, { backgroundColor: withAlpha(color, 0.2) }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...TYPO.subtitle3,
    width: 32,
    textAlign: 'right',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.light,
  },
  value: {
    ...TYPO.body3,
    width: 24,
    color: COLORS.dark,
    fontVariant: ['tabular-nums'],
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
