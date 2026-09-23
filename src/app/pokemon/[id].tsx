import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  fetchPokemonDetails,
  isSupportedDexId,
  NATIONAL_DEX_MAX,
  NATIONAL_DEX_MIN,
  resolveSprite,
} from '@/api/pokeApi';
import { IconButton, PrimaryButton, StateView } from '@/components/Controls';
import { CryButton } from '@/components/CryButton';
import { goBack, PokedexHeader, PokedexScreen, PokedexSurface } from '@/components/PokedexShell';
import { StatBar } from '@/components/StatBar';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeColor } from '@/constants/typeColors';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { formatDecimal, pickLocalized, usePokemonText } from '@/i18n/pokemonText';
import { accentOn, foregroundOn } from '@/theme/contrast';
import { useMessageStyles } from '@/theme/messages';
import { createThemedStyles, useTheme } from '@/theme/ThemeProvider';
import { OPACITY, OVERLAY, RADIUS, SHELL, SPACING } from '@/theme/tokens';
import { TYPO } from '@/theme/typography';
import type { PokemonDetails, PokemonStats, SpriteVariant } from '@/types/pokemon';
import { choiceProps, DECORATIVE, SECTION_HEADING } from '@/utils/a11y';
import { formatDexNumber } from '@/utils/pokemonList';

/** An error keeps only the technical message; fallback wording is translated at render. */
type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string | null }
  | { status: 'success'; details: PokemonDetails };

/** Figma order; the labels come from the `stats` resources. */
const STAT_ROWS: readonly (keyof PokemonStats)[] = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];
const STAT_STAGGER_MS = 80;

/**
 * How tall the stats table may grow on a tall screen. Past this the card's own
 * distribution takes over, so the table never turns into a stretched column.
 */
const STATS_MAX_HEIGHT = STAT_ROWS.length * 40 + (STAT_ROWS.length - 1) * SPACING.md;

/**
 * Native touch targets for the 24px Normal/Shiny segments: 44 tall, and only
 * 1px into the 2px gap between the two so their slops never overlap.
 */
const SEGMENT_HIT_SLOP = {
  first: { top: 10, bottom: 10, left: 2, right: 1 },
  rest: { top: 10, bottom: 10, left: 1, right: 2 },
};

const ARTWORK_SIZE = 200;
const ARTWORK_OVERLAP = 60;
/** Figma hero watermark: an oversized, barely-there Pokéball behind the artwork. */
const WATERMARK_SIZE = 208;

/** Parse the route param into a supported Dex id, or null when invalid. */
function parseDexId(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return isSupportedDexId(id) ? id : null;
}

/** Swap the current entry rather than stacking one screen per neighbour visited. */
function goToDexId(id: number) {
  router.replace({ pathname: '/pokemon/[id]', params: { id } });
}

