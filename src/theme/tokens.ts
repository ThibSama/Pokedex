import type { ViewStyle } from 'react-native';

import { withAlpha } from '@/constants/typeColors';

/**
 * The application's visual tokens: one small set of values every screen draws
 * from, so Home, Pokédex, Collection and the detail screen read as one product.
 *
 * Deliberately not a theming framework — there is one build, a Light and a
 * Dark palette with the same semantic keys, and one font family. Each value
 * below is already in use somewhere in the app; a value that stops being used
 * should be deleted rather than kept "for later".
 */

export type ThemeMode = 'light' | 'dark';

/** The two colors that never change with the theme: the Pokédex chrome and the white painted on it. */
export const BRAND = {
  /** Pokédex red: every route's chrome, and the app's primary action color. */
  red: '#DC0A2D',
  white: '#FFFFFF',
} as const;

/**
 * Semantic colors for one theme. Screens read these through the theme
 * (`useTheme`, `createThemedStyles`) — never a hex literal of their own — so a
 * surface or a text color is decided once for Light and once for Dark.
 */
export interface Palette {
  /** Every route's chrome and the primary action fill. Brand red in both themes. */
  chrome: string;
  /** Text and glyphs painted on the chrome or on a primary action. */
  onChrome: string;
  /** The content sheets every route is framed in. */
  surface: string;
  /** Tiles on a sheet, controls floating on the chrome, the filter panel. */
  card: string;
  /** Light fill inside a sheet or a tile: name bands, chips, discs, dashboard tiles. */
  surfaceMuted: string;
  /** Dividers and hairlines. */
  divider: string;
  /** Primary text. */
  text: string;
  /** Secondary text. */
  textMuted: string;
  /** Brand red as text or a glyph on a sheet: errors, spinners, the idle sort icons. */
  accent: string;
  /** Decorative Pokéball watermark painted straight on a sheet (the Home hero). */
  watermark: string;
  /** Web only: the viewport around the centered app column, and the column itself. */
  backdrop: string;
  frame: string;
}

/**
 * Light is the Figma palette, unchanged. Dark keeps the red chrome and every
 * type color, and moves the sheets to a near-black with slightly lighter tiles
 * and fields. Text contrast (WCAG AA): off-white text reaches 12.3:1 on the
 * lightest dark fill, secondary text 6.0:1, the lifted red 5.2:1.
 */
export const PALETTES: Record<ThemeMode, Palette> = {
  light: {
    chrome: BRAND.red,
    onChrome: BRAND.white,
    surface: '#FFFFFF',
    card: '#FFFFFF',
    surfaceMuted: '#EFEFEF',
    divider: '#E0E0E0',
    text: '#212121',
    textMuted: '#666666',
    accent: BRAND.red,
    watermark: '#E4E4E4',
    backdrop: '#E0E0E0',
    frame: '#EFEFEF',
  },
  dark: {
    chrome: BRAND.red,
    onChrome: BRAND.white,
    surface: '#121212',
    card: '#1E1E1E',
    surfaceMuted: '#2A2A2A',
    divider: '#3A3A3A',
    text: '#EDEDED',
    textMuted: '#A8A8A8',
    // Brand red reads 3.7:1 on the dark sheet; this lift of it reaches 4.5:1 on every dark fill.
    accent: '#FF6B7D',
    watermark: '#2C2C2C',
    backdrop: '#0A0A0A',
    frame: '#121212',
  },
};

/**
 * The two inks for content painted on a solid accent (type colors, the chrome):
 * white, or the Light theme's dark text. They are theme-independent because
 * the accent under them is.
 */
export const INK = {
  light: BRAND.white,
  dark: PALETTES.light.text,
} as const;

/**
 * Translucent layers painted over a colored surface — the red chrome or a type
 * accent. Text on the red chrome is always opaque white (5.1:1): a translucent
 * white would drop below 4.5:1, and so does white text on a fill much lighter than this one.
 */
export const OVERLAY = {
  /** Track behind white text on the red chrome (the language switch). 20% gave 4.2:1; 12% gives 4.6:1. */
  fill: withAlpha(BRAND.white, 0.12),
  /** The oversized Pokéball watermark on the detail hero's type accent. Decorative. */
  watermark: withAlpha(BRAND.white, 0.12),
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
