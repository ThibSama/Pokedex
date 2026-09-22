import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupportedDexId } from '@/api/pokeApi';
import type { FavoritePokemon, NationalDexId, SpriteVariant } from '@/types/pokemon';

/**
 * Versioned keys: a schema change bumps the suffix instead of migrating in
 * place, so the previous payload stays readable until it has been rewritten.
 *
 * `v2` stores ordered favorite records (Dex id + chosen artwork variant).
 * `v1` stored bare ids and is only read to migrate an existing collection.
 */
export const FAVORITES_STORAGE_KEY = 'pokedex:favorites:v2';
export const FAVORITES_STORAGE_KEY_V1 = 'pokedex:favorites:v1';

const VARIANTS = ['normal', 'shiny'] as const satisfies readonly SpriteVariant[];

function isVariant(value: unknown): value is SpriteVariant {
  return typeof value === 'string' && (VARIANTS as readonly string[]).includes(value);
}

/**
 * Keep only usable Dex ids from a v1 payload, in first-seen order: integers
 * inside #001–#251, without duplicates. Anything else is dropped silently.
 */
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

/**
 * Keep only usable favorites, in first-seen order: a supported Dex id, no
 * duplicates. Variant is presentation metadata, so a missing or unreadable one
 * degrades to `normal` rather than dropping the entry — an unreadable variant
 * must never cost the user a Pokémon.
 */
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

/** v1 `number[]` → v2 records: insertion order preserved, invalid ids dropped. */
export function migrateFavoriteIds(value: unknown): FavoritePokemon[] {
  return sanitizeFavoriteIds(value).map((id) => ({ id, variant: 'normal' }));
}

export interface LoadedFavorites {
  entries: FavoritePokemon[];
  /** True when the collection came from the v1 payload and still has to be written back. */
  migratedFromV1: boolean;
}

/**
 * Read the persisted favorites.
 *
 * A present v2 key is authoritative even when it holds an empty array: a
 * collection the user emptied must not be resurrected from v1. Only a missing
 * v2 key falls back to the v1 payload, which the caller then rewrites.
 * Missing, unreadable or corrupt storage degrades to an empty collection rather
 * than throwing.
 */
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

/**
 * Persist the collection as a plain `FavoritePokemon[]`. Only the Dex id and the
 * chosen artwork variant are stored; PokéAPI stays the source of truth for
 * names, sprites and types.
 */
export async function saveFavorites(entries: readonly FavoritePokemon[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(sanitizeFavoriteEntries(entries)));
}
