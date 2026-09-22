/**
 * Pokémon cry audio sourced from Pokémon Showdown's MP3 assets.
 *
 * PokéAPI's own `cries.latest` / `cries.legacy` are OGG, which iOS does not
 * decode, so Showdown's MP3s are used instead for cross-platform playback.
 */

/** Base URL of the Showdown cry assets. */
export const SHOWDOWN_CRY_BASE_URL = 'https://play.pokemonshowdown.com/audio/cries';

/**
 * Escape hatch for names whose Showdown id is not just the normalized
 * PokéAPI name. Empty for the Gen I–II scope, where the default rule holds
 * (`mr-mime` → `mrmime`, `nidoran-f` → `nidoranf`, `ho-oh` → `hooh`, …);
 * later generations add forms that need explicit entries.
 */
const SHOWDOWN_ID_OVERRIDES: Record<string, string> = {};

/**
 * Convert a canonical PokéAPI name into a Showdown cry id: lowercase, with
 * every non-alphanumeric character removed.
 */
export function toShowdownCryId(apiName: string): string {
  const normalized = apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SHOWDOWN_ID_OVERRIDES[normalized] ?? normalized;
}

/** Remote MP3 URL for a Pokémon's cry, or null when the name is unusable. */
export function getPokemonCryUrl(apiName: string): string | null {
  const showdownId = toShowdownCryId(apiName);
  if (showdownId.length === 0) return null;
  return `${SHOWDOWN_CRY_BASE_URL}/${showdownId}.mp3`;
}
