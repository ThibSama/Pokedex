import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchPokemonDetails, isSupportedDexId, NATIONAL_DEX_MAX, NATIONAL_DEX_MIN } from '@/api/pokeApi';
import { CryButton } from '@/components/CryButton';
import { StatBar } from '@/components/StatBar';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeColor, PALETTE } from '@/constants/typeColors';
import type { LanguageCode, PokemonDetails, PokemonStats } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

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

export default function PokemonDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = parseDexId(idParam);

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
  const headerOptions = {
    headerStyle: { backgroundColor: accent },
    headerTintColor: PALETTE.white,
    headerShadowVisible: false,
    headerTitleStyle: { color: PALETTE.white, fontSize: 24, fontWeight: '700' as const },
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  if (id === null) {
    return (
      <View style={[styles.centered, { backgroundColor: accent }]}>
        <Stack.Screen options={{ ...headerOptions, title: 'Pokémon' }} />
        <View style={styles.messageCard}>
          <Text style={styles.error}>Identifiant invalide.</Text>
          <Text style={styles.muted}>
            « {String(idParam)} » n’est pas un numéro du Pokédex national ({NATIONAL_DEX_MIN}–{NATIONAL_DEX_MAX}).
          </Text>
        </View>
      </View>
    );
  }

  if (state.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: accent }]}>
        <Stack.Screen options={{ ...headerOptions, title: formatDexNumber(id) }} />
        <ActivityIndicator color={PALETTE.white} />
        <Text style={styles.onAccent}>Chargement de {formatDexNumber(id)}…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: accent }]}>
        <Stack.Screen options={{ ...headerOptions, title: formatDexNumber(id) }} />
        <View style={styles.messageCard}>
          <Text style={styles.error}>Impossible de charger {formatDexNumber(id)}.</Text>
          <Text style={styles.muted}>{state.message}</Text>
          <Pressable onPress={retry} style={[styles.button, { backgroundColor: accent }]}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { details } = state;
  const spriteUrl = details.sprites[variant];
  const shinyAvailable = details.sprites.shiny !== null;
  const name = details.names[language];

  return (
    <View style={[styles.screen, { backgroundColor: accent }]}>
      <Stack.Screen
        options={{
          ...headerOptions,
          title: name,
          headerRight: () => <Text style={styles.headerDexNumber}>{formatDexNumber(details.id)}</Text>,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Artwork overlaps the card, as in the Figma. */}
        <View style={styles.artworkSlot}>
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
        </View>

        <View style={styles.card}>
          <View style={styles.types}>
            {details.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </View>

          {/* Compact local toggles; they only index into already-loaded data. */}
          <View style={styles.toggles}>
            <Toggle label="Normal" selected={variant === 'normal'} onPress={() => setVariant('normal')} accent={accent} />
            <Toggle
              label="Shiny"
              selected={variant === 'shiny'}
              disabled={!shinyAvailable}
              onPress={() => setVariant('shiny')}
              accent={accent}
            />
            <View style={styles.toggleGap} />
            <Toggle label="FR" selected={language === 'fr'} onPress={() => setLanguage('fr')} accent={accent} />
            <Toggle label="EN" selected={language === 'en'} onPress={() => setLanguage('en')} accent={accent} />
            <View style={styles.toggleGap} />
            <CryButton apiName={details.apiName} accent={accent} />
          </View>

          <Text style={[styles.sectionTitle, { color: accent }]}>About</Text>
          <View style={styles.about}>
            <AboutColumn label="Weight" lines={[formatMetric(details.weightKg, 'kg')]} />
            <View style={styles.aboutDivider} />
            <AboutColumn label="Height" lines={[formatMetric(details.heightM, 'm')]} />
            <View style={styles.aboutDivider} />
            <AboutColumn
              label="Moves"
              lines={details.abilities.map((a) => (a.isHidden ? `${a.name} (hidden)` : a.name))}
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
    </View>
  );
}

function Toggle({
  label,
  selected,
  disabled = false,
  accent,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.toggle, selected && { backgroundColor: accent }, disabled && styles.toggleDisabled]}>
      <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function AboutColumn({ label, lines }: { label: string; lines: string[] }) {
  return (
    <View style={styles.aboutColumn}>
      <View style={styles.aboutValues}>
        {lines.map((line) => (
          <Text key={line} style={styles.aboutValue}>
            {line}
          </Text>
        ))}
      </View>
      <Text style={styles.aboutLabel}>{label}</Text>
    </View>
  );
}

const ARTWORK_SIZE = 200;
const ARTWORK_OVERLAP = 60;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  content: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  artworkSlot: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: -ARTWORK_OVERLAP,
    zIndex: 1,
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
    backgroundColor: PALETTE.white,
    borderRadius: 8,
    paddingTop: ARTWORK_OVERLAP + 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
    minHeight: 480,
  },
  headerDexNumber: {
    color: PALETTE.white,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 20,
  },
  types: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  toggles: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  toggleGap: {
    width: 12,
  },
  toggle: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: PALETTE.background,
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  toggleText: {
    fontSize: 10,
    color: PALETTE.medium,
  },
  toggleTextSelected: {
    color: PALETTE.white,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
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
  aboutValue: {
    fontSize: 12,
    color: PALETTE.dark,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  aboutLabel: {
    fontSize: 10,
    color: PALETTE.medium,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
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
    color: PALETTE.white,
    fontSize: 12,
    textAlign: 'center',
  },
  muted: {
    fontSize: 12,
    color: PALETTE.medium,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.dark,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: PALETTE.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
