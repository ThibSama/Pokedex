import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchPokemonDetails, isSupportedDexId, NATIONAL_DEX_MAX, NATIONAL_DEX_MIN } from '@/api/pokeApi';
import { CryButton } from '@/components/CryButton';
import { StatBar } from '@/components/StatBar';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeColor, PALETTE } from '@/constants/typeColors';
import { useFavorites } from '@/favorites/FavoritesProvider';
import { TYPO } from '@/theme/typography';
import type { LanguageCode, PokemonDetails, PokemonStats } from '@/types/pokemon';
import { formatDexNumber, humanizeSlug } from '@/utils/pokemonList';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; details: PokemonDetails };

type SpriteVariant = 'normal' | 'shiny';

/** Figma order and labels. */
const STAT_ROWS: { key: keyof PokemonStats; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'ATK' },
  { key: 'defense', label: 'DEF' },
  { key: 'specialAttack', label: 'SATK' },
  { key: 'specialDefense', label: 'SDEF' },
  { key: 'speed', label: 'SPD' },
];
const STAT_STAGGER_MS = 80;

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

function formatMetric(value: number, unit: string) {
  return `${value.toFixed(1).replace('.', ',')} ${unit}`;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/pokedex');
}

/** Swap the current entry rather than stacking one screen per neighbour visited. */
function goToDexId(id: number) {
  router.replace({ pathname: '/pokemon/[id]', params: { id } });
}

