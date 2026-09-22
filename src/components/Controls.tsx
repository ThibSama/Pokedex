import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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
      accessibilityRole="button"
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
  /** Merged with the derived `disabled` flag. */
  accessibilityState?: { selected?: boolean; busy?: boolean };
}

/** A compact secondary action: round, 28px, accent-filled while active. */
export function IconButton({
  icon,
  accent,
  active = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  accessibilityState,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      style={[styles.iconButton, active && { backgroundColor: accent }, disabled && styles.disabled]}>
      <MaterialCommunityIcons
        name={icon}
        size={ICON_SIZE}
        color={active ? COLORS.white : accent}
      />
    </Pressable>
  );
}

/** Centered block for a screen's loading, empty, invalid and error states. */
export function StateView({ children }: { children: ReactNode }) {
  return <View style={styles.stateView}>{children}</View>;
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
