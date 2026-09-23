import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { accentOn, foregroundOn, MIN_CONTRAST } from '@/theme/contrast';
import { COLORS, OPACITY, RADIUS, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';

/**
 * Controls shared by every screen. Each one replaces a set of near-identical
 * per-route copies: the red pill existed on three screens, the round icon
 * button on two, and the centered state block on three.
 */

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_BUTTON_SIZE = 28;
const ICON_SIZE = 16;

/**
 * Touch-target extensions (native only; react-native-web ignores `hitSlop`).
 * The 40px pill reaches 44. The 28px icon button reaches 44 tall but only 36
 * wide, because its row neighbours are 8px apart and slops must not overlap.
 */
const PRIMARY_HIT_SLOP = 2;
const ICON_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** The app's primary action: a red pill, used for retry and for call-to-actions. */
export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={PRIMARY_HIT_SLOP}
      role="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, style]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  /** The Pokémon's type accent; also the icon color when the button is idle. */
  accent: string;
  /** Filled with `accent` while the button's action is on (playing, favorited). */
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
  /** Exposed as `aria-busy`, e.g. while a cry is playing. */
  busy?: boolean;
}

/**
 * A compact secondary action: round, 28px, accent-filled while active. The
 * glyph is a darker shade of the accent when idle (3:1 on its grey disc) and
 * white or dark on the accent fill when active.
 */
export function IconButton({
  icon,
  accent,
  active = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  busy,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={ICON_HIT_SLOP}
      role="button"
      accessibilityLabel={accessibilityLabel}
      aria-disabled={disabled}
      aria-busy={busy}
      style={[styles.iconButton, active && { backgroundColor: accent }, disabled && styles.disabled]}>
      <MaterialCommunityIcons
        name={icon}
        size={ICON_SIZE}
        color={active ? foregroundOn(accent) : accentOn(accent, COLORS.background, MIN_CONTRAST.graphic)}
      />
    </Pressable>
  );
}

/**
 * Centered block for a screen's loading, empty, invalid and error states.
 * `alert` is announced once when a failure appears, `status` politely (an empty
 * result). Loading states pass neither: their spinner is the progress
 * indicator, and nothing is re-announced while data keeps arriving.
 */
export function StateView({ children, announce }: { children: ReactNode; announce?: 'alert' | 'status' }) {
  return (
    <View
      style={styles.stateView}
      role={announce}
      aria-live={announce === undefined ? undefined : announce === 'alert' ? 'assertive' : 'polite'}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.red,
  },
  primaryButtonText: {
    ...TYPO.subtitle2,
    color: COLORS.white,
  },
  iconButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  stateView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.xxl,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
  disabled: {
    opacity: OPACITY.disabled,
  },
});
