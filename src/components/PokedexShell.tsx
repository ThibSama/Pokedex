import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeAppLanguage, useAppLanguage } from '@/i18n';
import { APP_LANGUAGES } from '@/i18n/languages';
import { createThemedStyles, ThemeFade, useTheme } from '@/theme/ThemeProvider';
import { BRAND, OPACITY, OVERLAY, RADIUS, SHELL, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';
import { choiceProps, DECORATIVE, toggleProps } from '@/utils/a11y';

const BACK_BUTTON_SIZE = 28;
// 28px + 8px de chaque côté : cible de 44px en natif.
const BACK_HIT_SLOP = 8;

// hitSlop natif : 44px de haut, et aussi large que les écarts de 2px le permettent
// sans chevauchement.
const LANGUAGE_HIT_SLOP = [
  { top: 10, bottom: 10, left: 8, right: 1 },
  { top: 10, bottom: 10, left: 1, right: 1 },
];
const THEME_HIT_SLOP = { top: 10, bottom: 10, left: 1, right: 8 };

/** Va vers `fallback` si l'écran a été ouvert directement (deep link, rafraîchissement). */
export function goBack(fallback: '/' | '/pokedex' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function PokedexScreen({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      {children}
    </View>
  );
}

interface PokedexHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: string;
  onBack?: () => void;
  children?: ReactNode;
}

export function PokedexHeader({ title, subtitle, trailing, onBack, children }: PokedexHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const hasBack = onBack !== undefined;

  return (
    <View style={[styles.header, { paddingTop: insets.top + SHELL.sheetPadding }]}>
      <View style={[styles.titleRow, !hasBack && styles.titleRowFlush]}>
        {hasBack && (
          <Pressable
            onPress={onBack}
            hitSlop={BACK_HIT_SLOP}
            role="button"
            accessibilityLabel={t('shell.back')}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={BRAND.white} {...DECORATIVE} />
          </Pressable>
        )}
        <MaterialCommunityIcons name="pokeball" size={24} color={BRAND.white} {...DECORATIVE} />
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} role="heading">
            {title}
          </Text>
          {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {trailing !== undefined && <Text style={styles.trailing}>{trailing}</Text>}
        <View style={styles.settings}>
          <LanguageSwitch />
          <ThemeSwitch />
        </View>
      </View>
      {children}
    </View>
  );
}

function LanguageSwitch() {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const styles = useStyles();

  return (
    <View style={styles.language} role="group" aria-label={t('language.label')}>
      {APP_LANGUAGES.map((code, index) => {
        const selected = code === language;
        return (
          <Pressable
            key={code}
            onPress={() => changeAppLanguage(code)}
            hitSlop={LANGUAGE_HIT_SLOP[index]}
            {...choiceProps(selected)}
            accessibilityLabel={t(`language.names.${code}`)}
            accessibilityLanguage={code}
            style={({ pressed }) => [
              styles.languageOption,
              selected && styles.languageOptionSelected,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.languageText, selected && styles.languageTextSelected]}>
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ThemeSwitch() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const styles = useStyles();
  const dark = mode === 'dark';

  return (
    <Pressable
      onPress={() => setMode(dark ? 'light' : 'dark')}
      hitSlop={THEME_HIT_SLOP}
      {...toggleProps(dark)}
      accessibilityLabel={t('theme.dark')}
      style={({ pressed }) => [
        styles.languageOption,
        dark && styles.languageOptionSelected,
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons
        name={dark ? 'weather-night' : 'white-balance-sunny'}
        size={16}
        color={dark ? BRAND.red : BRAND.white}
        {...DECORATIVE}
      />
    </Pressable>
  );
}

interface PokedexSurfaceProps {
  /**
   * `sheet` remplit le chrome sous l'en-tête ; `panel` garde le même rendu dans un
   * scroller qui porte déjà la marge (carte du détail).
   */
  variant?: 'sheet' | 'panel';
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

// Tout le contenu lisible repose sur cette surface, d'où le fondu de thème ici.
export function PokedexSurface({ variant = 'sheet', style, children }: PokedexSurfaceProps) {
  const styles = useStyles();
  return (
    <View style={[styles.surface, variant === 'sheet' && styles.sheet, style]}>
      {children}
      <ThemeFade borderRadius={RADIUS.sheet} />
    </View>
  );
}

const useStyles = createThemedStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.chrome,
  },
  header: {
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    // Décalée à gauche du vide autour du chevron : le glyphe et le titre tombent
    // tous deux sur la marge de l'en-tête.
    paddingLeft: SHELL.headerPadding - SPACING.sm,
    paddingRight: SHELL.headerPadding,
  },
  titleRowFlush: {
    paddingLeft: SHELL.headerPadding,
  },
  backButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...TYPO.headline,
    color: c.onChrome,
  },
  subtitle: {
    ...TYPO.body2,
    color: c.onChrome,
  },
  trailing: {
    ...TYPO.subtitle2,
    color: c.onChrome,
    fontVariant: ['tabular-nums'],
  },
  settings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: OVERLAY.fill,
  },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  languageOption: {
    // 24px : cible minimale WCAG 2.2 sur le web, où hitSlop ne s'applique pas.
    // minHeight pour grandir avec la taille de texte au lieu de la rogner.
    minHeight: 24,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
  },
  languageOptionSelected: {
    backgroundColor: BRAND.white,
  },
  languageText: {
    ...TYPO.subtitle3,
    color: c.onChrome,
  },
  languageTextSelected: {
    color: BRAND.red,
  },
  surface: {
    backgroundColor: c.surface,
    borderRadius: RADIUS.sheet,
    paddingTop: SHELL.sheetPadding,
  },
  sheet: {
    flex: 1,
    marginHorizontal: SHELL.inset,
    marginBottom: SHELL.inset,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
}));
