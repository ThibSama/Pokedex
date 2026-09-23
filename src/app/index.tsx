import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  fetchPokemonById,
  NATIONAL_DEX_TOTAL,
  resolveSprite,
} from "@/api/pokeApi";
import { PrimaryButton } from "@/components/Controls";
import {
  PokedexHeader,
  PokedexScreen,
  PokedexSurface,
} from "@/components/PokedexShell";
import { TypeBadge } from "@/components/TypeBadge";
import { getTypeColor, withAlpha } from "@/constants/typeColors";
import { useFavorites } from "@/favorites/FavoritesProvider";
import { usePokemonText } from "@/i18n/pokemonText";
import { accentOn, MIN_CONTRAST } from "@/theme/contrast";
import { useMessageStyles } from "@/theme/messages";
import { createThemedStyles, useTheme } from "@/theme/ThemeProvider";
import { BRAND, OPACITY, RADIUS, SPACING } from "@/theme/tokens";
import { TYPO } from "@/theme/typography";
import type {
  NationalDexId,
  PokemonSummary,
  SpriteVariant,
} from "@/types/pokemon";
import { DECORATIVE } from "@/utils/a11y";
import { formatDexNumber } from "@/utils/pokemonList";

/**
 * Outcome of the hero fetch, tagged with the id it was requested for. An error
 * keeps the technical message only; the fallback wording is translated at
 * render time so it follows a language switch.
 */
type HeroResult =
  | { id: NationalDexId; status: "success"; pokemon: PokemonSummary }
  | { id: NationalDexId; status: "error"; message: string | null };

/** Random hero used while the collection is empty. */
const EMPTY_COLLECTION_HERO_ID = (Math.floor(
  Math.random() * NATIONAL_DEX_TOTAL,
) + 1) as NationalDexId;

/**
 * The stage the hero Pokémon stands on: a square area, with the Pokéball
 * watermark centered behind the artwork at `STAGE_SIZE` minus the stage margin
 * on every side.
 */
const STAGE_SIZE = 220;
const STAGE_MARGIN = SPACING.lg;
const WATERMARK_SIZE = STAGE_SIZE - 2 * STAGE_MARGIN;