export default function PokemonDetailScreen() {
  const { id: idParam, variant: variantParam } = useLocalSearchParams<{ id: string; variant?: string }>();
  const id = parseDexId(idParam);
  const { t } = useTranslation();
  const { language, name: displayName } = usePokemonText();

  const { hydrated, isFavorite, toggleFavorite } = useFavorites();
  const styles = useStyles();
  const message = useMessageStyles();
  const { palette } = useTheme();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Local UI state only: switches between already-fetched data, never refetches.
  // A route variant (the Home hero, a Collection slot) opens the screen on that
  // presentation; anything else — including the plain Pokédex list — is Normal.
  // Independent of the app language, which is global and lives in the header.
  const [variant, setVariant] = useState<SpriteVariant>(variantParam === 'shiny' ? 'shiny' : 'normal');

  useEffect(() => {
    if (id === null) return;
    let cancelled = false;
    fetchPokemonDetails(id)
      .then((details) => {
        if (!cancelled) setState({ status: 'success', details });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  const accent = state.status === 'success' ? getTypeColor(state.details.types[0]) : palette.textMuted;

  if (id === null) {
    return (
      <PokedexScreen>
        <PokedexHeader title={t('detail.fallbackTitle')} onBack={() => goBack('/pokedex')} />
        <PokedexSurface>
          <StateView announce="alert">
            <Text style={message.error}>{t('detail.invalidId')}</Text>
            <Text style={message.muted}>
              {t('detail.invalidIdBody', { value: String(idParam), min: NATIONAL_DEX_MIN, max: NATIONAL_DEX_MAX })}
            </Text>
          </StateView>
        </PokedexSurface>
      </PokedexScreen>
    );
  }

  if (state.status === 'loading') {
    return (
      <PokedexScreen>
        <PokedexHeader title={t('detail.fallbackTitle')} trailing={formatDexNumber(id)} onBack={() => goBack('/pokedex')} />
        <PokedexSurface>
          <StateView>
            <ActivityIndicator color={palette.accent} />
            <Text style={message.muted}>{t('detail.loading', { number: formatDexNumber(id) })}</Text>
          </StateView>
        </PokedexSurface>
      </PokedexScreen>
    );
  }

  if (state.status === 'error') {
    return (
      <PokedexScreen>
        <PokedexHeader title={t('detail.fallbackTitle')} trailing={formatDexNumber(id)} onBack={() => goBack('/pokedex')} />
        <PokedexSurface>
          <StateView announce="alert">
            <Text style={message.error}>{t('detail.loadError', { number: formatDexNumber(id) })}</Text>
            <Text style={message.muted}>{state.message ?? t('common.unknownError')}</Text>
            <PrimaryButton label={t('common.retry')} onPress={retry} />
          </StateView>
        </PokedexSurface>
      </PokedexScreen>
    );
  }

  const { details } = state;
  const shinyAvailable = details.sprites.shiny !== null;
  // A shiny the API has no artwork for falls back to Normal rather than showing
  // nothing, and the control below reflects that fallback.
  const effectiveVariant: SpriteVariant = variant === 'shiny' && !shinyAvailable ? 'normal' : variant;
  const spriteUrl = resolveSprite(details.sprites, effectiveVariant);
  const name = displayName(details);
  const favorite = isFavorite(details.id);
  // Everything below is read from the already-loaded detail in the active
  // language, so a language switch re-renders without a request.
  const description = pickLocalized(details.descriptions, language) ?? t('detail.noDescription');
  const abilityLines = details.abilities.map((ability) =>
    ability.isHidden
      ? t('detail.hiddenAbility', { name: ability.names[language] })
      : ability.names[language],
  );
  const variantLabel = t(`detail.variant.${effectiveVariant}`);
  // Type-colored headings are 16px bold — body-size text — so they take a
  // shade of the accent that reaches 4.5:1 on the card, in either theme.
  const accentText = accentOn(accent, palette.surface);
  const onAccent = foregroundOn(accent);

  return (
    <PokedexScreen>
      <PokedexHeader
        title={name}
        trailing={formatDexNumber(details.id)}
        onBack={() => goBack('/pokedex')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* The Pokémon's own color carries the hero: a rounded accent field whose
            lower edge is where the white card starts, so the artwork straddles
            the two the way it does in Figma. The app's red stays in the chrome. */}
        <View style={styles.hero}>
          <View style={[styles.heroBackdrop, { backgroundColor: accent }]} pointerEvents="none">
            <View style={styles.watermark}>
              <MaterialCommunityIcons name="pokeball" size={WATERMARK_SIZE} color={OVERLAY.watermark} {...DECORATIVE} />
            </View>
          </View>
          {/* Artwork overlaps the card below; zIndex keeps it painted on top of it. */}
          <View style={styles.heroRow}>
            <HeroChevron direction="previous" currentId={details.id} color={onAccent} />
            {spriteUrl ? (
              <Image
                source={spriteUrl}
                style={styles.artwork}
                contentFit="contain"
                // The one informative image: it names the variant being shown.
                // On web the label becomes the <img> alt; a role there would land
                // on expo-image's wrapper as a second, unnamed image.
                accessible
                role={Platform.OS === 'web' ? undefined : 'img'}
                accessibilityLabel={t('detail.artwork', { name, variant: variantLabel })}
              />
            ) : (
              <View style={[styles.artwork, styles.artworkMissing]}>
                <Text style={[message.onColor, { color: onAccent }]}>{t('detail.noArtwork')}</Text>
              </View>
            )}
            <HeroChevron direction="next" currentId={details.id} color={onAccent} />
          </View>
        </View>

        <PokedexSurface variant="panel" style={styles.card}>
          {/* Three groups, so a tall viewport shares its spare height between
              them instead of dumping it all below Base Stats. On a short screen
              they simply stack as before. */}
          <View style={styles.group}>
            <View style={styles.types}>
              {details.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </View>

            {/* Secondary actions: compact, and purely local to already-loaded data. */}
            <View style={styles.actions}>
              <Segmented
                accent={accent}
                accessibilityLabel={t('detail.variantGroup')}
                options={[
                  { key: 'normal', label: t('detail.variant.normal') },
                  { key: 'shiny', label: t('detail.variant.shiny'), disabled: !shinyAvailable },
                ]}
                value={effectiveVariant}
                onChange={setVariant}
              />
              <CryButton apiName={details.apiName} name={name} accent={accent} />
              <IconButton
                icon={favorite ? 'heart' : 'heart-outline'}
                accent={accent}
                active={favorite}
                disabled={!hydrated}
                onPress={() => toggleFavorite(details.id, effectiveVariant)}
                // The label itself says add or remove, so no extra selected state.
                accessibilityLabel={t(favorite ? 'detail.favoriteRemove' : 'detail.favoriteAdd', { name })}
              />
            </View>
          </View>

          <View style={styles.group}>
            <Text style={[styles.sectionTitle, { color: accentText }]} {...SECTION_HEADING}>
              {t('detail.about')}
            </Text>
            <View style={styles.about}>
              <AboutColumn
                label={t('detail.weight')}
                icon="weight-kilogram"
                lines={[t('detail.kilograms', { value: formatDecimal(details.weightKg, language) })]}
              />
              <View style={styles.aboutDivider} />
              <AboutColumn
                label={t('detail.height')}
                icon="ruler"
                lines={[t('detail.metres', { value: formatDecimal(details.heightM, language) })]}
              />
              <View style={styles.aboutDivider} />
              <AboutColumn label={t('detail.abilities')} lines={abilityLines} />
            </View>

            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={[styles.group, styles.statsGroup]}>
            <Text style={[styles.sectionTitle, { color: accentText }]} {...SECTION_HEADING}>
              {t('detail.baseStats')}
            </Text>
            <View style={styles.stats}>
              {STAT_ROWS.map((key, index) => (
                <StatBar
                  key={key}
                  label={t(`stats.${key}.short`)}
                  accessibilityLabel={t('stats.value', { stat: t(`stats.${key}.long`), value: details.stats[key] })}
                  value={details.stats[key]}
                  color={accent}
                  delayMs={index * STAT_STAGGER_MS}
                />
              ))}
            </View>
          </View>
        </PokedexSurface>
      </ScrollView>
    </PokedexScreen>
  );
}

/**
 * Previous/next chevron around the hero. Rendered as an invisible spacer at the
 * Dex boundaries so the artwork stays centered. `color` is the foreground that
 * reads on the hero's accent: white on dark types, dark on light ones.
 */
function HeroChevron({
  direction,
  currentId,
  color,
}: {
  direction: 'previous' | 'next';
  currentId: number;
  color: string;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const targetId = direction === 'previous' ? currentId - 1 : currentId + 1;
  if (!isSupportedDexId(targetId)) return <View style={styles.chevron} />;
  return (
    <Pressable
      onPress={() => goToDexId(targetId)}
      // 32px plus 8px on every side: a 48px target on native.
      hitSlop={8}
      role="button"
      accessibilityLabel={t(direction === 'previous' ? 'detail.previous' : 'detail.next', {
        number: formatDexNumber(targetId),
      })}
      style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}>
      <MaterialCommunityIcons
        name={direction === 'previous' ? 'chevron-left' : 'chevron-right'}
        size={32}
        color={color}
        {...DECORATIVE}
      />
    </Pressable>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent,
  accessibilityLabel,
}: {
  options: { key: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (next: T) => void;
  accent: string;
  accessibilityLabel: string;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <View style={styles.segmented} role="group" aria-label={accessibilityLabel}>
      {options.map((option, index) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            disabled={option.disabled}
            hitSlop={index === 0 ? SEGMENT_HIT_SLOP.first : SEGMENT_HIT_SLOP.rest}
            {...choiceProps(selected)}
            aria-disabled={option.disabled ?? false}
            accessibilityLabel={t('detail.segmentOption', { group: accessibilityLabel, option: option.label })}
            style={[
              styles.segment,
              selected && { backgroundColor: accent },
              option.disabled && styles.disabled,
            ]}>
            {/* Selected also reads bolder, not only filled with the accent. */}
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected, selected && { color: foregroundOn(accent) }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AboutColumn({
  label,
  icon,
  lines,
}: {
  label: string;
  icon?: 'weight-kilogram' | 'ruler';
  lines: string[];
}) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <View style={styles.aboutColumn}>
      <View style={styles.aboutValues}>
        {lines.map((line) => (
          <View key={line} style={styles.aboutValueRow}>
            {icon !== undefined && (
              <MaterialCommunityIcons name={icon} size={14} color={palette.text} {...DECORATIVE} />
            )}
            <Text style={styles.aboutValue}>{line}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.aboutLabel}>{label}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((c) => ({
  // `flexGrow` (not `flex`) so the card fills a short viewport but still grows with content.
  content: {
    flexGrow: 1,
    paddingHorizontal: SHELL.inset,
    paddingBottom: SHELL.inset,
  },
  hero: {
    zIndex: 1,
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.sheet,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: -16,
    right: -16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    // The artwork overhangs the accent field by this much and lands on the card.
    marginBottom: -ARTWORK_OVERLAP,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
  },
  artworkMissing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexGrow: 1,
    // Room for the artwork that overhangs the top of the card.
    paddingTop: ARTWORK_OVERLAP + SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
    // Spare height on a tall phone is shared between the three groups rather
    // than left as one dead block under Base Stats. A no-op once the content
    // is taller than the viewport, so 360x640 layouts are untouched.
    justifyContent: 'space-between',
  },
  group: {
    gap: SPACING.lg,
  },
  types: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    borderRadius: RADIUS.card,
    backgroundColor: c.surfaceMuted,
  },
  segment: {
    // min-: grows with a larger text size instead of clipping the label.
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 10,
    // 24px tall, so the pill radius is what the segment already rendered as.
    borderRadius: RADIUS.pill,
  },
  segmentText: {
    ...TYPO.body3,
    color: c.textMuted,
  },
  segmentTextSelected: {
    ...TYPO.subtitle3,
  },
  disabled: {
    opacity: OPACITY.disabled,
  },
  sectionTitle: {
    ...TYPO.subtitle1,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  about: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  aboutColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  aboutDivider: {
    width: 1,
    backgroundColor: c.divider,
  },
  aboutValues: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  aboutValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aboutValue: {
    ...TYPO.body2,
    color: c.text,
    textAlign: 'center',
  },
  aboutLabel: {
    ...TYPO.caption,
    color: c.textMuted,
  },
  description: {
    ...TYPO.body2,
    color: c.text,
  },
  stats: {
    gap: SPACING.md,
    // On a tall screen the table itself absorbs the spare height — up to
    // STATS_MAX_HEIGHT — so the card never opens large gaps between its
    // sections, and the short layout (which has no spare height) is untouched.
    flexGrow: 1,
    justifyContent: 'space-between',
    maxHeight: STATS_MAX_HEIGHT,
  },
  statsGroup: {
    flexGrow: 1,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
}));
