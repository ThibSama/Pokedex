import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeAppLanguage, useAppLanguage } from '@/i18n';
import { APP_LANGUAGES } from '@/i18n/languages';
import { COLORS, OPACITY, OVERLAY, RADIUS, SHELL, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';

/**
 * The Pokédex shell: the red chrome, the header band and the white content sheet
 * every route is framed in. Home, Pokédex, Collection and Pokémon detail used to
 * rebuild these three pieces independently, which is why they drifted apart.
 */

/** Back button box. Wider than the chevron glyph, so the glyph still lands on the shell margin. */
const BACK_BUTTON_SIZE = 28;

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
 * title, an optional right-aligned accessory, the app-wide language switch, and
 * whatever control rows the screen adds as children.
 */
export function PokedexHeader({ title, subtitle, trailing, onBack, children }: PokedexHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hasBack = onBack !== undefined;

  return (
    <View style={[styles.header, { paddingTop: insets.top + SHELL.sheetPadding }]}>
      <View style={[styles.titleRow, !hasBack && styles.titleRowFlush]}>
        {hasBack && (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('shell.back')}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.white} />
          </Pressable>
        )}
        <MaterialCommunityIcons name="pokeball" size={24} color={COLORS.white} />
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {trailing !== undefined && <Text style={styles.trailing}>{trailing}</Text>}
        <LanguageSwitch />
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

  return (
    <View style={styles.language} accessibilityRole="radiogroup" accessibilityLabel={t('language.label')}>
      {APP_LANGUAGES.map((code) => {
        const selected = code === language;
        return (
          <Pressable
            key={code}
            onPress={() => changeAppLanguage(code)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected }}
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

/** The white rounded content surface: everything readable sits on one of these. */
export function PokedexSurface({ variant = 'sheet', style, children }: PokedexSurfaceProps) {
  return (
    <View style={[styles.surface, variant === 'sheet' && styles.sheet, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.red,
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
    color: COLORS.white,
  },
  subtitle: {
    ...TYPO.body2,
    color: OVERLAY.text,
  },
  trailing: {
    ...TYPO.subtitle2,
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: OVERLAY.fill,
  },
  languageOption: {
    height: 20,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
  },
  languageOptionSelected: {
    backgroundColor: COLORS.white,
  },
  languageText: {
    ...TYPO.subtitle3,
    color: COLORS.white,
  },
  languageTextSelected: {
    color: COLORS.red,
  },
  surface: {
    backgroundColor: COLORS.white,
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
});
