// ===========================================
// TRAMI ESPAÑA - Caché local por usuario
// ===========================================
// Aislamiento estricto de favoritos y recordatorios según el login:
//  - Al CERRAR SESIÓN se borran de inmediato las claves de AsyncStorage.
//  - Al INICIAR SESIÓN solo se cargan los datos de Supabase del usuario
//    autenticado (los servicios ya filtran por user_id). Nunca se mezclan
//    datos entre usuarios.
//
// Esta caché es un mero acelerador offline; la fuente de verdad siempre es
// Supabase (favorites / reminders filtrados por user_id).

import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'trami_favorites_cache';
const REMINDERS_KEY = 'trami_reminders_cache';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Guarda una copia local de los favoritos del usuario actual.
 * La clave NO incluye user_id: se resetea al iniciar o cerrar sesión,
 * de modo que nunca persistan datos de una sesión a otra.
 */
export async function cacheFavorites(items: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  } catch {
    // Falla silenciosa: la caché es opcional.
  }
}

export async function readCachedFavorites<T>(fallback: T): Promise<T> {
  try {
    return safeParse<T>(await AsyncStorage.getItem(FAVORITES_KEY), fallback);
  } catch {
    return fallback;
  }
}

export async function cacheReminders(items: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(items));
  } catch {
    // Falla silenciosa: la caché es opcional.
  }
}

export async function readCachedReminders<T>(fallback: T): Promise<T> {
  try {
    return safeParse<T>(await AsyncStorage.getItem(REMINDERS_KEY), fallback);
  } catch {
    return fallback;
  }
}

/**
 * Borra la caché local de favoritos y recordatorios.
 * DEBE llamarse inmediatamente después de un logout para impedir que
 * un usuario invitado o distinto vea datos de una sesión anterior.
 */
export async function clearUserCaches(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([FAVORITES_KEY, REMINDERS_KEY]);
  } catch {
    // Si AsyncStorage falla, intentamos borrar una a una.
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
      await AsyncStorage.removeItem(REMINDERS_KEY);
    } catch {
      // Silencioso: sin caché no hay filtración posible.
    }
  }
}