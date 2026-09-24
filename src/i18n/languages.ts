import { getLocales } from 'expo-localization';

import type { LanguageCode } from '@/types/pokemon';

export const APP_LANGUAGES = ['fr', 'en'] as const satisfies readonly LanguageCode[];

export const DEFAULT_LANGUAGE: LanguageCode = 'fr';

// Tags BCP 47 pour `Intl`.
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

// `languageCode` peut être null, et l'appel natif est protégé : un échec retombe
// sur la langue par défaut sans bloquer le démarrage.
export function resolveDeviceLanguage(): LanguageCode {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return isAppLanguage(code) ? code : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
