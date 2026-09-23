import type { LanguageCode, PokemonSummary } from '@/types/pokemon';

export type SortMode = 'dex' | 'name';

export interface ListOptions {
  /** Free-text search; matches FR/EN names, apiName and Dex number. */
  query: string;
  sort: SortMode;
  /** Canonical type slug to keep (e.g. `dark`), or null for all. Never a translated label. */
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

/**
 * Matches both the French and the English name whatever the UI language, so
 * "Noctali" still finds Umbreon in English. Purely local: nothing is fetched.
 */
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

/** Collation locale per display language, for name sorting. */
const COLLATION_LOCALES: Record<LanguageCode, string> = { fr: 'fr', en: 'en' };

/**
 * Returns a new sorted array; never mutates `items`. Name order follows the
 * displayed name: `names.fr` with French collation, or `names.en` with English.
 */
export function sortPokemon(
  items: readonly PokemonSummary[],
  mode: SortMode,
  language: LanguageCode,
): PokemonSummary[] {
  const copy = [...items];
  if (mode === 'name') {
    const collator = new Intl.Collator(COLLATION_LOCALES[language]);
    return copy.sort((a, b) => collator.compare(a.names[language], b.names[language]) || a.id - b.id);
  }
  return copy.sort((a, b) => a.id - b.id);
}

/** Filter (query + type) then sort. Pure: input array is untouched. */
export function applyListOptions(
  items: readonly PokemonSummary[],
  { query, sort, type }: ListOptions,
  language: LanguageCode,
): PokemonSummary[] {
  const filtered = items.filter(
    (pokemon) => (type === null || pokemon.types.includes(type)) && matchesQuery(pokemon, query),
  );
  return sortPokemon(filtered, sort, language);
}

/** Append `incoming` to `existing`, skipping IDs already present. */
export function mergeUnique(
  existing: readonly PokemonSummary[],
  incoming: readonly PokemonSummary[],
): PokemonSummary[] {
  const seen = new Set(existing.map((pokemon) => pokemon.id));
  return [...existing, ...incoming.filter((pokemon) => !seen.has(pokemon.id))];
}
