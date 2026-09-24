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

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string | null }
  | { status: 'success'; details: PokemonDetails };

const STAT_ROWS: readonly (keyof PokemonStats)[] = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];
const STAT_STAGGER_MS = 80;

// Au-delà, la carte répartit elle-même la hauteur : le tableau ne s'étire pas.
const STATS_MAX_HEIGHT = STAT_ROWS.length * 40 + (STAT_ROWS.length - 1) * SPACING.md;

// hitSlop natif : 44px de haut, et 1px seulement dans l'écart de 2px pour que
// les zones des deux segments ne se chevauchent pas.
const SEGMENT_HIT_SLOP = {
  first: { top: 10, bottom: 10, left: 2, right: 1 },
  rest: { top: 10, bottom: 10, left: 1, right: 2 },
};

const ARTWORK_SIZE = 200;
const ARTWORK_OVERLAP = 60;
const WATERMARK_SIZE = 208;

function parseDexId(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return isSupportedDexId(id) ? id : null;
}

// replace plutôt que push : on n'empile pas un écran par voisin visité.
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
  // Normal par défaut, sauf variante passée par la route (héros de l'accueil,
  // case de la collection). Ne déclenche jamais de nouvelle requête.
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
  // Sans artwork shiny, on retombe sur Normal et le contrôle reflète ce repli.
  const effectiveVariant: SpriteVariant = variant === 'shiny' && !shinyAvailable ? 'normal' : variant;
  const spriteUrl = resolveSprite(details.sprites, effectiveVariant);
  const name = displayName(details);
  const favorite = isFavorite(details.id);
  const description = pickLocalized(details.descriptions, language) ?? t('detail.noDescription');
  const abilityLines = details.abilities.map((ability) =>
    ability.isHidden
      ? t('detail.hiddenAbility', { name: ability.names[language] })
      : ability.names[language],
  );
  const variantLabel = t(`detail.variant.${effectiveVariant}`);
  // Titres de 16px gras, donc texte courant : nuance de l'accent à 4,5:1 sur la
  // carte, dans les deux thèmes.
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
        <View style={styles.hero}>
          <View style={[styles.heroBackdrop, { backgroundColor: accent }]} pointerEvents="none">
            <View style={styles.watermark}>
              <MaterialCommunityIcons name="pokeball" size={WATERMARK_SIZE} color={OVERLAY.watermark} {...DECORATIVE} />
            </View>
          </View>
          <View style={styles.heroRow}>
            <HeroChevron direction="previous" currentId={details.id} color={onAccent} />
            {spriteUrl ? (
              <Image
                source={spriteUrl}
                style={styles.artwork}
                contentFit="contain"
                // Sur le web, le label devient l'alt du <img> ; un role y tomberait sur
                // le wrapper d'expo-image, vu comme une seconde image sans nom.
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
          <View style={styles.group}>
            <View style={styles.types}>
              {details.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </View>

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
                // Le label dit déjà ajouter ou retirer : pas d'état sélectionné en plus.
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

// Aux bornes du Dex, un espaceur invisible garde l'artwork centré.
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
      // 32px + 8px de chaque côté : cible de 48px en natif.
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
            {/* La sélection se lit aussi en gras, pas seulement par la couleur. */}
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
  // `flexGrow` et non `flex` : remplit un écran court mais grandit avec le contenu.
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
    paddingTop: ARTWORK_OVERLAP + SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
    // Répartit la hauteur libre d'un grand écran entre les trois groupes ; sans
    // effet dès que le contenu dépasse l'écran.
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
    // minHeight : grandit avec la taille de texte au lieu de rogner le libellé.
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 10,
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
