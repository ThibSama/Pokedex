import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupportedDexId } from '@/api/pokeApi';
import type { FavoritePokemon, NationalDexId, SpriteVariant } from '@/types/pokemon';

// Un changement de schéma incrémente le suffixe plutôt que de migrer sur place.
// v1 (ids seuls) n'est plus lu que pour migrer vers v2 (id + variante).
export const FAVORITES_STORAGE_KEY = 'pokedex:favorites:v2';
export const FAVORITES_STORAGE_KEY_V1 = 'pokedex:favorites:v1';

const VARIANTS = ['normal', 'shiny'] as const satisfies readonly SpriteVariant[];

function isVariant(value: unknown): value is SpriteVariant {
  return typeof value === 'string' && (VARIANTS as readonly string[]).includes(value);
}

export function sanitizeFavoriteIds(value: unknown): NationalDexId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<NationalDexId>();
  const ids: NationalDexId[] = [];
  for (const entry of value) {
    if (typeof entry !== 'number' || !isSupportedDexId(entry) || seen.has(entry)) continue;
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

// Une variante illisible retombe sur `normal` : elle ne doit jamais faire perdre un Pokémon.
export function sanitizeFavoriteEntries(value: unknown): FavoritePokemon[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<NationalDexId>();
  const entries: FavoritePokemon[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue;
    const { id, variant } = entry as { id?: unknown; variant?: unknown };
    if (typeof id !== 'number' || !isSupportedDexId(id) || seen.has(id)) continue;
    seen.add(id);
    entries.push({ id, variant: isVariant(variant) ? variant : 'normal' });
  }
  return entries;
}

export function migrateFavoriteIds(value: unknown): FavoritePokemon[] {
  return sanitizeFavoriteIds(value).map((id) => ({ id, variant: 'normal' }));
}

export interface LoadedFavorites {
  entries: FavoritePokemon[];
  /** Vrai si la collection vient de v1 et doit encore être réécrite. */
  migratedFromV1: boolean;
}

// Une clé v2 présente fait foi, même vide : une collection vidée ne doit pas
// renaître de v1. Un stockage illisible donne une collection vide.
export async function loadFavorites(): Promise<LoadedFavorites> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      return { entries: Array.isArray(parsed) ? sanitizeFavoriteEntries(parsed) : [], migratedFromV1: false };
    }
  } catch {
    return { entries: [], migratedFromV1: false };
  }

  try {
    const legacy = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY_V1);
    if (legacy === null) return { entries: [], migratedFromV1: false };
    return { entries: migrateFavoriteIds(JSON.parse(legacy)), migratedFromV1: true };
  } catch {
    return { entries: [], migratedFromV1: false };
  }
}

export async function saveFavorites(entries: readonly FavoritePokemon[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(sanitizeFavoriteEntries(entries)));
}
