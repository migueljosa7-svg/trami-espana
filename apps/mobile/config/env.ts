// ===========================================
// TRAMI ESPAÑA - Variables de entorno centralizadas
// ===========================================
// Único punto de acceso a las variables EXPO_PUBLIC_*.
// Nunca leer process.env directamente desde pantallas o servicios:
// importar ENV desde 'config/env'.
//
// Nota Expo: solo las variables con prefijo EXPO_PUBLIC_ se incrustan
// en el bundle. Estas NO son secretas (la anon key es pública por
// diseño; la seguridad la aportan las políticas RLS de Supabase).

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const ENV = {
  /** URL del proyecto Supabase (pública). */
  SUPABASE_URL,
  /** Clave anónima de Supabase (pública, protegida por RLS). */
  SUPABASE_ANON_KEY,
  /** ID del proyecto en EAS (coincide con app.json > extra.eas.projectId). */
  EAS_PROJECT_ID: 'e2f6d28e-90e4-433b-99a4-145d311b219a',
  /** Entorno de ejecución actual. */
  IS_DEV: __DEV__,
} as const;

/**
 * Valida que las variables obligatorias estén presentes.
 * @returns Lista de errores encontrados (vacía si todo es correcto).
 */
export function validateEnv(): string[] {
  const errors: string[] = [];
  if (!ENV.SUPABASE_URL) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL no está definida (revisa apps/mobile/.env).');
  } else if (!/^https?:\/\//.test(ENV.SUPABASE_URL)) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL debe ser una URL https:// válida.');
  }
  if (!ENV.SUPABASE_ANON_KEY) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY no está definida (revisa apps/mobile/.env).');
  }
  return errors;
}
