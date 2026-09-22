import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchPokemonDetails, isSupportedDexId, NATIONAL_DEX_MAX, NATIONAL_DEX_MIN } from '@/api/pokeApi';
import type { LanguageCode, PokemonDetails, PokemonStats } from '@/types/pokemon';
import { formatDexNumber } from '@/utils/pokemonList';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; details: PokemonDetails };

type SpriteVariant = 'normal' | 'shiny';

const STAT_LABELS: { key: keyof PokemonStats; label: string }[] = [
  { key: 'hp', label: 'PV' },
  { key: 'attack', label: 'Attaque' },
  { key: 'defense', label: 'Défense' },
  { key: 'specialAttack', label: 'Attaque Spé.' },
  { key: 'specialDefense', label: 'Défense Spé.' },
  { key: 'speed', label: 'Vitesse' },
];

/** Parse the route param into a supported Dex id, or null when invalid. */
function parseDexId(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return isSupportedDexId(id) ? id : null;
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

  if (id === null) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Pokémon' }} />
        <Text style={styles.error}>Identifiant invalide.</Text>
        <Text style={styles.muted}>
          « {String(idParam)} » n’est pas un numéro du Pokédex national ({NATIONAL_DEX_MIN}–{NATIONAL_DEX_MAX}).
        </Text>
      </View>
    );
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: formatDexNumber(id) }} />
        <ActivityIndicator />
        <Text style={styles.muted}>Chargement de {formatDexNumber(id)}…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: formatDexNumber(id) }} />
        <Text style={styles.error}>Impossible de charger {formatDexNumber(id)}.</Text>
        <Text style={styles.muted}>{state.message}</Text>
        <Pressable onPress={retry} style={styles.button}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const { details } = state;
  const spriteUrl = details.sprites[variant];
  const shinyAvailable = details.sprites.shiny !== null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: details.names[language] }} />

      <View style={styles.header}>
        <Text style={styles.dexNumber}>{formatDexNumber(details.id)}</Text>
        <Text style={styles.name}>{details.names[language]}</Text>
        <Text style={styles.muted}>{details.apiName}</Text>
        <View style={styles.types}>
          {details.types.map((type) => (
            <Text key={type} style={styles.type}>
              {type}
            </Text>
          ))}
        </View>
      </View>

      {spriteUrl ? (
        <Image
          source={spriteUrl}
          style={styles.artwork}
          contentFit="contain"
          accessibilityLabel={`${details.names[language]} (${variant})`}
        />
      ) : (
        <View style={[styles.artwork, styles.artworkMissing]}>
          <Text style={styles.muted}>Aucune image</Text>
        </View>
      )}

      <View style={styles.toggles}>
        <View style={styles.toggleGroup}>
          <Chip label="Normal" selected={variant === 'normal'} onPress={() => setVariant('normal')} />
          <Chip
            label="Shiny"
            selected={variant === 'shiny'}
            disabled={!shinyAvailable}
            onPress={() => setVariant('shiny')}
          />
        </View>
        <View style={styles.toggleGroup}>
          <Chip label="FR" selected={language === 'fr'} onPress={() => setLanguage('fr')} />
          <Chip label="EN" selected={language === 'en'} onPress={() => setLanguage('en')} />
        </View>
      </View>

      <Section title="Description">
        <Text style={styles.body}>{details.description ?? 'Aucune description disponible.'}</Text>
        {details.descriptionLanguage && details.descriptionLanguage !== language && (
          <Text style={styles.muted}>(texte en {details.descriptionLanguage.toUpperCase()})</Text>
        )}
      </Section>

      <Section title="Caractéristiques">
        <Row label="Taille" value={`${details.heightM.toFixed(1)} m`} />
        <Row label="Poids" value={`${details.weightKg.toFixed(1)} kg`} />
        <Row
          label="Talents"
          value={details.abilities.map((a) => (a.isHidden ? `${a.name} (caché)` : a.name)).join(', ')}
        />
      </Section>

      <Section title="Statistiques de base">
        {STAT_LABELS.map(({ key, label }) => (
          <Row key={key} label={label} value={String(details.stats[key])} />
        ))}
      </Section>
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  dexNumber: {
    fontSize: 14,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
  },
  types: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  type: {
    fontSize: 13,
    textTransform: 'capitalize',
    color: '#374151',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  artwork: {
    width: 220,
    height: 220,
    alignSelf: 'center',
  },
  artworkMissing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  toggles: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#1d4ed8',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    color: '#6b7280',
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
