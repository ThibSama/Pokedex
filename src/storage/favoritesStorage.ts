import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupportedDexId } from '@/api/pokeApi';
import type { NationalDexId } from '@/types/pokemon';

/**
 * Versioned key: a future schema change bumps the suffix instead of migrating
 * or misreading the old payload.
 */
export const FAVORITES_STORAGE_KEY = 'pokedex:favorites:v1';

/**
 * Keep only usable Dex ids, in first-seen order: integers inside #001–#251,
 * without duplicates. Anything else in the payload is dropped silently.
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
 * Read the persisted favorites. Missing, unreadable or corrupt storage
 * degrades to an empty collection rather than throwing.
 */
export async function loadFavoriteIds(): Promise<NationalDexId[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw === null) return [];
    return sanitizeFavoriteIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Persist favorites as a plain `number[]`. PokéAPI stays the source of truth for everything else. */
export async function saveFavoriteIds(ids: NationalDexId[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(sanitizeFavoriteIds(ids)));
}
