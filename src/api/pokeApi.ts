import type { NationalDexId, PokemonBatch, PokemonSummary } from '@/types/pokemon';

export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
export const NATIONAL_DEX_MIN: NationalDexId = 1;
export const NATIONAL_DEX_MAX: NationalDexId = 251;
export const NATIONAL_DEX_TOTAL = NATIONAL_DEX_MAX - NATIONAL_DEX_MIN + 1;
export const DEFAULT_BATCH_SIZE = 30;

/** Subset of the PokéAPI v2 `/pokemon/{id}` response that we actually read. */
interface RawPokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other?: {
      'official-artwork'?: {
        front_default: string | null;
        front_shiny: string | null;
      };
    };
  };
  types: { slot: number; type: { name: string } }[];
}

/** Subset of the PokéAPI v2 `/pokemon-species/{id}` response that we actually read. */
interface RawSpecies {
  names: { name: string; language: { name: string } }[];
}

export class PokeApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PokeApiError';
  }
}

export function isSupportedDexId(id: number): id is NationalDexId {
  return Number.isInteger(id) && id >= NATIONAL_DEX_MIN && id <= NATIONAL_DEX_MAX;
}

function pickLocalizedName(species: RawSpecies, language: string): string | undefined {
  return species.names.find((entry) => entry.language.name === language)?.name;
}

function normalizePokemon(raw: RawPokemon, species: RawSpecies): PokemonSummary {
  const artwork = raw.sprites.other?.['official-artwork'];
  // Fall back en → apiName so a missing translation never breaks the UI.
  const en = pickLocalizedName(species, 'en') ?? raw.name;
  const fr = pickLocalizedName(species, 'fr') ?? en;
  return {
    id: raw.id,
    apiName: raw.name,
    names: { fr, en },
    sprites: {
      normal: artwork?.front_default ?? raw.sprites.front_default,
      shiny: artwork?.front_shiny ?? raw.sprites.front_shiny,
    },
    types: [...raw.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
  };
}

async function getJson<T>(path: string, id: number): Promise<T> {
  const response = await fetch(`${POKEAPI_BASE_URL}/${path}/${id}`);
  if (!response.ok) {
    throw new PokeApiError(`PokéAPI request ${path}/${id} failed (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

/**
 * Fetch and normalize one Pokémon (detail + species for localized names).
 * Rejects IDs outside 1–251 without a network call.
 */
export async function fetchPokemonById(id: number): Promise<PokemonSummary> {
  if (!isSupportedDexId(id)) {
    throw new RangeError(
      `Pokémon #${id} is outside the supported National Dex range ${NATIONAL_DEX_MIN}–${NATIONAL_DEX_MAX}.`,
    );
  }
  // For #001–#251, pokemon and pokemon-species share the same id.
  const [raw, species] = await Promise.all([
    getJson<RawPokemon>('pokemon', id),
    getJson<RawSpecies>('pokemon-species', id),
  ]);
  return normalizePokemon(raw, species);
}

export interface FetchPokemonBatchOptions {
  /** Zero-based offset into the supported Dex range (0 → #001). */
  offset?: number;
  /** Batch size; defaults to 30. */
  limit?: number;
}

/**
 * Load one batch of Pokémon in National Dex order. IDs are derived from
 * `offset`/`limit` and clamped to the supported range, so only the requested
 * page is fetched — never the full list.
 */
export async function fetchPokemonBatch({
  offset = 0,
  limit = DEFAULT_BATCH_SIZE,
}: FetchPokemonBatchOptions = {}): Promise<PokemonBatch> {
  if (!Number.isInteger(offset) || offset < 0 || offset >= NATIONAL_DEX_TOTAL) {
    throw new RangeError(`offset must be an integer in [0, ${NATIONAL_DEX_TOTAL - 1}], got ${offset}.`);
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}.`);
  }

  const firstId = NATIONAL_DEX_MIN + offset;
  const lastId = Math.min(firstId + limit - 1, NATIONAL_DEX_MAX);
  const ids = Array.from({ length: lastId - firstId + 1 }, (_, i) => firstId + i);

  const items = await Promise.all(ids.map(fetchPokemonById));

  return {
    items,
    offset,
    limit,
    total: NATIONAL_DEX_TOTAL,
    hasMore: lastId < NATIONAL_DEX_MAX,
  };
}
