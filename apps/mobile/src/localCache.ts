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

// ===========================================
// Caché del catálogo de trámites (offline)
// ===========================================
// Los trámites NO son datos de usuario: son catálogo público, así que
// esta caché NO se borra al cerrar sesión. Permite carga instantánea y
// navegación offline (los 77 trámites de Supabase). TTL de 24 h para
// refrescar en segundo plano cuando hay conexión.

const PROCEDURES_CACHE_KEY = 'trami_procedures_catalog_cache_v1';
const PROCEDURES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface ProceduresCachePayload {
  items: unknown[];
  savedAt: number;
}

/**
 * Guarda el catálogo de trámites en caché local.
 */
export async function cacheProcedures(items: unknown[]): Promise<void> {
  try {
    const payload: ProceduresCachePayload = {
      items,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(PROCEDURES_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Falla silenciosa: la caché es opcional.
  }
}

/**
 * Lee el catálogo en caché. Devuelve null si no existe o si supera el
 * TTL (los datos siguen siendo válidos para modo offline, pero el
 * llamador decidirá refrescar en segundo plano).
 */
export async function readCachedProcedures<T>(
  options: { allowExpired?: boolean } = {}
): Promise<{ data: T; isStale: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(PROCEDURES_CACHE_KEY);
    if (!raw) return null;
    const payload = safeParse<ProceduresCachePayload | null>(raw, null);
    if (!payload || !Array.isArray(payload.items)) return null;
    const isStale = Date.now() - payload.savedAt > PROCEDURES_CACHE_TTL_MS;
    if (isStale && !options.allowExpired) return null;
    return { data: payload.items as unknown as T, isStale };
  } catch {
    return null;
  }
}

/** Borra la caché del catálogo (p. ej. para forzar refresco completo). */
export async function clearProceduresCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROCEDURES_CACHE_KEY);
  } catch {
    // Silencioso.
  }
}