import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { es } from './es';
import { en } from './en';

export type AppLanguage = 'es' | 'en';

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export const getDefaultLanguage = (): AppLanguage => {
  const locale = Localization.getLocales?.()?.[0]?.languageCode;
  if (locale === 'en') return 'en';
  // Por defecto y para cualquier otro idioma, español.
  return 'es';
};

export const initI18n = (): void => {
  i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: getDefaultLanguage(),
    fallbackLng: 'es',
        interpolation: {
      prefix: '{{',
      suffix: '}}',
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
};

/** Instancia i18next para el I18nextProvider de react-i18next. */
export const getI18nInstance = (): typeof i18n => i18n;

export const changeLanguage = (lang: AppLanguage): void => {
  i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): AppLanguage => {
  return (i18n.language as AppLanguage) ?? getDefaultLanguage();
};
