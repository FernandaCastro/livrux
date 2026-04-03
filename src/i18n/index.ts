import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en';
import pt from './locales/pt';
import de from './locales/de';

export const SUPPORTED_LANGUAGES = ['en', 'de', 'pt'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Derive the best matching supported language from the device locale list.
// Falls back to English if no match is found.
function getInitialLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const tag = locale.languageTag.split('-')[0] as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.includes(tag)) return tag;
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
    de: { translation: de },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    // React already escapes values, so we disable escaping here.
    escapeValue: false,
  },
});

export default i18n;
