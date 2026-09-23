import { COLORS } from '@/theme/tokens';

/**
 * WCAG 2.x contrast math, so readable text and meaningful icons are derived
 * from the canonical colors instead of hand-picked per screen. The 18 type
 * colors stay the Figma palette: only the foreground painted on them — or, for
 * type-colored text, a darker shade of the same hue — is computed here.
 */

/** WCAG AA minimum contrast ratios. */
export const MIN_CONTRAST = {
  /** Body-size text (1.4.3). */
  text: 4.5,
  /** Large text: 24px regular, or ~18.7px bold and up (1.4.3). */
  largeText: 3,
  /** Icons and state indicators a user needs to see (1.4.11). */
  graphic: 3,
} as const;

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** WCAG relative luminance of a `#RRGGBB` color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two opaque `#RRGGBB` colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Text or icon color for content painted on a solid `fill`: white where it
 * reaches body-text contrast (the Figma look on dark accents), the app's dark
 * text color otherwise. Every type color reaches 4.5:1 with one of the two.
 */
export function foregroundOn(fill: string): string {
  if (contrastRatio(COLORS.white, fill) >= MIN_CONTRAST.text) return COLORS.white;
  return contrastRatio(COLORS.dark, fill) >= contrastRatio(COLORS.white, fill) ? COLORS.dark : COLORS.white;
}

const accentCache = new Map<string, string>();

/**
 * `accent` when it already reads on `background` at `minRatio`, otherwise the
 * same hue darkened just enough to. For type-colored text and icons; decorative
 * accents (borders, bar fills, tinted tracks) keep the canonical color.
 */
export function accentOn(
  accent: string,
  background: string = COLORS.white,
  minRatio: number = MIN_CONTRAST.text,
): string {
  const key = `${accent}|${background}|${minRatio}`;
  const cached = accentCache.get(key);
  if (cached !== undefined) return cached;

  const rgb = channels(accent);
  let result = accent;
  // Mixing toward black in 5% steps keeps the hue recognizable and always
  // terminates: black itself clears every threshold on the app's light surfaces.
  for (let step = 0; step <= 20 && contrastRatio(result, background) < minRatio; step += 1) {
    result = toHex(rgb.map((c) => c * (1 - step / 20)));
  }
  accentCache.set(key, result);
  return result;
}
