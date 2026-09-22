/** National Pokédex number (1–251 in the supported scope). */
export type NationalDexId = number;

/** Normalized, UI-facing Pokémon summary. Independent of raw PokéAPI shapes. */
export interface PokemonSummary {
  /** National Dex number, e.g. 197. */
  id: NationalDexId;
  /** Canonical PokéAPI resource name, e.g. "umbreon". */
  apiName: string;
  /** Localized display names from PokéAPI species data. French is the default UI name. */
  names: PokemonNames;
  sprites: PokemonSprites;
  /** Type names ordered by PokéAPI slot (primary first), e.g. ["grass", "poison"]. */
  types: string[];
}

export interface PokemonNames {
  fr: string;
  en: string;
}

export interface PokemonSprites {
  /** Normal artwork URL, or null when PokéAPI has none. */
  normal: string | null;
  /** Shiny artwork URL, or null when PokéAPI has none. */
  shiny: string | null;
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
