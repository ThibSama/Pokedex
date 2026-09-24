import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import type { TextStyle } from 'react-native';

// Import par sous-chemin pour que Metro n'embarque pas les autres graisses.
// RN ne synthétise pas les graisses d'une police custom : on nomme la fonte, jamais `fontWeight`.
export const FONT_FAMILY = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const POPPINS_FONTS = {
  [FONT_FAMILY.regular]: Poppins_400Regular,
  [FONT_FAMILY.medium]: Poppins_500Medium,
  [FONT_FAMILY.semiBold]: Poppins_600SemiBold,
  [FONT_FAMILY.bold]: Poppins_700Bold,
};

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
