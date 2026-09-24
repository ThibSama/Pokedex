import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemeMode } from '@/theme/tokens';

export const THEME_STORAGE_KEY = 'pokedex:theme:v1';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

// Tout le reste vaut Light : l'app ne suit jamais le thème système d'elle-même.
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
