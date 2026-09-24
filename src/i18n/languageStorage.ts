import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAppLanguage } from '@/i18n/languages';
import type { LanguageCode } from '@/types/pokemon';

// Versionnée comme la clé des favoris ; seul le code (`fr`/`en`) est stocké.
export const LANGUAGE_STORAGE_KEY = 'pokedex:language:v1';

// Toute valeur illisible vaut « pas de choix » : on retombe sur la langue de l'appareil.
export async function loadStoredLanguage(): Promise<LanguageCode | null> {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function saveLanguage(language: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}
