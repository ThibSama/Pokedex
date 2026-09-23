/** National Pokédex number (1–251 in the supported scope). */
export type NationalDexId = number;

/** Normalized, UI-facing Pokémon summary. Independent of raw PokéAPI shapes. */
export interface PokemonSummary {
  /** National Dex number, e.g. 197. */
  id: NationalDexId;
  /** Canonical PokéAPI resource name, e.g. "umbreon". */
  apiName: string;
  /** Localized display names from PokéAPI species data; the UI shows the active language's. */
  names: PokemonNames;
  sprites: PokemonSprites;
  /** Type names ordered by PokéAPI slot (primary first), e.g. ["grass", "poison"]. */
  types: string[];
}

/** Supported application / content languages. */
export type LanguageCode = 'fr' | 'en';

/** One display string per supported language, always present (fallbacks resolved at normalization). */
export type LocalizedNames = Record<LanguageCode, string>;

export type PokemonNames = LocalizedNames;

export interface PokemonSprites {
  /** Normal artwork URL, or null when PokéAPI has none. */
  normal: string | null;
  /** Shiny artwork URL, or null when PokéAPI has none. */
  shiny: string | null;
}

/** Which artwork of a Pokémon a surface should show. */
export type SpriteVariant = 'normal' | 'shiny';

/**
 * A favorited Pokémon. Membership is the National Dex id; the variant records
 * which artwork the user had selected when they added it, so Collection and
 * Home can show the Pokémon as the user chose it.
 */
export interface FavoritePokemon {
  id: NationalDexId;
  variant: SpriteVariant;
}

/** One page of summaries in National Dex order. */
export interface PokemonBatch {
  items: PokemonSummary[];
  offset: number;
  limit: number;
  /** Total number of Pokémon in the supported scope. */
  total: number;
  hasMore: boolean;
}

/** Six base stats, keyed explicitly (never by PokéAPI array position). */
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonAbility {
  /** Canonical PokéAPI ability name, e.g. "inner-focus". Never shown verbatim. */
  apiName: string;
  /** Localized names from `/ability/{name}`, with fallbacks already applied. */
  names: LocalizedNames;
  isHidden: boolean;
}

/** Full, normalized detail model for the detail screen. */
export interface PokemonDetails extends PokemonSummary {
  /** Height in metres (PokéAPI decimetres / 10). */
  heightM: number;
  /** Weight in kilograms (PokéAPI hectograms / 10). */
  weightKg: number;
  /** Abilities ordered by PokéAPI slot. */
  abilities: PokemonAbility[];
  stats: PokemonStats;
  /**
   * Latest species flavor text per language, whitespace normalized, or null when
   * PokéAPI has none in that language. Both are loaded up front so switching
   * language never refetches.
   */
  descriptions: Record<LanguageCode, string | null>;
}
