import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DEFAULT_BATCH_SIZE,
  fetchPokemonBatch,
  NATIONAL_DEX_TOTAL,
} from "@/api/pokeApi";
import { APP_FRAME_MAX_WIDTH, useFrameWidth } from "@/components/AppShell";
import { PrimaryButton, StateView } from "@/components/Controls";
import {
  goBack,
  PokedexHeader,
  PokedexScreen,
  PokedexSurface,
} from "@/components/PokedexShell";
import { PokemonCard } from "@/components/PokemonCard";
import { getTypeColor, TYPE_NAMES } from "@/constants/typeColors";
import { LOCALE_TAGS } from "@/i18n/languages";
import { usePokemonText } from "@/i18n/pokemonText";
import { foregroundOn } from "@/theme/contrast";
import { useMessageStyles } from "@/theme/messages";
import { createThemedStyles, useTheme } from "@/theme/ThemeProvider";
import {
  BRAND,
  OPACITY,
  RADIUS,
  SCRIM,
  SHADOW,
  SHELL,
  SPACING,
} from "@/theme/tokens";
import { FONT_FAMILY, TYPO } from "@/theme/typography";
import type { PokemonSummary } from "@/types/pokemon";
import { choiceProps, DECORATIVE, SECTION_HEADING } from "@/utils/a11y";
import { GRID_GAP, gridTileWidth } from "@/utils/grid";
import {
  applyListOptions,
  DEFAULT_LIST_OPTIONS,
  mergeUnique,
  type ListOptions,
  type SortMode,
} from "@/utils/pokemonList";

type LoadStatus = "loading" | "loadingMore" | "idle" | "error";

const SORT_ICONS: Record<
  SortMode,
  "sort-numeric-variant" | "sort-alphabetical-variant"
> = {
  dex: "sort-numeric-variant",
  name: "sort-alphabetical-variant",
};
const SORT_MODES = Object.keys(SORT_ICONS) as SortMode[];

const COLUMNS = 3;

// hitSlop n'agit qu'en natif. Les boutons de tri sont espacés de 4px : leurs
// zones restent dans cet écart ; le reste atteint 44px de haut.
const SORT_HIT_SLOP = [
  { top: 6, bottom: 6, left: 6, right: 2 },
  { top: 6, bottom: 6, left: 2, right: 6 },
];
const FILTER_HIT_SLOP = { top: 6, bottom: 6 };
const OPTION_HIT_SLOP = 2;

// Le champ dessine son propre état focus. react-native-web accepte
// `outlineStyle: 'none'`, mais le type RN ne le liste pas, d'où le cast.
const WEB_FOCUS_RING_RESET: TextStyle =
  Platform.OS === "web"
    ? { outlineStyle: "none" as string as TextStyle["outlineStyle"] }
    : {};

function gridContentWidth(frameWidth: number): number {
  return frameWidth - 2 * SHELL.inset - 2 * SHELL.listPadding;
}

