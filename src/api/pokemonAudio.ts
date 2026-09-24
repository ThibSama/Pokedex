// Les cris de PokéAPI sont en OGG, format qu'iOS ne décode pas : on passe
// par les MP3 de Pokémon Showdown.
export const SHOWDOWN_CRY_BASE_URL = 'https://play.pokemonshowdown.com/audio/cries';

// Vide en Gen I–II, où la normalisation suffit (`ho-oh` → `hooh`) ; les
// formes des générations suivantes auront besoin d'entrées explicites.
const SHOWDOWN_ID_OVERRIDES: Record<string, string> = {};

export function toShowdownCryId(apiName: string): string {
  const normalized = apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SHOWDOWN_ID_OVERRIDES[normalized] ?? normalized;
}

export function getPokemonCryUrl(apiName: string): string | null {
  const showdownId = toShowdownCryId(apiName);
  if (showdownId.length === 0) return null;
  return `${SHOWDOWN_CRY_BASE_URL}/${showdownId}.mp3`;
}
