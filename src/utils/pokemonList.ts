import type { LanguageCode, PokemonSummary } from '@/types/pokemon';

export type SortMode = 'dex' | 'name';

export interface ListOptions {
  query: string;
  sort: SortMode;
  /** Slug canonique (`dark`), jamais un libellé traduit. */
  type: string | null;
}

export const DEFAULT_LIST_OPTIONS: ListOptions = { query: '', sort: 'dex', type: null };

export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

export function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Sans diacritiques : « evoli » trouve « Évoli ».
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Cherche dans les noms FR et EN quelle que soit la langue : « Noctali » trouve Umbreon.
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

const COLLATION_LOCALES: Record<LanguageCode, string> = { fr: 'fr', en: 'en' };

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

export function mergeUnique(
  existing: readonly PokemonSummary[],
  incoming: readonly PokemonSummary[],
): PokemonSummary[] {
  const seen = new Set(existing.map((pokemon) => pokemon.id));
  return [...existing, ...incoming.filter((pokemon) => !seen.has(pokemon.id))];
}
