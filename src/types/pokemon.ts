/** Numéro du Pokédex national (1–251 dans le périmètre de l'app). */
export type NationalDexId = number;

export interface PokemonSummary {
  id: NationalDexId;
  apiName: string;
  names: PokemonNames;
  sprites: PokemonSprites;
  /** Triés par slot PokéAPI (type principal en premier). */
  types: string[];
}

export type LanguageCode = 'fr' | 'en';

/** Toujours renseigné : les replis sont résolus à la normalisation. */
export type LocalizedNames = Record<LanguageCode, string>;

export type PokemonNames = LocalizedNames;

export interface PokemonSprites {
  normal: string | null;
  shiny: string | null;
}

export type SpriteVariant = 'normal' | 'shiny';

/** `variant` : l'artwork choisi au moment de l'ajout. */
export interface FavoritePokemon {
  id: NationalDexId;
  variant: SpriteVariant;
}

export interface PokemonBatch {
  items: PokemonSummary[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonAbility {
  apiName: string;
  names: LocalizedNames;
  isHidden: boolean;
}

export interface PokemonDetails extends PokemonSummary {
  heightM: number;
  weightKg: number;
  abilities: PokemonAbility[];
  stats: PokemonStats;
  descriptions: Record<LanguageCode, string | null>;
}
