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
import {
  COLORS,
  MESSAGE,
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

/** Icon-only sort control: the glyph itself says which order is active. */
const SORT_ICONS: Record<
  SortMode,
  "sort-numeric-variant" | "sort-alphabetical-variant"
> = {
  dex: "sort-numeric-variant",
  name: "sort-alphabetical-variant",
};
const SORT_MODES = Object.keys(SORT_ICONS) as SortMode[];

/** Figma list frame 1017:431. */
const COLUMNS = 3;

/**
 * Native touch targets (react-native-web ignores `hitSlop`). The 32px sort
 * buttons sit 4px apart inside their group, so their slops stay inside those
 * 4px; the 32px Filter pill and the 40px type options reach 44 tall.
 */
const SORT_HIT_SLOP = [
  { top: 6, bottom: 6, left: 6, right: 2 },
  { top: 6, bottom: 6, left: 2, right: 6 },
];
const FILTER_HIT_SLOP = { top: 6, bottom: 6 };
const OPTION_HIT_SLOP = 2;

/**
 * The browser paints its own focus ring on a text input; the field draws an
 * app-owned focused state instead. `outlineStyle: 'none'` is valid here and
 * react-native-web passes it through (its own modal focus trap does the same),
 * but the React Native style type only lists the dotted/dashed/solid values, so
 * the value is widened. Web only, so native never sees it.
 */
const WEB_FOCUS_RING_RESET: TextStyle =
  Platform.OS === "web"
    ? { outlineStyle: "none" as string as TextStyle["outlineStyle"] }
    : {};

/** Content box the grid lays out in, inside the red shell and the white sheet. */
function gridContentWidth(frameWidth: number): number {
  return frameWidth - 2 * SHELL.inset - 2 * SHELL.listPadding;
}

export default function PokedexListScreen() {
  const { t } = useTranslation();
  const { language, typeLabel } = usePokemonText();
  const width = useFrameWidth();
  const insets = useSafeAreaInsets();

  // Canonical loaded data, in fetch order. Never sorted/filtered in place.
  const [items, setItems] = useState<PokemonSummary[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [options, setOptions] = useState<ListOptions>(DEFAULT_LIST_OPTIONS);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Guards against concurrent page requests; the hydration chain below relies
  // on it to keep exactly one page in flight.
  const inFlight = useRef(false);
  const mounted = useRef(true);

  // Performs the request. Callers set the pending status first (initial state is already 'loading').
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
        // Never null on failure: the hydration chain stops on a non-null
        // error. An empty message is translated at render time instead, so
        // this callback stays independent of the language.
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

  /**
   * Sequential background hydration: as soon as one page has settled the next
   * one starts on its own, so the whole Dex fills in without the user pressing
   * anything and searching for a late entry eventually finds it.
   *
   * One page is ever in flight (`inFlight` plus this status gate), the chain
   * stops on the first error — the footer then offers the retry — and it stops
   * for good once the component unmounts.
   */
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

  // Search/sort/filter are derived purely from client state — no network
  // involved, including when the language changes the name sort.
  const visible = useMemo(
    () => applyListOptions(items, options, language),
    [items, options, language],
  );
  // The same 18 canonical slugs, ordered by the label the user actually reads.
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
      {/* One coherent red header area: back, title, search, sort and the type filter. */}
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
              color={COLORS.red}
              {...DECORATIVE}
            />
            <TextInput
              value={options.query}
              onChangeText={(query) => setOptions((o) => ({ ...o, query }))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={t("pokedex.searchPlaceholder")}
              placeholderTextColor={COLORS.medium}
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
                    color={selected ? COLORS.white : COLORS.red}
                    {...DECORATIVE}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* One compact Filter control on the header, so the type list never
            squeezes the grid and the current filter stays readable. */}
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
              color={COLORS.red}
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
              color={COLORS.red}
              {...DECORATIVE}
            />
          </Pressable>
        </View>
      </PokedexHeader>

      <PokedexSurface>
        {isInitialLoading ? (
          <StateView>
            <ActivityIndicator color={COLORS.red} />
            <Text style={MESSAGE.muted}>{t("pokedex.loading")}</Text>
          </StateView>
        ) : isInitialError ? (
          <StateView announce="alert">
            <Text style={MESSAGE.error}>{t("pokedex.loadError")}</Text>
            <Text style={MESSAGE.muted}>
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
                <Text style={MESSAGE.muted}>{t("pokedex.empty")}</Text>
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

      {/* The selector rides above the screen, so the header keeps one control. */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
        // react-native-web spreads this onto its role="dialog" element.
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

/**
 * One selectable type in the filter panel: color indicator plus label. The
 * selected option is filled with its type color — its text white or dark,
 * whichever reads — and also marked by a check and a bolder label, so the
 * choice never rests on color alone.
 */
function FilterOption({
  label,
  accessibilityLabel,
  color,
  selected,
  onPress,
}: {
  /** Localized label; the option's value stays the canonical slug in the caller. */
  label: string;
  accessibilityLabel: string;
  /** Type accent, or null for the catch-all option, which shows no dot. */
  color: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const fill = color ?? COLORS.red;
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
  const progress = t("pokedex.progress", {
    loaded: loadedCount,
    total: NATIONAL_DEX_TOTAL,
  });
  if (status === "error") {
    return (
      <View style={styles.footer} role="alert">
        <Text style={MESSAGE.error}>{t("pokedex.pageError")}</Text>
        <Text style={MESSAGE.muted}>
          {errorMessage || t("common.unknownError")}
        </Text>
        <PrimaryButton label={t("common.retry")} onPress={onRetry} />
      </View>
    );
  }
  if (!hasMore) {
    return (
      <View style={styles.footer}>
        <Text style={MESSAGE.muted}>
          {t("pokedex.end", { count: loadedCount })}
        </Text>
      </View>
    );
  }
  // Background hydration: one progress bar a screen reader can read on demand.
  // Deliberately not a live region, so the 9 page arrivals are never
  // announced one by one. Between two pages the spinner is simply absent.
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
        <ActivityIndicator color={COLORS.red} {...DECORATIVE} />
      )}
      <Text style={MESSAGE.muted}>{progress}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    // The focused state is this border; it is reserved (transparent) so nothing
    // moves when the field takes focus.
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: SPACING.md - 2,
    backgroundColor: COLORS.white,
    ...SHADOW.float,
  },
  searchFieldFocused: {
    borderColor: COLORS.dark,
  },
  searchInput: {
    flex: 1,
    // Body1 without its 14px line-height, which would clip descenders in a native input.
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.dark,
  },
  sortGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    height: 40,
    borderRadius: RADIUS.field,
    padding: SPACING.xs,
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.red,
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
    // min-: grows with a larger text size instead of clipping the label.
    minHeight: 32,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
    ...SHADOW.float,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
  },
  filterLabel: {
    ...TYPO.subtitle3,
    color: COLORS.dark,
  },
  filterBackdrop: {
    flex: 1,
    backgroundColor: SCRIM,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  filterPanel: {
    width: "100%",
    // The web frame caps the app at a phone width; the panel follows it.
    maxWidth: APP_FRAME_MAX_WIDTH,
    maxHeight: "75%",
    paddingTop: SPACING.lg,
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
    backgroundColor: COLORS.white,
  },
  filterPanelTitle: {
    ...TYPO.subtitle1,
    color: COLORS.dark,
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
    backgroundColor: COLORS.background,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
  },
  optionText: {
    ...TYPO.body2,
    color: COLORS.dark,
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
});
