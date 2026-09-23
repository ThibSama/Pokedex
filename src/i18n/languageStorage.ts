import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAppLanguage } from '@/i18n/languages';
import type { LanguageCode } from '@/types/pokemon';

/**
 * The user's explicit language choice, stored as the bare code (`fr` / `en`).
 * Versioned like the favorites key, so a future schema can move to `v2` without
 * misreading this one. Only the choice is stored — never translated data.
 */
export const LANGUAGE_STORAGE_KEY = 'pokedex:language:v1';

/**
 * The stored choice, or null when there is none. Anything unreadable — a value
 * that is not exactly a supported code, or a storage failure — is treated as
 * "no choice", so startup falls back to the device locale.
 */
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
