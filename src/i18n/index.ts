import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { loadStoredLanguage, saveLanguage } from '@/i18n/languageStorage';
import { DEFAULT_LANGUAGE, isAppLanguage, resolveDeviceLanguage } from '@/i18n/languages';
import en from '@/i18n/locales/en';
import fr from '@/i18n/locales/fr';
import type { LanguageCode } from '@/types/pokemon';

// Instance dédiée plutôt que l'instance globale, que rien d'autre ne peut reconfigurer.
// Ressources embarquées : init synchrone, `t` disponible dès le premier rendu.
export const resources = {
  fr: { translation: fr },
  en: { translation: en },
} as const;

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLanguage(),
  // Les deux arbres sont alignés par leurs types ; le repli ne sert qu'en cas de
  // surprise à l'exécution.
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['fr', 'en'],
  load: 'languageOnly',
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  saveMissing: __DEV__,
  missingKeyHandler: (languages, namespace, key) => {
    console.warn(`[i18n] Missing key "${namespace}:${key}" for ${languages.join(', ')}`);
  },
});

// Tient à jour l'attribut `lang` du document, pour les lecteurs d'écran et la césure.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language;
  });
}

export async function hydrateLanguage(): Promise<void> {
  const stored = await loadStoredLanguage();
  if (stored !== null && stored !== i18n.resolvedLanguage) {
    await i18n.changeLanguage(stored);
  }
}

export function changeAppLanguage(language: LanguageCode): void {
  if (language === i18n.resolvedLanguage) return;
  i18n.changeLanguage(language).catch(() => {
    // Ressources embarquées : le chargement ne peut pas échouer.
  });
  saveLanguage(language).catch(() => {
    // Sans gravité : le changement s'applique quand même pour la session.
  });
}

export function useAppLanguage(): LanguageCode {
  const { i18n: instance } = useTranslation();
  const language = instance.resolvedLanguage;
  return isAppLanguage(language) ? language : DEFAULT_LANGUAGE;
}

export default i18n;
