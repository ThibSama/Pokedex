import 'i18next';

import type fr from '@/i18n/locales/fr';

/** Typed keys: `t('some.missing.key')` is a compile error rather than a raw key on screen. */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof fr;
    };
  }
}
