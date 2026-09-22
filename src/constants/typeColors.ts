/** Accent color per standard Pokémon type (Figma Pokédex palette). */
export const TYPE_COLORS: Record<string, string> = {
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
};

/** Neutral palette from the same Figma file. */
export const PALETTE = {
  white: '#FFFFFF',
  background: '#EFEFEF',
  light: '#E0E0E0',
  medium: '#666666',
  dark: '#212121',
} as const;

export function getTypeColor(type: string | undefined): string {
  return (type && TYPE_COLORS[type]) ?? TYPE_COLORS.normal;
}

/** `#RRGGBB` → `rgba(r, g, b, alpha)` for tinted backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
