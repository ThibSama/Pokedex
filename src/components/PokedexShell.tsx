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

/**
 * The Pokédex shell: the red chrome, the header band and the white content sheet
 * every route is framed in. Home, Pokédex, Collection and Pokémon detail used to
 * rebuild these three pieces independently, which is why they drifted apart.
 */

/** Back button box. Wider than the chevron glyph, so the glyph still lands on the shell margin. */
const BACK_BUTTON_SIZE = 28;
/** 28px plus 8px on every side: a 44px target on native. */
const BACK_HIT_SLOP = 8;

/**
 * Native touch targets for the 28x24 FR/EN options and the theme switch that
 * shares their track: 44 tall, and as wide as the 2px gaps between them allow
 * without two slops overlapping.
 */
const LANGUAGE_HIT_SLOP = [
  { top: 10, bottom: 10, left: 8, right: 1 },
  { top: 10, bottom: 10, left: 1, right: 1 },
];
const THEME_HIT_SLOP = { top: 10, bottom: 10, left: 1, right: 8 };

/**
 * Returns to the previous screen, or to `fallback` when this screen was opened
 * directly (deep link, cold start, browser refresh) and there is nothing to
 * return to.
 */
export function goBack(fallback: '/' | '/pokedex' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * The red chrome. Mounted as the outermost view of a route, it also marks the
 * route as headerless: every screen paints this chrome instead of a native one.
 */
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
  /** Bold Poppins screen title. */
  title: string;
  /** Small line under the title — the Home wordmark is the only screen with one. */
  subtitle?: string;
  /** Right-aligned accessory: the favorite count, the Dex number. */
  trailing?: string;
  /** Omitted on Home, which is the navigator's root and has nothing to return to. */
  onBack?: () => void;
  /** Extra control rows (search, sort, type filters) painted on the same red band. */
  children?: ReactNode;
}

/**
 * The application header: back affordance, Pokéball brand mark, bold Poppins
 * title, an optional right-aligned accessory, the app-wide language and theme
 * switches, and whatever control rows the screen adds as children.
 */
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
        {/* One compact track for both app-wide settings, so the title keeps its room. */}
        <View style={styles.settings}>
          <LanguageSwitch />
          <ThemeSwitch />
        </View>
      </View>
      {children}
    </View>
  );
}

/**
 * The one language control, reachable from every screen because every screen
 * mounts this header. It switches the whole app in place — no navigation, no
 * refetch — and the choice is persisted for the next launch.
 */
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

/**
 * The Light/Dark switch, on the language track right after EN: a sun on the red
 * in Light, a red moon on a white chip in Dark. Like the language, it applies in
 * place — no navigation, no refetch — and is persisted for the next launch.
 */
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
   * `sheet` is the route's content sheet: it fills the chrome below the header,
   * keeping the red visible around the white as a border.
   * `panel` is the same surface already placed inside a scroller that carries
   * the chrome inset itself (the detail screen's card), so it keeps the look
   * without the route geometry.
   */
  variant?: 'sheet' | 'panel';
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * The rounded content surface — white in Light, near-black in Dark: everything
 * readable sits on one of these, so it also carries the theme crossfade.
 */
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
    // The back box is mostly empty space around the chevron, so the row is
    // pulled left by the same amount the title is padded by: the chevron glyph
    // and the title both land on the header margin.
    paddingLeft: SHELL.headerPadding - SPACING.sm,
    paddingRight: SHELL.headerPadding,
  },
  /** Home has no back affordance, so its row starts on the header margin itself. */
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
    // 24 is the WCAG 2.2 minimum target on web, where hitSlop does not apply;
    // min- so the pill grows with a larger text size instead of clipping it.
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
