// ===========================================
// TRAMI ESPAÑA - Sistema de tema (claro / oscuro / sistema)
// ===========================================
// Paletas centralizadas + hook useAppTheme() basado en useColorScheme().
// La preferencia del usuario (sistema/claro/oscuro) se persiste en
// AsyncStorage; "system" sigue dinámicamente al sistema operativo.
//
// ThemeProvider envuelve la app en app/_layout.tsx y expone el tema
// activo mediante el hook useTheme().

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  errorBackground: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#b91c1c',
  successBackground: '#f0fdf4',
  successBorder: '#bbf7d0',
  successText: '#15803d',
  warningBackground: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#92400e',
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
  errorBackground: '#2d1515',
  errorBorder: '#4a2020',
  errorText: '#fca5a5',
  successBackground: '#0d2818',
  successBorder: '#1a4a2e',
  successText: '#86efac',
  warningBackground: '#2d2210',
  warningBorder: '#4a3818',
  warningText: '#fcd34d',
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

// -------------------------------------------
// Context y Provider Global
// -------------------------------------------
const ThemeContext = createContext<AppTheme | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider envuelve la aplicación y provee el tema activo
 * a todos los componentes mediante el hook useTheme().
 * Debe colocarse en app/_layout.tsx, dentro del ErrorBoundary.
 */
export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

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

  const value: AppTheme = {
    colors,
    isDark,
    systemScheme: systemScheme === 'dark' ? 'dark' : 'light',
    preference,
    setPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook central de tema. Accede al ThemeProvider para obtener la paleta activa.
 * Debe usarse dentro del ThemeProvider (envuelve la app en app/_layout.tsx).
 */
export function useTheme(): AppTheme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}

/**
 * Hook legacy para compatibilidad. Usa el ThemeProvider internamente
 * cuando no se ha configurado un proveedor externo.
 * @deprecated Preferir useTheme() con ThemeProvider en app/_layout.tsx.
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
