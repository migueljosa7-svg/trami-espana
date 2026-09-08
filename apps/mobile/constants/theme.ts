// ===========================================
// TRAMI ESPAÑA - Sistema de tema (claro / oscuro / sistema)
// ===========================================
// Paletas centralizadas + hook useAppTheme() basado en useColorScheme().
// La preferencia del usuario (sistema/claro/oscuro) se persiste en
// AsyncStorage; "system" sigue dinámicamente al sistema operativo.

import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorSchemeName = 'light' | 'dark';

const THEME_PREFERENCE_KEY = 'trami_theme_preference';

// -------------------------------------------
// Paletas
// -------------------------------------------
export const lightColors = {
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#2563eb',
  primarySoft: '#eff6ff',
  tabBarActive: '#2563eb',
  tabBarInactive: '#64748b',
  chip: '#f1f5f9',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  overlay: 'rgba(15, 23, 42, 0.55)',
};

export const darkColors = {
  background: '#0b1220',
  card: '#111a2c',
  border: '#243044',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#7c8aa5',
  primary: '#3b82f6',
  primarySoft: '#172554',
  tabBarActive: '#60a5fa',
  tabBarInactive: '#8aa0b8',
  chip: '#1b2740',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export type ThemeColors = typeof lightColors;

// -------------------------------------------
// Resolución de tema
// -------------------------------------------
export function resolveTheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName | null | undefined
): { colors: ThemeColors; isDark: boolean } {
  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  return { colors: isDark ? darkColors : lightColors, isDark };
}

// -------------------------------------------
// Persistencia de la preferencia
// -------------------------------------------
export async function getStoredThemePreference(): Promise<ThemePreference> {
  try {
    const raw = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // Caché opcional: fallo silencioso.
  }
  return 'system';
}

export async function storeThemePreference(preference: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch {
    // Fallo silencioso.
  }
}

// -------------------------------------------
// Hook principal
// -------------------------------------------
export interface AppTheme {
  colors: ThemeColors;
  isDark: boolean;
  /** Esquema activo del sistema operativo ('light' | 'dark'). */
  systemScheme: ColorSchemeName;
  /** Preferencia del usuario ('system' | 'light' | 'dark'). */
  preference: ThemePreference;
  /** Cambia y persiste la preferencia de tema. */
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Hook central de tema. Combina useColorScheme() con la preferencia
 * persistida del usuario para devolver la paleta activa.
 */
export function useAppTheme(): AppTheme {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Cargar la preferencia persistida una sola vez.
  useEffect(() => {
    let mounted = true;
    void getStoredThemePreference().then((stored) => {
      if (mounted) setPreferenceState(stored);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void storeThemePreference(next);
  }, []);

  const { colors, isDark } = resolveTheme(preference, systemScheme);

  return {
    colors,
    isDark,
    systemScheme: systemScheme === 'dark' ? 'dark' : 'light',
    preference,
    setPreference,
  };
}
