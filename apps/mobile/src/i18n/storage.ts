// ===========================================
// TRAMI ESPAÑA - Persistencia del idioma
// ===========================================
// Guarda el idioma elegido por el usuario en AsyncStorage para que se
// mantenga entre sesiones (i18n se inicializa con el idioma del sistema
// y, justo después, aplica el idioma guardado de forma asíncrona).

import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_STORAGE_KEY = 'trami_app_language';

/** Lee el idioma guardado; null si no hay preferencia guardada. */
export async function loadStoredLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Guarda el idioma seleccionado (fallo silencioso: es opcional). */
export async function persistLanguage(language: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Silencioso: si falla, el idioma del sistema será el fallback.
  }
}
