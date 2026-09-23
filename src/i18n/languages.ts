import { getLocales } from 'expo-localization';

import type { LanguageCode } from '@/types/pokemon';

/** Exactly the languages the app ships copy and Pokémon data for. */
export const APP_LANGUAGES = ['fr', 'en'] as const satisfies readonly LanguageCode[];

/** Used when neither a stored choice nor the device locale is a supported language. */
export const DEFAULT_LANGUAGE: LanguageCode = 'fr';

/** BCP 47 tags for `Intl` formatting and collation. */
export const LOCALE_TAGS: Record<LanguageCode, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

export function isAppLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
}

export function otherLanguage(language: LanguageCode): LanguageCode {
  return language === 'fr' ? 'en' : 'fr';
}

/**
 * The device's primary language when it is French or English, French otherwise.
 * `getLocales()` is synchronous and always returns at least one entry, but its
 * `languageCode` can be null, and the native call is guarded so a failure
 * degrades to the default instead of blocking startup.
 */
export function resolveDeviceLanguage(): LanguageCode {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return isAppLanguage(code) ? code : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
