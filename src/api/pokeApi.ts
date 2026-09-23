import type {
  LanguageCode,
  LocalizedNames,
  NationalDexId,
  PokemonAbility,
  PokemonBatch,
  PokemonDetails,
  PokemonSprites,
  PokemonStats,
  PokemonSummary,
  SpriteVariant,
} from '@/types/pokemon';
import { humanizeSlug } from '@/utils/pokemonList';

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
  /** Decimetres. */
  height: number;
  /** Hectograms. */
  weight: number;
  abilities: { slot: number; is_hidden: boolean; ability: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
}

type RawLocalizedName = { name: string; language: { name: string } };

/** Subset of the PokéAPI v2 `/pokemon-species/{id}` response that we actually read. */
interface RawSpecies {
  names: RawLocalizedName[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
}

/** Subset of the PokéAPI v2 `/ability/{name}` response that we actually read. */
interface RawAbility {
  names: RawLocalizedName[];
}

/** Explicit PokéAPI stat name → domain key mapping. */
const STAT_KEYS: Record<string, keyof PokemonStats> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

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

/**
 * The artwork a surface should render for `variant`. PokéAPI has no shiny
 * artwork for a handful of entries, and a stored shiny favorite must still show
 * its Pokémon then — as the normal artwork, never as nothing.
 */
export function resolveSprite(sprites: PokemonSprites, variant: SpriteVariant): string | null {
  return variant === 'shiny' ? (sprites.shiny ?? sprites.normal) : sprites.normal;
}

function pickLocalizedName(names: readonly RawLocalizedName[], language: LanguageCode): string | undefined {
  return names.find((entry) => entry.language.name === language)?.name;
}

function normalizePokemon(raw: RawPokemon, species: RawSpecies): PokemonSummary {
  const artwork = raw.sprites.other?.['official-artwork'];
  // Fall back en → apiName so a missing translation never breaks the UI.
  const en = pickLocalizedName(species.names, 'en') ?? raw.name;
  const fr = pickLocalizedName(species.names, 'fr') ?? en;
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

function normalizeStats(raw: RawPokemon['stats']): PokemonStats {
  const stats: PokemonStats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
  for (const entry of raw) {
    const key = STAT_KEYS[entry.stat.name];
    if (key) stats[key] = entry.base_stat;
  }
  return stats;
}

/** Collapse PokéAPI line breaks / form feeds / soft hyphens into single spaces. */
function normalizeFlavorText(text: string): string {
  return text
    .replace(/\u00ad/g, '')
    .replace(/[\n\f\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The latest usable flavor text in each language, picked independently: an
 * entry that normalizes to nothing is skipped rather than shown blank.
 */
function pickDescriptions(species: RawSpecies): PokemonDetails['descriptions'] {
  const pick = (language: LanguageCode): string | null => {
    // Entries are ordered by game version; the last one is the most recent wording.
    const texts = species.flavor_text_entries
      .filter((entry) => entry.language.name === language)
      .map((entry) => normalizeFlavorText(entry.flavor_text))
      .filter((text) => text.length > 0);
    return texts.at(-1) ?? null;
  };
  return { fr: pick('fr'), en: pick('en') };
}

/**
 * Localized ability names, each falling back to the other language and then to
 * the humanized slug, so a gap in PokéAPI never shows a raw `inner-focus`.
 */
function normalizeAbilityNames(apiName: string, raw: RawAbility | null): LocalizedNames {
  const fr = raw === null ? undefined : pickLocalizedName(raw.names, 'fr');
  const en = raw === null ? undefined : pickLocalizedName(raw.names, 'en');
  const fallback = humanizeSlug(apiName);
  return { fr: fr ?? en ?? fallback, en: en ?? fr ?? fallback };
}

function normalizeDetails(
  raw: RawPokemon,
  species: RawSpecies,
  abilityNames: ReadonlyMap<string, LocalizedNames>,
): PokemonDetails {
  return {
    ...normalizePokemon(raw, species),
    heightM: raw.height / 10,
    weightKg: raw.weight / 10,
    abilities: sortedAbilities(raw).map(
      (entry): PokemonAbility => ({
        apiName: entry.ability.name,
        names: abilityNames.get(entry.ability.name) ?? normalizeAbilityNames(entry.ability.name, null),
        isHidden: entry.is_hidden,
      }),
    ),
    stats: normalizeStats(raw.stats),
    descriptions: pickDescriptions(species),
  };
}

function sortedAbilities(raw: RawPokemon): RawPokemon['abilities'] {
  return [...raw.abilities].sort((a, b) => a.slot - b.slot);
}

async function getJson<T>(path: string, id: number | string): Promise<T> {
  const response = await fetch(`${POKEAPI_BASE_URL}/${path}/${id}`);
  if (!response.ok) {
    throw new PokeApiError(`PokéAPI request ${path}/${id} failed (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

function assertSupportedDexId(id: number): asserts id is NationalDexId {
  if (!isSupportedDexId(id)) {
    throw new RangeError(
      `Pokémon #${id} is outside the supported National Dex range ${NATIONAL_DEX_MIN}–${NATIONAL_DEX_MAX}.`,
    );
  }
}

/** One combined load of `/pokemon/{id}` + `/pokemon-species/{id}` (same id for #001–#251). */
async function fetchRawPair(id: NationalDexId): Promise<[RawPokemon, RawSpecies]> {
  return Promise.all([getJson<RawPokemon>('pokemon', id), getJson<RawSpecies>('pokemon-species', id)]);
}

/**
 * Fetch and normalize one Pokémon summary (detail + species for localized names).
 * Rejects IDs outside 1–251 without a network call.
 */
export async function fetchPokemonById(id: number): Promise<PokemonSummary> {
  assertSupportedDexId(id);
  const [raw, species] = await fetchRawPair(id);
  return normalizePokemon(raw, species);
}

/**
 * Per-session cache of localized ability names, keyed by canonical ability name.
 * Many Pokémon share an ability (Chlorophyll, Intimidate…), so visiting the
 * next one does not request `/ability/chlorophyll` again. The promise itself is
 * cached, which also folds concurrent requests for the same ability into one.
 * A failed request is evicted so a later visit can retry it. Memory only:
 * nothing from PokéAPI is persisted.
 */
const abilityNamesCache = new Map<string, Promise<LocalizedNames>>();

function fetchAbilityNames(apiName: string): Promise<LocalizedNames> {
  const cached = abilityNamesCache.get(apiName);
  if (cached !== undefined) return cached;
  const request = getJson<RawAbility>('ability', encodeURIComponent(apiName)).then(
    (raw) => normalizeAbilityNames(apiName, raw),
    (error: unknown) => {
      abilityNamesCache.delete(apiName);
      throw error;
    },
  );
  abilityNamesCache.set(apiName, request);
  return request;
}

/**
 * Localized names for every ability of `raw`. An ability whose resource cannot
 * be loaded degrades to its humanized slug rather than failing the whole detail
 * screen — the name is secondary information.
 */
async function loadAbilityNames(raw: RawPokemon): Promise<Map<string, LocalizedNames>> {
  const names = sortedAbilities(raw).map((entry) => entry.ability.name);
  const resolved = await Promise.all(
    names.map((apiName) =>
      fetchAbilityNames(apiName).catch(() => normalizeAbilityNames(apiName, null)),
    ),
  );
  return new Map(names.map((apiName, index) => [apiName, resolved[index]]));
}

/**
 * Fetch the full detail model (summary + height/weight/abilities/stats and both
 * localized descriptions). Ability names in both languages are loaded here, up
 * front, so switching language afterwards needs no request at all. The ability
 * requests start as soon as `/pokemon/{id}` answers, alongside the species one.
 * Rejects IDs outside 1–251 without a network call.
 */
export async function fetchPokemonDetails(id: number): Promise<PokemonDetails> {
  assertSupportedDexId(id);
  const rawRequest = getJson<RawPokemon>('pokemon', id);
  const [raw, species, abilityNames] = await Promise.all([
    rawRequest,
    getJson<RawSpecies>('pokemon-species', id),
    rawRequest.then(loadAbilityNames),
  ]);
  return normalizeDetails(raw, species, abilityNames);
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
