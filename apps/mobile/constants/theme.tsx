// ===========================================
// TRAMI ESPAÑA - Sistema de tema (claro / oscuro / sistema)
// ===========================================
// Paletas centralizadas + hook useAppTheme() basado en useColorScheme().
// La preferencia del usuario (sistema/claro/oscuro) se persiste en
// AsyncStorage; "system" sigue dinámicamente al sistema operativo.
//
// ThemeProvider envuelve la app en app/_layout.tsx y expone el tema
// activo mediante el hook useTheme().

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';
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
  // Tokens extendidos (v1.5.1): sustituyen todos los colores hardcodeados.
  onPrimary: '#ffffff',
  onPrimaryMuted: '#dbeafe',
  primaryDisabled: '#93c5fd',
  infoBorder: '#bfdbfe',
  shadow: '#000000',
  header: '#ffffff',
  headerText: '#0f172a',
  surfaceMuted: '#f1f5f9',
  surfaceStrong: '#e2e8f0',
  track: 'rgba(148, 163, 184, 0.28)',
  successStrong: '#059669',
  accent: '#7c3aed',
  accentSoft: '#f5f3ff',
  accentBorder: '#ddd6fe',
  accentText: '#4c1d95',
  // Semáforo de caducidades (Mi Carpeta).
  statusValid: '#16a34a',
  statusWarning: '#d97706',
  statusUrgent: '#dc2626',
  statusExpired: '#991b1b',
  // Tipografía unificada: fuente del sistema limpia (evita la degenerada
  // «RobotoRegular» de Xiaomi/MIUI/HyperOS que recortaba pesos y curvas).
  fontFamily: Platform.select({
    android: 'sans-serif-medium',
    ios: 'System',
    default: 'System',
  }),
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
  // Tokens extendidos (v1.5.1): sustituyen todos los colores hardcodeados.
  onPrimary: '#ffffff',
  onPrimaryMuted: '#dbeafe',
  primaryDisabled: '#1e3a5f',
  infoBorder: '#1e3a5f',
  shadow: '#000000',
  header: '#0f172a',
  headerText: '#ffffff',
  surfaceMuted: '#1e293b',
  surfaceStrong: '#334155',
  track: 'rgba(148, 163, 184, 0.28)',
  successStrong: '#34d399',
  accent: '#8b5cf6',
  accentSoft: '#1e1b4b',
  accentBorder: '#3730a3',
  accentText: '#a78bfa',
  // Semáforo de caducidades (Mi Carpeta).
  statusValid: '#4ade80',
  statusWarning: '#fbbf24',
  statusUrgent: '#f87171',
  statusExpired: '#fca5a5',
  // Tipografía unificada: misma familia de fuente en modo oscuro.
  fontFamily: Platform.select({
    android: 'sans-serif-medium',
    ios: 'System',
    default: 'System',
  }),
};

export type ThemeColors = typeof lightColors;

/**
 * Tokens de diseño no cromáticos compartidos por toda la app.
 * Radio, opacidad de pulsación y sombra suave unificados.
 */
export const designTokens = {
  radius: 16,
  radiusSm: 12,
  activeOpacity: 0.7,
} as const;

/**
 * Crea una factoría de estilos tematizados con caché por paleta.
 * Como solo existen dos paletas (objetos estables), `StyleSheet.create` se
 * ejecuta como máximo dos veces en toda la vida de la app, en lugar de en
 * cada render. Se puede llamar desde cualquier componente sin hooks.
 */
export function createThemedStyles<T>(
  factory: (colors: ThemeColors, isDark: boolean) => T,
): (colors: ThemeColors, _isDark?: boolean) => T {
  const cache = new WeakMap<ThemeColors, T>();
  return (colors: ThemeColors): T => {
    let styles = cache.get(colors);
    if (!styles) {
      styles = factory(colors, colors === darkColors);
      cache.set(colors, styles);
    }
    return styles;
  };
}

/** Sombra suave estándar (elevation 2 en Android, sombra difusa en iOS). */
export function softShadow(colors: ThemeColors) {
  return {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  } as const;
}

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

  // Valor memoizado: evita re-renderizar TODOS los consumidores del tema
  // cada vez que el provider se renderiza sin que cambie nada.
  const value = useMemo<AppTheme>(() => {
    const { colors, isDark } = resolveTheme(preference, systemScheme);
    return {
      colors,
      isDark,
      systemScheme: systemScheme === 'dark' ? 'dark' : 'light',
      preference,
      setPreference,
    };
  }, [preference, systemScheme, setPreference]);

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