export default function PokedexListScreen() {
  const { t } = useTranslation();
  const { language, typeLabel } = usePokemonText();
  const width = useFrameWidth();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const message = useMessageStyles();
  const { palette } = useTheme();

  // Données canoniques, dans l'ordre de chargement : jamais triées ni filtrées sur place.
  const [items, setItems] = useState<PokemonSummary[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [options, setOptions] = useState<ListOptions>(DEFAULT_LIST_OPTIONS);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Une seule page en vol à la fois ; la chaîne d'hydratation en dépend.
  const inFlight = useRef(false);
  const mounted = useRef(true);

  // L'appelant pose le statut d'attente avant (l'état initial est déjà 'loading').
  const loadPage = useCallback((offset: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    fetchPokemonBatch({ offset, limit: DEFAULT_BATCH_SIZE })
      .then((batch) => {
        if (!mounted.current) return;
        setItems((current) => mergeUnique(current, batch.items));
        setNextOffset(offset + batch.items.length);
        setHasMore(batch.hasMore);
        setStatus("idle");
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        // Jamais null : la chaîne d'hydratation s'arrête sur une erreur non nulle.
        // Un message vide est traduit au rendu.
        setErrorMessage(error instanceof Error ? error.message : "");
        setStatus("error");
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadPage(0);
    return () => {
      mounted.current = false;
    };
  }, [loadPage]);

  const startLoad = useCallback(
    (offset: number) => {
      if (inFlight.current) return;
      setStatus(offset === 0 ? "loading" : "loadingMore");
      setErrorMessage(null);
      loadPage(offset);
    },
    [loadPage],
  );

  // Hydratation séquentielle : chaque page terminée lance la suivante. Arrêt à la
  // première erreur (le footer propose de réessayer) et au démontage.
  useEffect(() => {
    if (
      !mounted.current ||
      !hasMore ||
      status !== "idle" ||
      errorMessage !== null
    )
      return;
    startLoad(nextOffset);
  }, [errorMessage, hasMore, nextOffset, startLoad, status]);

  const retry = useCallback(
    () => startLoad(nextOffset),
    [startLoad, nextOffset],
  );

  const chooseType = (type: string | null) => {
    setOptions((o) => ({ ...o, type }));
    setFilterOpen(false);
  };

  const visible = useMemo(
    () => applyListOptions(items, options, language),
    [items, options, language],
  );
  const typeOptions = useMemo(() => {
    const collator = new Intl.Collator(LOCALE_TAGS[language]);
    return [...TYPE_NAMES].sort((a, b) =>
      collator.compare(typeLabel(a), typeLabel(b)),
    );
  }, [language, typeLabel]);
  const cardWidth = useMemo(
    () => gridTileWidth(gridContentWidth(width), COLUMNS),
    [width],
  );

  const isInitialLoading = status === "loading" && items.length === 0;
  const isInitialError = status === "error" && items.length === 0;
  const selectedType = options.type;

  return (
    <PokedexScreen>
      <PokedexHeader title={t("pokedex.title")} onBack={() => goBack("/")}>
        <View style={styles.controlsRow}>
          <View
            style={[
              styles.searchField,
              searchFocused && styles.searchFieldFocused,
            ]}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={palette.accent}
              {...DECORATIVE}
            />
            <TextInput
              value={options.query}
              onChangeText={(query) => setOptions((o) => ({ ...o, query }))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={t("pokedex.searchPlaceholder")}
              placeholderTextColor={palette.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              style={[styles.searchInput, WEB_FOCUS_RING_RESET]}
              accessibilityLabel={t("pokedex.searchLabel")}
              accessibilityHint={t("pokedex.searchHint")}
            />
          </View>
          <View
            style={styles.sortGroup}
            role="group"
            aria-label={t("pokedex.sort.label")}>
            {SORT_MODES.map((mode, index) => {
              const selected = options.sort === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setOptions((o) => ({ ...o, sort: mode }))}
                  hitSlop={SORT_HIT_SLOP[index]}
                  {...choiceProps(selected)}
                  accessibilityLabel={t(`pokedex.sort.${mode}`)}
                  style={({ pressed }) => [
                    styles.sortButton,
                    selected && styles.sortButtonSelected,
                    pressed && styles.pressed,
                  ]}>
                  <MaterialCommunityIcons
                    name={SORT_ICONS[mode]}
                    size={18}
                    color={selected ? BRAND.white : palette.accent}
                    {...DECORATIVE}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilterOpen(true)}
            hitSlop={FILTER_HIT_SLOP}
            role="button"
            aria-expanded={filterOpen}
            accessibilityLabel={
              selectedType === null
                ? t("pokedex.filter.buttonAll")
                : t("pokedex.filter.buttonType", {
                    type: typeLabel(selectedType),
                  })
            }
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              name="filter-variant"
              size={16}
              color={palette.accent}
              {...DECORATIVE}
            />
            {selectedType !== null && (
              <View
                style={[
                  styles.filterDot,
                  { backgroundColor: getTypeColor(selectedType) },
                ]}
                {...DECORATIVE}
              />
            )}
            <Text style={styles.filterLabel} numberOfLines={1}>
              {selectedType === null
                ? t("pokedex.filter.all")
                : typeLabel(selectedType)}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color={palette.accent}
              {...DECORATIVE}
            />
          </Pressable>
        </View>
      </PokedexHeader>

      <PokedexSurface>
        {isInitialLoading ? (
          <StateView>
            <ActivityIndicator color={palette.accent} />
            <Text style={message.muted}>{t("pokedex.loading")}</Text>
          </StateView>
        ) : isInitialError ? (
          <StateView announce="alert">
            <Text style={message.error}>{t("pokedex.loadError")}</Text>
            <Text style={message.muted}>
              {errorMessage || t("common.unknownError")}
            </Text>
            <PrimaryButton label={t("common.retry")} onPress={retry} />
          </StateView>
        ) : (
          <FlatList
            data={visible}
            key={`grid-${COLUMNS}`}
            numColumns={COLUMNS}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <PokemonCard pokemon={item} width={cardWidth} />
            )}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.column}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <StateView announce="status">
                <Text style={message.muted}>{t("pokedex.empty")}</Text>
              </StateView>
            }
            ListFooterComponent={
              <ListFooter
                status={status}
                hasMore={hasMore}
                loadedCount={items.length}
                errorMessage={errorMessage}
                onRetry={retry}
              />
            }
          />
        )}
      </PokedexSurface>

      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
        // react-native-web reporte cette prop sur son élément role="dialog".
        aria-label={t("pokedex.filter.dialogLabel")}>
        <View style={styles.filterBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFilterOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("pokedex.filter.close")}
          />

          <View
            style={[
              styles.filterPanel,
              { paddingBottom: insets.bottom + SPACING.lg },
            ]}
            accessibilityViewIsModal>
            <Text style={styles.filterPanelTitle} {...SECTION_HEADING}>
              {t("pokedex.filter.panelTitle")}
            </Text>

            <ScrollView
              contentContainerStyle={styles.filterOptions}
              showsVerticalScrollIndicator={false}>
              <FilterOption
                label={t("pokedex.filter.all")}
                accessibilityLabel={t("pokedex.filter.optionAll")}
                color={null}
                selected={selectedType === null}
                onPress={() => chooseType(null)}
              />

              {typeOptions.map((type) => (
                <FilterOption
                  key={type}
                  label={typeLabel(type)}
                  accessibilityLabel={t("pokedex.filter.optionType", {
                    type: typeLabel(type),
                  })}
                  color={getTypeColor(type)}
                  selected={selectedType === type}
                  onPress={() => chooseType(type)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PokedexScreen>
  );
}

// L'option choisie porte aussi une coche et un libellé en gras : le choix ne
// repose jamais sur la seule couleur.
function FilterOption({
  label,
  accessibilityLabel,
  color,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  color: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const fill = color ?? BRAND.red;
  const foreground = foregroundOn(fill);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={OPTION_HIT_SLOP}
      {...choiceProps(selected)}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.option,
        selected && { backgroundColor: fill },
        pressed && styles.pressed,
      ]}>
      {selected ? (
        <MaterialCommunityIcons
          name="check"
          size={14}
          color={foreground}
          {...DECORATIVE}
        />
      ) : (
        color !== null && (
          <View
            style={[styles.optionDot, { backgroundColor: color }]}
            {...DECORATIVE}
          />
        )
      )}
      <Text
        style={[
          styles.optionText,
          selected && styles.optionTextSelected,
          selected && { color: foreground },
        ]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ListFooter({
  status,
  hasMore,
  loadedCount,
  errorMessage,
  onRetry,
}: {
  status: LoadStatus;
  hasMore: boolean;
  loadedCount: number;
  errorMessage: string | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const message = useMessageStyles();
  const { palette } = useTheme();
  const progress = t("pokedex.progress", {
    loaded: loadedCount,
    total: NATIONAL_DEX_TOTAL,
  });
  if (status === "error") {
    return (
      <View style={styles.footer} role="alert">
        <Text style={message.error}>{t("pokedex.pageError")}</Text>
        <Text style={message.muted}>
          {errorMessage || t("common.unknownError")}
        </Text>
        <PrimaryButton label={t("common.retry")} onPress={onRetry} />
      </View>
    );
  }
  if (!hasMore) {
    return (
      <View style={styles.footer}>
        <Text style={message.muted}>
          {t("pokedex.end", { count: loadedCount })}
        </Text>
      </View>
    );
  }
  // Volontairement pas une live region : les 9 pages ne sont pas annoncées une à
  // une, le lecteur d'écran lit la barre à la demande.
  return (
    <View
      style={styles.footer}
      role="progressbar"
      aria-label={t("pokedex.progressLabel")}
      aria-valuemin={0}
      aria-valuemax={NATIONAL_DEX_TOTAL}
      aria-valuenow={loadedCount}
      aria-valuetext={progress}>
      {status === "loadingMore" && (
        <ActivityIndicator color={palette.accent} {...DECORATIVE} />
      )}
      <Text style={message.muted}>{progress}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((c) => ({
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SHELL.headerPadding,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    height: 40,
    borderRadius: RADIUS.field,
    // Bordure réservée (transparente) : rien ne bouge à la prise de focus.
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: SPACING.md - 2,
    backgroundColor: c.card,
    ...SHADOW.float,
  },
  searchFieldFocused: {
    borderColor: c.text,
  },
  searchInput: {
    flex: 1,
    // Sans le lineHeight de Body1, qui rognerait les jambages dans un input natif.
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: c.text,
  },
  sortGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    height: 40,
    borderRadius: RADIUS.field,
    padding: SPACING.xs,
    backgroundColor: c.card,
    ...SHADOW.float,
  },
  sortButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  sortButtonSelected: {
    backgroundColor: c.chrome,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SHELL.headerPadding,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // minHeight : grandit avec la taille de texte au lieu de rogner le libellé.
    minHeight: 32,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: c.card,
    ...SHADOW.float,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
  },
  filterLabel: {
    ...TYPO.subtitle3,
    color: c.text,
  },
  filterBackdrop: {
    flex: 1,
    backgroundColor: SCRIM,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  filterPanel: {
    width: "100%",
    maxWidth: APP_FRAME_MAX_WIDTH,
    maxHeight: "75%",
    paddingTop: SPACING.lg,
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
    backgroundColor: c.card,
  },
  filterPanelTitle: {
    ...TYPO.subtitle1,
    color: c.text,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  option: {
    flexGrow: 1,
    flexBasis: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: c.surfaceMuted,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
  },
  optionText: {
    ...TYPO.body2,
    color: c.text,
  },
  optionTextSelected: {
    ...TYPO.subtitle2,
  },
  list: {
    paddingHorizontal: SHELL.listPadding,
    paddingBottom: SPACING.lg,
    gap: GRID_GAP,
    flexGrow: 1,
  },
  column: {
    gap: GRID_GAP,
  },
  footer: {
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
}));
