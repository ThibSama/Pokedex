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
  /** Décimètres. */
  height: number;
  /** Hectogrammes. */
  weight: number;
  abilities: { slot: number; is_hidden: boolean; ability: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
}

type RawLocalizedName = { name: string; language: { name: string } };

interface RawSpecies {
  names: RawLocalizedName[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
}

interface RawAbility {
  names: RawLocalizedName[];
}

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

/** PokéAPI n'a pas d'artwork shiny pour quelques entrées : on affiche alors l'artwork normal plutôt que rien. */
export function resolveSprite(sprites: PokemonSprites, variant: SpriteVariant): string | null {
  return variant === 'shiny' ? (sprites.shiny ?? sprites.normal) : sprites.normal;
}

function pickLocalizedName(names: readonly RawLocalizedName[], language: LanguageCode): string | undefined {
  return names.find((entry) => entry.language.name === language)?.name;
}

function normalizePokemon(raw: RawPokemon, species: RawSpecies): PokemonSummary {
  const artwork = raw.sprites.other?.['official-artwork'];
  // Repli en → apiName : une traduction manquante ne doit jamais casser l'UI.
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

// PokéAPI truffe ses textes de retours à la ligne, sauts de page et traits d'union conditionnels (\u00ad).
function normalizeFlavorText(text: string): string {
  return text
    .replace(/\u00ad/g, '')
    .replace(/[\n\f\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickDescriptions(species: RawSpecies): PokemonDetails['descriptions'] {
  const pick = (language: LanguageCode): string | null => {
    // Entrées triées par version de jeu : la dernière est la formulation la plus récente.
    const texts = species.flavor_text_entries
      .filter((entry) => entry.language.name === language)
      .map((entry) => normalizeFlavorText(entry.flavor_text))
      .filter((text) => text.length > 0);
    return texts.at(-1) ?? null;
  };
  return { fr: pick('fr'), en: pick('en') };
}

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

// Pour #001–#251, l'id d'espèce est identique à l'id du Pokémon.
async function fetchRawPair(id: NationalDexId): Promise<[RawPokemon, RawSpecies]> {
  return Promise.all([getJson<RawPokemon>('pokemon', id), getJson<RawSpecies>('pokemon-species', id)]);
}

export async function fetchPokemonById(id: number): Promise<PokemonSummary> {
  assertSupportedDexId(id);
  const [raw, species] = await fetchRawPair(id);
  return normalizePokemon(raw, species);
}

// Cache mémoire de session. On garde la promesse pour fusionner les requêtes
// concurrentes ; un échec est retiré pour qu'une visite suivante réessaie.
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

// Un talent introuvable retombe sur son slug plutôt que de faire échouer tout l'écran.
async function loadAbilityNames(raw: RawPokemon): Promise<Map<string, LocalizedNames>> {
  const names = sortedAbilities(raw).map((entry) => entry.ability.name);
  const resolved = await Promise.all(
    names.map((apiName) =>
      fetchAbilityNames(apiName).catch(() => normalizeAbilityNames(apiName, null)),
    ),
  );
  return new Map(names.map((apiName, index) => [apiName, resolved[index]]));
}

// Noms de talents chargés d'emblée dans les deux langues : changer de langue
// ensuite ne relance aucune requête.
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
  /** Décalage à partir de 0 dans la plage du Dex (0 → #001). */
  offset?: number;
  limit?: number;
}

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