function pickRandom(ids: readonly NationalDexId[]): NationalDexId {
  return ids[Math.floor(Math.random() * ids.length)];
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { name, cardLabel } = usePokemonText();
  const { hydrated, favoriteIds, getFavorite } = useFavorites();
  const styles = useStyles();
  const message = useMessageStyles();
  const { palette } = useTheme();

  const [heroId, setHeroId] = useState<NationalDexId | null>(null);
  const [result, setResult] = useState<HeroResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  const favoritesKey = favoriteIds.join(",");
  const [selectedFor, setSelectedFor] = useState<string | null>(null);

  // Hero selection is adjusted during render (the React "derived state" pattern)
  // and guarded by `selectedFor`, so the random draw runs once per favorite set
  // instead of on every render.
  if (hydrated && selectedFor !== favoritesKey) {
    setSelectedFor(favoritesKey);
    if (favoriteIds.length === 0) {
      setHeroId(EMPTY_COLLECTION_HERO_ID);
    } else if (heroId === null || !favoriteIds.includes(heroId)) {
      setHeroId(pickRandom(favoriteIds));
    }
  }
  useEffect(() => {
    if (heroId === null) return;
    const requestedId = heroId;
    let cancelled = false;
    // Exactly one summary request: Home never loads the Dex or every favorite.
    fetchPokemonById(requestedId)
      .then((pokemon) => {
        if (!cancelled)
          setResult({ id: requestedId, status: "success", pokemon });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({
            id: requestedId,
            status: "error",
            message: error instanceof Error ? error.message : null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [heroId, attempt]);

  // A result belongs to the current hero only while its id still matches, so
  // selecting another hero shows the loading state without an extra setState.
  const state = useMemo<HeroResult | { status: "loading" }>(
    () =>
      result !== null && result.id === heroId ? result : { status: "loading" },
    [result, heroId],
  );

  const retry = useCallback(() => {
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);
  const openHero = useCallback(
    (variant: SpriteVariant) => {
      if (state.status === "success") {
        router.push({
          pathname: "/pokemon/[id]",
          params: { id: state.pokemon.id, variant },
        });
      }
    },
    [router, state],
  );

  const favoriteCount = favoriteIds.length;
  // The hero is shown as it was saved: a shiny favorite shows its shiny
  // artwork; anything else stays Normal.
  const heroVariant: SpriteVariant =
    state.status === "success"
      ? (getFavorite(state.pokemon.id)?.variant ?? "normal")
      : "normal";
  const isShinyHero = heroVariant === "shiny";
  const heroSprite =
    state.status === "success"
      ? resolveSprite(state.pokemon.sprites, heroVariant)
      : null;
  const accent =
    state.status === "success"
      ? getTypeColor(state.pokemon.types[0])
      : palette.textMuted;

  return (
    <PokedexScreen>
      <PokedexHeader
        title={t("home.title")}
        subtitle={t("home.subtitle", { count: NATIONAL_DEX_TOTAL })}
      />

      {/* Home is a screen inside the Pokédex, not a separate page: the white
          sheet is the room the hero Pokémon stands in, and the shortcuts
          sit under it. */}
      <PokedexSurface>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {!hydrated || state.status === "loading" ? (
            <View style={styles.featured}>
              <Stage>
                <ActivityIndicator color={palette.accent} />
              </Stage>
              <Text style={message.muted}>
                {t(hydrated ? "home.loadingHero" : "common.readingCollection")}
              </Text>
            </View>
          ) : state.status === "error" ? (
            <View style={styles.featured} role="alert">
              <Stage />
              <Text style={message.error}>{t("home.heroError")}</Text>
              <Text style={message.muted}>
                {state.message ?? t("common.unknownError")}
              </Text>
              <PrimaryButton
                label={t("common.retry")}
                onPress={retry}
                accessibilityLabel={t("home.heroRetryLabel")}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => openHero(heroVariant)}
              role="button"
              accessibilityLabel={cardLabel(state.pokemon, isShinyHero)}
              accessibilityHint={t("pokemon.openHint")}
              style={({ pressed }) => [
                styles.featured,
                pressed && styles.pressed,
              ]}>
              <Stage>
                {/* The button's label already names the Pokémon: the artwork is decorative. */}
                {heroSprite !== null && (
                  <Image
                    source={heroSprite}
                    style={styles.artwork}
                    contentFit="contain"
                    accessibilityLabel=""
                  />
                )}
              </Stage>
              <Text style={styles.dexNumber}>
                {formatDexNumber(state.pokemon.id)}
              </Text>
              <Text style={styles.name}>{name(state.pokemon)}</Text>
              <View style={styles.types}>
                {state.pokemon.types.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </View>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{t("home.viewEntry")}</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={16}
                  color={palette.accent}
                  {...DECORATIVE}
                />
              </View>
            </Pressable>
          )}

          <View style={styles.actions}>
            <ActionCard
              accent={BRAND.red}
              icon="format-list-bulleted"
              title={t("home.pokedexCard.title")}
              subtitle={t("home.pokedexCard.subtitle")}
              value={String(NATIONAL_DEX_TOTAL)}
              unit={t("home.pokedexCard.unit")}
              accessibilityLabel={t("home.pokedexCard.label")}
              accessibilityHint={t("home.pokedexCard.hint")}
              onPress={() => router.push("/pokedex")}
            />
            <ActionCard
              accent={accent}
              icon="heart"
              title={t("home.collectionCard.title")}
              subtitle={t("home.collectionCard.subtitle")}
              value={hydrated ? String(favoriteCount) : "…"}
              unit={t("home.collectionCard.unit", { count: favoriteCount })}
              accessibilityLabel={t("home.collectionCard.label", {
                count: favoriteCount,
              })}
              accessibilityHint={t("home.collectionCard.hint")}
              onPress={() => router.push("/collection")}
            />
          </View>
        </ScrollView>
      </PokedexSurface>
    </PokedexScreen>
  );
}

/**
 * The stage: the brand's Pokéball watermark, painted straight on the sheet in
 * the theme's watermark gray, and whatever stands on it — the hero artwork, a
 * spinner, or nothing for an empty state. The artwork is deliberately larger
 * than the watermark so the Pokémon reads as present in the room rather than
 * contained by a card.
 */
function Stage({ children }: { children?: ReactNode }) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <View style={styles.stage}>
      <View style={styles.watermark} pointerEvents="none" {...DECORATIVE}>
        <MaterialCommunityIcons
          name="pokeball"
          size={WATERMARK_SIZE}
          color={palette.watermark}
        />
      </View>
      {children}
    </View>
  );
}

/**
 * One shortcut tile: accent icon chip, label, and a live count in accent. The
 * count is large text (24px bold), so it takes a shade of the accent that
 * reaches 3:1 on the tile; the chip and the top edge keep the accent itself.
 */
function ActionCard({
  accent,
  icon,
  title,
  subtitle,
  value,
  unit,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: {
  accent: string;
  icon: "format-list-bulleted" | "heart";
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.actionCard,
        { borderTopColor: accent },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: withAlpha(accent, 0.14) },
        ]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={accent}
          {...DECORATIVE}
        />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
      <View style={styles.actionMetric}>
        <Text
          style={[
            styles.actionValue,
            {
              color: accentOn(
                accent,
                palette.surfaceMuted,
                MIN_CONTRAST.largeText,
              ),
            },
          ]}>
          {value}
        </Text>
        <Text style={styles.actionUnit}>{unit}</Text>
      </View>
    </Pressable>
  );
}

const useStyles = createThemedStyles((c) => ({
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  featured: {
    alignItems: "center",
    gap: SPACING.md,
  },
  stage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  watermark: {
    position: "absolute",
    top: STAGE_MARGIN,
    left: STAGE_MARGIN,
    right: STAGE_MARGIN,
    bottom: STAGE_MARGIN,
    alignItems: "center",
    justifyContent: "center",
  },
  artwork: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
  },
  dexNumber: {
    ...TYPO.subtitle2,
    color: c.textMuted,
    fontVariant: ["tabular-nums"],
  },
  name: {
    ...TYPO.headline,
    color: c.text,
  },
  types: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  cta: {
    marginTop: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    ...TYPO.subtitle2,
    color: c.accent,
  },
  actions: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: c.surfaceMuted,
    borderRadius: RADIUS.card,
    // A thick accent edge is what keeps the two tiles telling themselves apart.
    borderTopWidth: 4,
    padding: 14,
    gap: SPACING.xs,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  actionTitle: {
    ...TYPO.subtitle1,
    fontSize: 16,
    lineHeight: 20,
    color: c.text,
  },
  actionSubtitle: {
    ...TYPO.body3,
    color: c.textMuted,
  },
  actionMetric: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.xs,
    marginTop: 6,
  },
  actionValue: {
    ...TYPO.headline,
    fontVariant: ["tabular-nums"],
  },
  actionUnit: {
    ...TYPO.body3,
    color: c.textMuted,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
}));