export default function PokemonDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = parseDexId(idParam);

  const { hydrated, isFavorite, toggleFavorite } = useFavorites();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Local UI state only: switches between already-fetched data, never refetches.
  const [variant, setVariant] = useState<SpriteVariant>('normal');
  const [language, setLanguage] = useState<LanguageCode>('fr');

  useEffect(() => {
    if (id === null) return;
    let cancelled = false;
    fetchPokemonDetails(id)
      .then((details) => {
        if (!cancelled) setState({ status: 'success', details });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
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

  const accent = state.status === 'success' ? getTypeColor(state.details.types[0]) : PALETTE.medium;

  if (id === null) {
    return (
      <Shell accent={accent} title="Pokémon">
        <View style={styles.centered}>
          <View style={styles.messageCard}>
            <Text style={styles.error}>Identifiant invalide.</Text>
            <Text style={styles.muted}>
              « {String(idParam)} » n’est pas un numéro du Pokédex national ({NATIONAL_DEX_MIN}–{NATIONAL_DEX_MAX}).
            </Text>
          </View>
        </View>
      </Shell>
    );
  }

  if (state.status === 'loading') {
    return (
      <Shell accent={accent} title="Pokémon" dexNumber={formatDexNumber(id)}>
        <View style={styles.centered}>
          <ActivityIndicator color={PALETTE.white} />
          <Text style={styles.onAccent}>Chargement de {formatDexNumber(id)}…</Text>
        </View>
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell accent={accent} title="Pokémon" dexNumber={formatDexNumber(id)}>
        <View style={styles.centered}>
          <View style={styles.messageCard}>
            <Text style={styles.error}>Impossible de charger {formatDexNumber(id)}.</Text>
            <Text style={styles.muted}>{state.message}</Text>
            <Pressable onPress={retry} style={[styles.button, { backgroundColor: accent }]}>
              <Text style={styles.buttonText}>Réessayer</Text>
            </Pressable>
          </View>
        </View>
      </Shell>
    );
  }

  const { details } = state;
  const spriteUrl = details.sprites[variant];
  const shinyAvailable = details.sprites.shiny !== null;
  const name = details.names[language];
  const favorite = isFavorite(details.id);

  return (
    <Shell accent={accent} title={name} dexNumber={formatDexNumber(details.id)}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Artwork overlaps the card, flanked by the Figma navigation chevrons. */}
        <View style={styles.heroRow}>
          <HeroChevron direction="previous" currentId={details.id} />
          {spriteUrl ? (
            <Image
              source={spriteUrl}
              style={styles.artwork}
              contentFit="contain"
              accessibilityLabel={`${name} (${variant})`}
            />
          ) : (
            <View style={[styles.artwork, styles.artworkMissing]}>
              <Text style={styles.onAccent}>Aucune image</Text>
            </View>
          )}
          <HeroChevron direction="next" currentId={details.id} />
        </View>

        <View style={styles.card}>
          <View style={styles.types}>
            {details.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </View>

          {/* Secondary actions: compact, and purely local to already-loaded data. */}
          <View style={styles.actions}>
            <Segmented
              accent={accent}
              accessibilityLabel="Apparence"
              options={[
                { key: 'normal', label: 'Normal' },
                { key: 'shiny', label: 'Shiny', disabled: !shinyAvailable },
              ]}
              value={variant}
              onChange={setVariant}
            />
            <Segmented
              accent={accent}
              accessibilityLabel="Langue du nom"
              options={[
                { key: 'fr', label: 'FR' },
                { key: 'en', label: 'EN' },
              ]}
              value={language}
              onChange={setLanguage}
            />
            <CryButton apiName={details.apiName} accent={accent} />
            <Pressable
              onPress={() => toggleFavorite(details.id)}
              disabled={!hydrated}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                favorite ? `Retirer ${name} de la collection` : `Ajouter ${name} à la collection`
              }
              accessibilityState={{ disabled: !hydrated, selected: favorite }}
              style={[
                styles.iconButton,
                favorite && { backgroundColor: accent },
                !hydrated && styles.disabled,
              ]}>
              <MaterialCommunityIcons
                name={favorite ? 'heart' : 'heart-outline'}
                size={16}
                color={favorite ? PALETTE.white : accent}
              />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: accent }]}>About</Text>
          <View style={styles.about}>
            <AboutColumn label="Poids" icon="weight-kilogram" lines={[formatMetric(details.weightKg, 'kg')]} />
            <View style={styles.aboutDivider} />
            <AboutColumn label="Taille" icon="ruler" lines={[formatMetric(details.heightM, 'm')]} />
            <View style={styles.aboutDivider} />
            <AboutColumn
              label="Talents"
              lines={details.abilities.map((ability) =>
                ability.isHidden ? `${humanizeSlug(ability.name)} (caché)` : humanizeSlug(ability.name),
              )}
            />
          </View>

          <Text style={styles.description}>{details.description ?? 'Aucune description disponible.'}</Text>

          <Text style={[styles.sectionTitle, { color: accent }]}>Base Stats</Text>
          <View style={styles.stats}>
            {STAT_ROWS.map(({ key, label }, index) => (
              <StatBar
                key={key}
                label={label}
                value={details.stats[key]}
                color={accent}
                delayMs={index * STAT_STAGGER_MS}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </Shell>
  );
}

/**
 * The accent-colored frame shared by every state: Pokéball watermark, custom
 * title row (back / name / #NNN) and the accent background itself.
 */
function Shell({
  accent,
  title,
  dexNumber,
  children,
}: {
  accent: string;
  title: string;
  dexNumber?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: accent }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.watermark, { top: insets.top - 16 }]} pointerEvents="none">
        <MaterialCommunityIcons name="pokeball" size={WATERMARK_SIZE} color="rgba(255, 255, 255, 0.12)" />
      </View>
      <View style={[styles.titleRow, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Revenir à l’écran précédent"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={PALETTE.white} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {dexNumber !== undefined && <Text style={styles.dexNumber}>{dexNumber}</Text>}
      </View>
      {children}
    </View>
  );
}

/**
 * Previous/next chevron around the hero. Rendered as an invisible spacer at the
 * Dex boundaries so the artwork stays centered.
 */
function HeroChevron({ direction, currentId }: { direction: 'previous' | 'next'; currentId: number }) {
  const targetId = direction === 'previous' ? currentId - 1 : currentId + 1;
  if (!isSupportedDexId(targetId)) return <View style={styles.chevron} />;
  return (
    <Pressable
      onPress={() => goToDexId(targetId)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        direction === 'previous'
          ? `Pokémon précédent, ${formatDexNumber(targetId)}`
          : `Pokémon suivant, ${formatDexNumber(targetId)}`
      }
      style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}>
      <MaterialCommunityIcons
        name={direction === 'previous' ? 'chevron-left' : 'chevron-right'}
        size={32}
        color={PALETTE.white}
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
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            disabled={option.disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: option.disabled ?? false }}
            accessibilityLabel={`${accessibilityLabel} : ${option.label}`}
            style={[
              styles.segment,
              selected && { backgroundColor: accent },
              option.disabled && styles.disabled,
            ]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
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
  return (
    <View style={styles.aboutColumn}>
      <View style={styles.aboutValues}>
        {lines.map((line) => (
          <View key={line} style={styles.aboutValueRow}>
            {icon !== undefined && <MaterialCommunityIcons name={icon} size={14} color={PALETTE.dark} />}
            <Text style={styles.aboutValue}>{line}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.aboutLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  watermark: {
    position: 'absolute',
    right: -16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    paddingRight: 20,
    paddingBottom: 4,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPO.headline,
    flex: 1,
    color: PALETTE.white,
  },
  dexNumber: {
    ...TYPO.subtitle2,
    color: PALETTE.white,
    fontVariant: ['tabular-nums'],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  // `flexGrow` (not `flex`) so the card fills a short viewport but still grows with content.
  content: {
    flexGrow: 1,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: -ARTWORK_OVERLAP,
    zIndex: 1,
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
    backgroundColor: PALETTE.white,
    borderRadius: 8,
    paddingTop: ARTWORK_OVERLAP + 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  types: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    borderRadius: 16,
    backgroundColor: PALETTE.background,
  },
  segment: {
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  segmentText: {
    ...TYPO.body3,
    color: PALETTE.medium,
  },
  segmentTextSelected: {
    ...TYPO.subtitle3,
    color: PALETTE.white,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.background,
  },
  disabled: {
    opacity: 0.4,
  },
  sectionTitle: {
    ...TYPO.subtitle1,
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
    gap: 8,
    paddingHorizontal: 8,
  },
  aboutDivider: {
    width: 1,
    backgroundColor: PALETTE.light,
  },
  aboutValues: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  aboutValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aboutValue: {
    ...TYPO.body2,
    color: PALETTE.dark,
    textAlign: 'center',
  },
  aboutLabel: {
    ...TYPO.caption,
    color: PALETTE.medium,
  },
  description: {
    ...TYPO.body2,
    color: PALETTE.dark,
  },
  stats: {
    gap: 8,
  },
  messageCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 8,
    padding: 20,
    gap: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  onAccent: {
    ...TYPO.body2,
    color: PALETTE.white,
    textAlign: 'center',
  },
  muted: {
    ...TYPO.body2,
    color: PALETTE.medium,
    textAlign: 'center',
  },
  error: {
    ...TYPO.subtitle1,
    color: PALETTE.dark,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    ...TYPO.subtitle2,
    color: PALETTE.white,
  },
  pressed: {
    opacity: 0.7,
  },
});
