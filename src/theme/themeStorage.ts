import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemeMode } from '@/theme/tokens';

/**
 * The user's explicit theme choice, stored as the bare mode (`light` / `dark`).
 * Versioned like the language and favorites keys.
 */
export const THEME_STORAGE_KEY = 'pokedex:theme:v1';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/**
 * The stored mode. Anything else — no value, an unknown string, a storage
 * failure — is Light: the app never follows the system theme on its own.
 */
export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : 'light';
  } catch {
    return 'light';
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
}
