import type { ViewStyle } from 'react-native';

import { withAlpha } from '@/constants/typeColors';

export type ThemeMode = 'light' | 'dark';

export const BRAND = {
  red: '#DC0A2D',
  white: '#FFFFFF',
} as const;

export interface Palette {
  chrome: string;
  onChrome: string;
  surface: string;
  card: string;
  surfaceMuted: string;
  divider: string;
  text: string;
  textMuted: string;
  accent: string;
  watermark: string;
  /** Web uniquement : autour de la colonne centrée, et la colonne elle-même. */
  backdrop: string;
  frame: string;
}

// Contrastes en Dark (WCAG AA) sur le fond sombre le plus clair : texte 12,3:1,
// texte secondaire 6,0:1, rouge éclairci 5,2:1.
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
    // Le rouge de marque ne fait que 3,7:1 sur fond sombre ; celui-ci atteint 4,5:1 partout.
    accent: '#FF6B7D',
    watermark: '#2C2C2C',
    backdrop: '#0A0A0A',
    frame: '#121212',
  },
};

// Indépendantes du thème, comme les accents sur lesquels elles sont posées.
export const INK = {
  light: BRAND.white,
  dark: PALETTES.light.text,
} as const;

// Sur le chrome rouge, le texte reste blanc opaque (5,1:1) : un blanc translucide
// passerait sous 4,5:1, tout comme un calque beaucoup plus clair que celui-ci.
export const OVERLAY = {
  /** Sous du texte blanc : 20 % donnait 4,2:1, 12 % donne 4,6:1. */
  fill: withAlpha(BRAND.white, 0.12),
  watermark: withAlpha(BRAND.white, 0.12),
} as const;

export const RADIUS = {
  sheet: 8,
  chip: 14,
  card: 16,
  field: 20,
  pill: 999,
} as const;

export const SCRIM = 'rgba(0, 0, 0, 0.45)';

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const SHELL = {
  inset: SPACING.xs,
  headerPadding: SPACING.lg,
  sheetPadding: SPACING.sm,
  listPadding: SPACING.md,
} as const;

export const OPACITY = {
  pressed: 0.7,
  disabled: 0.4,
} as const;

// `elevation` n'agit que sur Android ; les clés shadow* couvrent iOS et le web.
export const SHADOW = {
  tile: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  float: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  frame: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
} as const satisfies Record<string, ViewStyle>;
