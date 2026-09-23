import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { loadStoredLanguage, saveLanguage } from '@/i18n/languageStorage';
import { DEFAULT_LANGUAGE, isAppLanguage, resolveDeviceLanguage } from '@/i18n/languages';
import en from '@/i18n/locales/en';
import fr from '@/i18n/locales/fr';
import type { LanguageCode } from '@/types/pokemon';

/**
 * The app's single i18next instance — its own, rather than the library's
 * global default, so nothing else can reconfigure it.
 *
 * Resources are bundled, so initialization is synchronous (`initAsync: false`)
 * and `t` works from the first render. It starts on the device language; the
 * root layout then applies a stored choice before anything is painted (see
 * `hydrateLanguage`), so the user never sees the wrong language first.
 */
export const resources = {
  fr: { translation: fr },
  en: { translation: en },
} as const;

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLanguage(),
  // The two trees are kept identical by their types; the fallback only guards
  // against a runtime surprise showing a raw key.
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['fr', 'en'],
  load: 'languageOnly',
  initAsync: false,
  interpolation: {
    // React already escapes rendered text.
    escapeValue: false,
  },
  react: {
    // Bundled resources never load asynchronously, so there is nothing to suspend on.
    useSuspense: false,
  },
  // Development only: a key missing from every language is logged instead of
  // silently rendering the key itself.
  saveMissing: __DEV__,
  missingKeyHandler: (languages, namespace, key) => {
    console.warn(`[i18n] Missing key "${namespace}:${key}" for ${languages.join(', ')}`);
  },
});

/** Keeps the web document's `lang` attribute in step, for screen readers and hyphenation. */
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language;
  });
}

/**
 * Applies the persisted choice, if there is a valid one. Called once by the root
 * layout, which keeps the splash up until this settles.
 */
export async function hydrateLanguage(): Promise<void> {
  const stored = await loadStoredLanguage();
  if (stored !== null && stored !== i18n.resolvedLanguage) {
    await i18n.changeLanguage(stored);
  }
}

/**
 * Switches the whole app and remembers the choice. Purely local: every screen
 * re-renders from data it already holds, and nothing is refetched.
 */
export function changeAppLanguage(language: LanguageCode): void {
  if (language === i18n.resolvedLanguage) return;
  i18n.changeLanguage(language).catch(() => {
    // Bundled resources cannot fail to load; nothing to recover.
  });
  saveLanguage(language).catch(() => {
    // Non-fatal: the switch still applies for this session.
  });
}

/** The active application language; re-renders the caller when it changes. */
export function useAppLanguage(): LanguageCode {
  const { i18n: instance } = useTranslation();
  const language = instance.resolvedLanguage;
  return isAppLanguage(language) ? language : DEFAULT_LANGUAGE;
}

export default i18n;
