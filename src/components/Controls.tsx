import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { accentOn, foregroundOn, MIN_CONTRAST } from '@/theme/contrast';
import { createThemedStyles, useTheme } from '@/theme/ThemeProvider';
import { OPACITY, RADIUS, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_BUTTON_SIZE = 28;
const ICON_SIZE = 16;

// hitSlop natif uniquement. Le bouton icône n'atteint que 36px de large : ses
// voisins sont à 8px et les zones ne doivent pas se chevaucher.
const PRIMARY_HIT_SLOP = 2;
const ICON_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: PrimaryButtonProps) {
  const styles = useStyles();
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
  accent: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
  busy?: boolean;
}

// Au repos, le glyphe prend une nuance de l'accent à 3:1 sur son disque, dans les deux thèmes.
export function IconButton({
  icon,
  accent,
  active = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  busy,
}: IconButtonProps) {
  const styles = useStyles();
  const { palette } = useTheme();
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
        color={active ? foregroundOn(accent) : accentOn(accent, palette.surfaceMuted, MIN_CONTRAST.graphic)}
      />
    </Pressable>
  );
}

/**
 * `alert` : annoncé une fois quand une erreur apparaît ; `status` : annonce polie.
 * Les états de chargement n'en passent aucun, pour ne rien réannoncer.
 */
export function StateView({ children, announce }: { children: ReactNode; announce?: 'alert' | 'status' }) {
  const styles = useStyles();
  return (
    <View
      style={styles.stateView}
      role={announce}
      aria-live={announce === undefined ? undefined : announce === 'alert' ? 'assertive' : 'polite'}>
      {children}
    </View>
  );
}

const useStyles = createThemedStyles((c) => ({
  primaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: c.chrome,
  },
  primaryButtonText: {
    ...TYPO.subtitle2,
    color: c.onChrome,
  },
  iconButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
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
}));
