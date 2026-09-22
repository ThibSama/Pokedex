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

function normalizePokemon(raw: RawPokemon): PokemonSummary {
  const artwork = raw.sprites.other?.['official-artwork'];
  return {
    id: raw.id,
    apiName: raw.name,
    sprites: {
      normal: artwork?.front_default ?? raw.sprites.front_default,
      shiny: artwork?.front_shiny ?? raw.sprites.front_shiny,
    },
    types: [...raw.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
  };
}

/** Fetch and normalize one Pokémon. Rejects IDs outside 1–251 without a network call. */
export async function fetchPokemonById(id: number): Promise<PokemonSummary> {
  if (!isSupportedDexId(id)) {
    throw new RangeError(
      `Pokémon #${id} is outside the supported National Dex range ${NATIONAL_DEX_MIN}–${NATIONAL_DEX_MAX}.`,
    );
  }
  const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${id}`);
  if (!response.ok) {
    throw new PokeApiError(`PokéAPI request for #${id} failed (${response.status}).`, response.status);
  }
  const raw = (await response.json()) as RawPokemon;
  return normalizePokemon(raw);
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
