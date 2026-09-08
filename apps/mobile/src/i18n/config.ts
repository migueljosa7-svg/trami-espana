import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { es } from './es';
import { en } from './en';
import { ca } from './ca';
import { eu } from './eu';
import { gl } from './gl';
import { ar } from './ar';
import { fr } from './fr';
import { uk } from './uk';
import { ro } from './ro';
import { loadStoredLanguage, persistLanguage } from './storage';

/**
 * Idiomas soportados:
 *  - Nacionales/regionales de España: español, inglés, catalán, euskera y gallego.
 *  - Comunidades extranjeras residentes en España: árabe (RTL), francés,
 *    ucraniano y rumano.
 */
export type AppLanguage = 'es' | 'en' | 'ca' | 'eu' | 'gl' | 'ar' | 'fr' | 'uk' | 'ro';

export type LanguageGroup = 'spain' | 'international';

export interface SupportedLanguage {
  code: AppLanguage;
  label: string;
  flag: string;
  group: LanguageGroup;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸', group: 'spain' },
  { code: 'ca', label: 'Català', flag: '🏴', group: 'spain' },
  { code: 'eu', label: 'Euskara', flag: '⚡', group: 'spain' },
  { code: 'gl', label: 'Galego', flag: '🐚', group: 'spain' },
  { code: 'en', label: 'English', flag: '🇬🇧', group: 'international' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', group: 'international' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', group: 'international' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', group: 'international' },
  { code: 'ro', label: 'Română', flag: '🇷🇴', group: 'international' },
];

/** Idiomas que se escriben de derecha a izquierda. */
export const RTL_LANGUAGES: readonly AppLanguage[] = ['ar'];

export const isRTLLanguage = (language: string): boolean =>
  RTL_LANGUAGES.includes(language as AppLanguage);

/**
 * Aplica la dirección de maquetación (LTR/RTL) correspondiente al idioma.
 * IMPORTACIÓN IMPORTANTE: en React Native, cambiar forceRTL en caliente
 * solo se refleja por completo tras reiniciar la app; por eso el selector
 * informa al usuario cuando cambia a/desde un idioma RTL.
 */
export function applyLayoutDirection(language: string): void {
  const rtl = isRTLLanguage(language);
  try {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  } catch {
    // Algunos entornos (web puro) no soportan I18nManager.
  }
}

/** Idioma inicial: el del sistema si está soportado; si no, español. */
export const getDefaultLanguage = (): AppLanguage => {
  const locales = Localization.getLocales?.() ?? [];
  for (const locale of locales) {
    const code = locale.languageCode as AppLanguage;
    if (SUPPORTED_LANGUAGES.some((lang) => lang.code === code)) {
      return code;
    }
  }
  return 'es';
};

export const initI18n = (): void => {
  i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      ca: { translation: ca },
      eu: { translation: eu },
      gl: { translation: gl },
      ar: { translation: ar },
      fr: { translation: fr },
      uk: { translation: uk },
      ro: { translation: ro },
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

  // Preferencia guardada por el usuario (tiene prioridad sobre el sistema).
  void loadStoredLanguage().then((stored) => {
    if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
      applyLayoutDirection(stored);
      void i18n.changeLanguage(stored);
    }
  });
};

/** Instancia i18next para el I18nextProvider de react-i18next. */
export const getI18nInstance = (): typeof i18n => i18n;

export const changeLanguage = (lang: AppLanguage): void => {
  applyLayoutDirection(lang);
  void i18n.changeLanguage(lang);
  void persistLanguage(lang);
};

export const getCurrentLanguage = (): AppLanguage => {
  return (i18n.language as AppLanguage) ?? getDefaultLanguage();
};

