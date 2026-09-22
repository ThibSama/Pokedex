import type { PokemonSummary } from '@/types/pokemon';

export type SortMode = 'dex' | 'name';

export interface ListOptions {
  /** Free-text search; matches FR/EN names, apiName and Dex number. */
  query: string;
  sort: SortMode;
  /** Type name to keep, or null for all. */
  type: string | null;
}

export const DEFAULT_LIST_OPTIONS: ListOptions = { query: '', sort: 'dex', type: null };

export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

/** `inner-focus` → `Inner Focus`, so API slugs never reach the UI verbatim. */
export function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Lowercase and strip diacritics so "evoli" matches "Évoli". */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesQuery(pokemon: PokemonSummary, query: string): boolean {
  const q = normalizeText(query);
  if (q === '') return true;

  const numeric = q.replace(/^#/, '');
  if (/^\d+$/.test(numeric)) {
    return String(pokemon.id).startsWith(numeric) || String(pokemon.id).padStart(3, '0').startsWith(numeric);
  }

  return [pokemon.names.fr, pokemon.names.en, pokemon.apiName].some((name) =>
    normalizeText(name).includes(q),
  );
}

/** Returns a new sorted array; never mutates `items`. */
export function sortPokemon(items: readonly PokemonSummary[], mode: SortMode): PokemonSummary[] {
  const copy = [...items];
  if (mode === 'name') {
    return copy.sort((a, b) => a.names.fr.localeCompare(b.names.fr, 'fr'));
  }
  return copy.sort((a, b) => a.id - b.id);
}

/** Filter (query + type) then sort. Pure: input array is untouched. */
export function applyListOptions(
  items: readonly PokemonSummary[],
  { query, sort, type }: ListOptions,
): PokemonSummary[] {
  const filtered = items.filter(
    (pokemon) => (type === null || pokemon.types.includes(type)) && matchesQuery(pokemon, query),
  );
  return sortPokemon(filtered, sort);
}

/** Distinct type names present in `items`, alphabetically. */
export function collectTypes(items: readonly PokemonSummary[]): string[] {
  return [...new Set(items.flatMap((pokemon) => pokemon.types))].sort();
}

/** Append `incoming` to `existing`, skipping IDs already present. */
export function mergeUnique(
  existing: readonly PokemonSummary[],
  incoming: readonly PokemonSummary[],
): PokemonSummary[] {
  const seen = new Set(existing.map((pokemon) => pokemon.id));
  return [...existing, ...incoming.filter((pokemon) => !seen.has(pokemon.id))];
}
