import { INK, PALETTES } from '@/theme/tokens';

export const MIN_CONTRAST = {
  /** Texte courant (1.4.3). */
  text: 4.5,
  /** Grand texte : 24px normal, ou ~18,7px gras et plus (1.4.3). */
  largeText: 3,
  /** Icônes et indicateurs d'état (1.4.11). */
  graphic: 3,
} as const;

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Blanc s'il atteint 4,5:1, sinon le texte sombre ; chaque couleur de type passe avec l'un des deux.
export function foregroundOn(fill: string): string {
  if (contrastRatio(INK.light, fill) >= MIN_CONTRAST.text) return INK.light;
  return contrastRatio(INK.dark, fill) >= contrastRatio(INK.light, fill) ? INK.dark : INK.light;
}

const accentCache = new Map<string, string>();

/**
 * Même teinte, assombrie sur fond clair ou éclaircie sur fond sombre, juste assez
 * pour atteindre `minRatio`. Pour le texte et les icônes ; le décoratif garde l'accent.
 */
export function accentOn(
  accent: string,
  background: string = PALETTES.light.surface,
  minRatio: number = MIN_CONTRAST.text,
): string {
  const key = `${accent}|${background}|${minRatio}`;
  const cached = accentCache.get(key);
  if (cached !== undefined) return cached;

  const rgb = channels(accent);
  const target = contrastRatio(background, '#000000') >= contrastRatio(background, '#FFFFFF') ? 0 : 255;
  let result = accent;
  // Pas de 5 % : la teinte reste reconnaissable, et la boucle termine car la couleur
  // extrême passe tous les seuils sur les surfaces de l'app.
  for (let step = 0; step <= 20 && contrastRatio(result, background) < minRatio; step += 1) {
    result = toHex(rgb.map((c) => c + (target - c) * (step / 20)));
  }
  accentCache.set(key, result);
  return result;
}
