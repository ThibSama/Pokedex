/** Accent color per standard Pokémon type (Figma Pokédex palette). */
export const TYPE_COLORS = {
  bug: '#A7B723',
  dark: '#75574C',
  dragon: '#7037FF',
  electric: '#F9CF30',
  fairy: '#E69EAC',
  fighting: '#C12239',
  fire: '#F57D31',
  flying: '#A891EC',
  ghost: '#70559B',
  grass: '#74CB48',
  ground: '#DEC16B',
  ice: '#9AD6DF',
  normal: '#AAA67F',
  poison: '#A43E9E',
  psychic: '#FB5584',
  rock: '#B69E31',
  steel: '#B7B9D0',
  water: '#6493EB',
} as const satisfies Record<string, string>;

/** Canonical PokéAPI type slug, e.g. `dark`. Logic and filters use these; only labels are translated. */
export type PokemonType = keyof typeof TYPE_COLORS;

/** The 18 standard types by canonical slug — the filter's option list, before localized sorting. */
export const TYPE_NAMES = (Object.keys(TYPE_COLORS) as PokemonType[]).sort();

export function isPokemonType(type: string | undefined): type is PokemonType {
  return type !== undefined && Object.prototype.hasOwnProperty.call(TYPE_COLORS, type);
}

export function getTypeColor(type: string | undefined): string {
  return isPokemonType(type) ? TYPE_COLORS[type] : TYPE_COLORS.normal;
}

/** `#RRGGBB` → `rgba(r, g, b, alpha)` for tinted backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
