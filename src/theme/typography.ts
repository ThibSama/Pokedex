import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import type { TextStyle } from 'react-native';

/**
 * Poppins is the Figma type family. Only the four weights the design actually
 * uses are imported, through per-weight subpaths, so Metro does not bundle the
 * other fourteen faces shipped by `@expo-google-fonts/poppins`.
 *
 * React Native cannot synthesize weights for a custom family: a style must name
 * the face it wants, never `fontWeight`. Hence one family constant per weight.
 */
export const FONT_FAMILY = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/** Passed to `useFonts` once, in the root layout. */
export const POPPINS_FONTS = {
  [FONT_FAMILY.regular]: Poppins_400Regular,
  [FONT_FAMILY.medium]: Poppins_500Medium,
  [FONT_FAMILY.semiBold]: Poppins_600SemiBold,
  [FONT_FAMILY.bold]: Poppins_700Bold,
};

/** The Figma text styles, verbatim (size / line-height / weight). */
export const TYPO = {
  headline: { fontFamily: FONT_FAMILY.bold, fontSize: 24, lineHeight: 32 },
  subtitle1: { fontFamily: FONT_FAMILY.bold, fontSize: 14, lineHeight: 16 },
  subtitle2: { fontFamily: FONT_FAMILY.bold, fontSize: 12, lineHeight: 16 },
  subtitle3: { fontFamily: FONT_FAMILY.bold, fontSize: 10, lineHeight: 16 },
  body1: { fontFamily: FONT_FAMILY.regular, fontSize: 14, lineHeight: 16 },
  body2: { fontFamily: FONT_FAMILY.regular, fontSize: 12, lineHeight: 16 },
  body3: { fontFamily: FONT_FAMILY.regular, fontSize: 10, lineHeight: 16 },
  caption: { fontFamily: FONT_FAMILY.regular, fontSize: 8, lineHeight: 12 },
} as const satisfies Record<string, TextStyle>;
