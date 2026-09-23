import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '@/constants/typeColors';
import { accentOn } from '@/theme/contrast';
import { createThemedStyles, useTheme } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';
import { summaryProps } from '@/utils/a11y';

/** Maximum base stat in the main series; bars are scaled against it. */
export const MAX_BASE_STAT = 255;
const FILL_DURATION_MS = 800;

/** Track thickness. Figma drew 4px; the row is legible at phone distance from 6. */
const TRACK_HEIGHT = 6;

interface StatBarProps {
  /** Short label painted in the row, e.g. `ATK`. */
  label: string;
  /** The row's one spoken element, e.g. "Attack, 110". */
  accessibilityLabel: string;
  value: number;
  /** Accent for the fill and tinted track; the label text uses a readable shade of it. */
  color: string;
  /** Stagger offset before the fill starts. */
  delayMs?: number;
}

/**
 * Animated base-stat row. The fill starts at 0 on mount and eases to
 * `value / 255` on the UI thread; re-renders with the same `value` do not restart it.
 */
export function StatBar({ label, accessibilityLabel, value, color, delayMs = 0 }: StatBarProps) {
  const progress = useSharedValue(0);
  const styles = useStyles();
  const { palette } = useTheme();

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
    <View style={styles.row} {...summaryProps(accessibilityLabel)}>
      <Text style={[styles.label, { color: accentOn(color, palette.surface) }]}>{label}</Text>
      <View style={styles.divider} />
      <Text style={styles.value}>{String(value).padStart(3, '0')}</Text>
      <View style={[styles.track, { backgroundColor: withAlpha(color, 0.2) }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    // The row is taller than its 16px text so the table reads as a table.
    minHeight: 24,
  },
  label: {
    ...TYPO.subtitle2,
    width: 36,
    textAlign: 'right',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: c.divider,
  },
  value: {
    ...TYPO.body2,
    width: 28,
    color: c.text,
    fontVariant: ['tabular-nums'],
  },
  track: {
    flex: 1,
    height: TRACK_HEIGHT,
    // 6px tall, so the pill radius is simply a fully rounded bar.
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
}));
