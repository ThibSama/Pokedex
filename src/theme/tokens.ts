import type { TextStyle, ViewStyle } from 'react-native';

import { withAlpha } from '@/constants/typeColors';
import { TYPO } from '@/theme/typography';

/**
 * The application's visual tokens: one small set of values every screen draws
 * from, so Home, Pokédex, Collection and the detail screen read as one product.
 *
 * Deliberately not a theming framework — there is one build, one palette and
 * one font family. Each value below is already in use somewhere in the app; a
 * value that stops being used should be deleted rather than kept "for later".
 */

/** Figma neutrals plus the Pokédex brand red. The only place these literals exist. */
export const COLORS = {
  /** Pokédex red: every route's chrome, and the app's primary action color. */
  red: '#DC0A2D',
  white: '#FFFFFF',
  /** Page background, and the light surface inside the white sheet. */
  background: '#EFEFEF',
  /** Dividers and hairlines. */
  light: '#E0E0E0',
  /** Secondary text. */
  medium: '#666666',
  /** Primary text. */
  dark: '#212121',
} as const;

/**
 * Translucent layers painted over a colored surface — the red chrome or a type
 * accent. Text on the red chrome is always opaque white (5.1:1): a translucent
 * white would drop below 4.5:1, and so does white text on a fill much lighter than this one.
 */
export const OVERLAY = {
  /** Track behind white text on the red chrome (the language switch). 20% gave 4.2:1; 12% gives 4.6:1. */
  fill: withAlpha(COLORS.white, 0.12),
  /** The oversized Pokéball watermark behind a hero. Decorative. */
  watermark: withAlpha(COLORS.white, 0.12),
} as const;

/** Corner radii. */
export const RADIUS = {
  /** White content sheets, grid tiles and the artwork panel. */
  sheet: 8,
  /** Filter chips, and 28px round icon buttons (half of their height). */
  chip: 14,
  /** Dashboard tiles resting on the white sheet. */
  card: 16,
  /** The 40px search field and sort group on the red chrome. */
  field: 20,
  /** Buttons and counters that must stay round at any height. */
  pill: 999,
} as const;

/** Dimming layer drawn behind a modal panel. */
export const SCRIM = 'rgba(0, 0, 0, 0.45)';

/** Spacing steps. Anything larger than `xxl` is a layout dimension, not spacing. */
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

/**
 * Chrome geometry, in spacing steps. These four numbers are what make the red
 * shell, the control rows on it and the white sheet line up across routes.
 */
export const SHELL = {
  /** Red chrome left/right/bottom border around the white sheet. */
  inset: SPACING.xs,
  /** Horizontal padding of anything laid out on the red chrome. */
  headerPadding: SPACING.lg,
  /** Padding above the first row inside the white sheet. */
  sheetPadding: SPACING.sm,
  /** Horizontal padding of the content (grid, list) inside the sheet. */
  listPadding: SPACING.md,
} as const;

/** Press and disabled feedback, so every control fades by the same amount. */
export const OPACITY = {
  pressed: 0.7,
  disabled: 0.4,
} as const;

/** Elevation. `elevation` is Android-only; the shadow* keys cover iOS and web. */
export const SHADOW = {
  /** Figma tile elevation: the Pokémon tiles inside the white sheet. */
  tile: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  /** A white control floating on the red chrome: the search field, the sort group. */
  float: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  /** The centered application column on a wide web viewport. */
  frame: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
} as const satisfies Record<string, ViewStyle>;

/**
 * Message text for a screen's loading, empty and error states. They used to be
 * redeclared per route, which is how three screens grew three slightly
 * different "something failed" styles.
 */
export const MESSAGE = {
  /** Neutral explanation under a state's title. */
  muted: { ...TYPO.body2, color: COLORS.medium, textAlign: 'center' },
  /** The failure itself: red, because red is the app's signal color. */
  error: { ...TYPO.subtitle1, color: COLORS.red, textAlign: 'center' },
  /** Explanation painted on a type accent; the color comes from `foregroundOn(accent)`. */
  onColor: { ...TYPO.body2, textAlign: 'center' },
} as const satisfies Record<string, TextStyle>;
