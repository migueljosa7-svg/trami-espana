// ===========================================
// TRAMI ESPAÑA - Servicio de Autenticación
// ===========================================
// Servicio para gestionar autenticación con Supabase

import { getSupabaseClient } from '../supabase';
import type { User, Session } from '@supabase/supabase-js';

// ===========================================
// ERRORES PERSONALIZADOS
// ===========================================

export class AuthServiceError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AuthServiceError';
    }
}

// Códigos de error más relevantes de Supabase Auth para mapeo UX.
export const AUTH_CODE = {
    INVALID_CREDENTIALS: 'invalid_credentials',
    EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
    USER_ALREADY_REGISTERED: 'user_already_exists',
    OVER_RATE_LIMIT: 'over_email_send_rate_limit',
    SIGNUP_DISABLED: 'signup_disabled',
    PASSWORD_TOO_SHORT: 'password_too_short'
} as const;

/**
 * URL de redirección para confirmación de email y recuperación de contraseña.
 * - Web: utiliza el origen actual de la ventana.
 * - Móvil (React Native / Expo): utiliza el deep link scheme configurado en app.json.
 */
const MOBILE_REDIRECT_SCHEME = 'tramiespana';

function getRedirectUrl(path: string): string | undefined {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}${path}`;
    }
    // React Native / Expo: usar deep link scheme (configurado en app.json como "scheme")
    return `${MOBILE_REDIRECT_SCHEME}://${path}`;
}

/**
 * Detecta si un error (AuthServiceError o similar) representa el caso de
 * email registrado pero aún sin confirmar. La UI lo usa para mostrar
 * la pantalla de "Confirma tu email" con opción de reenvío.
 */
export function isEmailNotConfirmedError(
    error: Error | null | undefined
): boolean {
    if (!error) return false;
    if (error instanceof AuthServiceError) {
        if (error.code === AUTH_CODE.EMAIL_NOT_CONFIRMED) return true;
        if (/email not confirmed|confirm.*email/i.test(error.message)) return true;
    }
    return /email not confirmed|confirm.*email/i.test(error.message || '');
}

// ===========================================
// TIPOS
// ===========================================

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    confirmPassword: string;
    fullName?: string;
}

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error: Error | null;
    requiresEmailConfirmation?: boolean;
}

// ===========================================
// SERVICIO DE AUTENTICACIÓN
// ===========================================

export const authService = {
    /**
     * Registrar un nuevo usuario
     */
    async register(credentials: RegisterCredentials): Promise<AuthResponse> {
        try {
            const { email, password, confirmPassword, fullName } = credentials;

            if (password !== confirmPassword) {
                throw new AuthServiceError(
                    'Las contraseñas no coinciden',
                    'PASSWORD_MISMATCH'
                );
            }

            if (password.length < 6) {
                throw new AuthServiceError(
                    'La contraseña debe tener al menos 6 caracteres',
                    'PASSWORD_TOO_SHORT'
                );
            }

                        const { data, error } = await getSupabaseClient().auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName || null
                    },
                    // Supabase enviará el email de confirmación automáticamente
                    // cuando la confirmación de email esté habilitada en el proyecto.
                                        emailRedirectTo: getRedirectUrl('/login?confirmed=true')
                }
            });

            if (error) {
                throw new AuthServiceError(
                    this.getErrorMessage(error.message, error.code),
                    error.code,
                    { originalMessage: error.message }
                );
            }

            // Supabase devuelve user con aud confirmed_at null cuando requiere confirmación.
            // Si hay user pero no hay session, el email requiere confirmación.
            const requiresEmailConfirmation = !!data.user && !data.session;

            return {
                user: data.user,
                session: data.session,
                error: null,
                requiresEmailConfirmation
            };
        } catch (error) {
            if (error instanceof AuthServiceError) {
                return { user: null, session: null, error };
            }
            return {
                user: null,
                session: null,
                error: new AuthServiceError(
                    'Error en el registro',
                    'REGISTER_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Iniciar sesión
     */
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const { email, password } = credentials;

            const { data, error } = await getSupabaseClient().auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw new AuthServiceError(
                    this.getErrorMessage(error.message, error.code),
                    error.code,
                    { originalMessage: error.message }
                );
            }

            return {
                user: data.user,
                session: data.session,
                error: null
            };
        } catch (error) {
            if (error instanceof AuthServiceError) {
                return { user: null, session: null, error };
            }
            return {
                user: null,
                session: null,
                error: new AuthServiceError(
                    'Error en el inicio de sesión',
                    'LOGIN_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Cerrar sesión
     */
    async logout(): Promise<{ error: Error | null }> {
        try {
            const { error } = await getSupabaseClient().auth.signOut();

            if (error) {
                throw new AuthServiceError(
                    'Error al cerrar sesión',
                    'LOGOUT_ERROR',
                    { originalMessage: error.message }
                );
            }

            return { error: null };
        } catch (error) {
            if (error instanceof AuthServiceError) {
                return { error };
            }
            return {
                error: new AuthServiceError(
                    'Error al cerrar sesión',
                    'LOGOUT_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Obtener la sesión actual
     */
    async getSession(): Promise<Session | null> {
        try {
            const { data, error } = await getSupabaseClient().auth.getSession();

            if (error) {
                throw new AuthServiceError(
                    'Error al obtener la sesión',
                    'SESSION_ERROR',
                    { originalMessage: error.message }
                );
            }

            return data.session;
        } catch (error) {
            if (error instanceof AuthServiceError) {
                throw error;
            }
            throw new AuthServiceError(
                'Error al obtener la sesión',
                'SESSION_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Obtener el usuario actual
     */
    async getCurrentUser(): Promise<User | null> {
        try {
            const { data, error } = await getSupabaseClient().auth.getUser();

            if (error) {
                throw new AuthServiceError(
                    'Error al obtener el usuario',
                    'USER_ERROR',
                    { originalMessage: error.message }
                );
            }

            return data.user;
        } catch (error) {
            if (error instanceof AuthServiceError) {
                throw error;
            }
            throw new AuthServiceError(
                'Error al obtener el usuario',
                'USER_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Reenviar el email de confirmación de un registro aún no confirmado.
     * Usa la API oficial de Supabase (auth.resend).
     */
    async resendConfirmation(email: string): Promise<{ error: Error | null }> {
        try {
                        const redirectTo = getRedirectUrl('/login?confirmed=true');

            const { error } = await getSupabaseClient().auth.resend({
                type: 'signup',
                email,
                ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {})
            });

            if (error) {
                throw new AuthServiceError(
                    this.getErrorMessage(error.message, error.code),
                    error.code,
                    { originalMessage: error.message }
                );
            }

            return { error: null };
        } catch (error) {
            if (error instanceof AuthServiceError) {
                return { error };
            }
            return {
                error: new AuthServiceError(
                    'Ha ocurrido un error. Por favor, inténtalo de nuevo.',
                    'RESEND_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Enviar email de recuperación de contraseña
     */
        async resetPassword(email: string): Promise<{ error: Error | null }> {
        try {
                        const redirectTo = getRedirectUrl('/login?reset=true');

            const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
                redirectTo
            });

            // Por seguridad no revelamos si la cuenta existe: devolvemos éxito
            // incluso lanzándonos un error de "usuario no encontrado" sería
            // informativo. Aquí solo fallamos por problemas reales (red, rate limit).
            if (error && /rate limit|too many requests/i.test(error.message)) {
                throw new AuthServiceError(
                    this.getErrorMessage(error.message, error.code),
                    error.code,
                    { originalMessage: error.message }
                );
            }

            return { error: null };
        } catch (error) {
            if (error instanceof AuthServiceError) {
                return { error };
            }
            return {
                error: new AuthServiceError(
                    'Ha ocurrido un error. Por favor, inténtalo de nuevo.',
                    'RESET_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Actualizar la contraseña
     */
    async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
        try {
            if (newPassword.length < 6) {
                throw new AuthServiceError(
                    'La contraseña debe tener al menos 6 caracteres',
                    'PASSWORD_TOO_SHORT'
                );
            }

            const { error } = await getSupabaseClient().auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw new AuthServiceError(
                    'Error al actualizar la contraseña',
                    'UPDATE_PASSWORD_ERROR',
                    { originalMessage: error.message }
                );
            }

            return { error: null };
        } catch (error) {
            if (error instanceof AuthServiceError) {
                return { error };
            }
            return {
                error: new AuthServiceError(
                    'Error al actualizar la contraseña',
                    'UPDATE_PASSWORD_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Escuchar cambios en la autenticación
     */
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        return getSupabaseClient().auth.onAuthStateChange(callback);
    },

    /**
     * Convertir mensajes y códigos de error de Supabase a mensajes amigables.
     * Nunca expone detalles técnicos (400, JWT, REST, etc.) al usuario.
     */
    getErrorMessage(message?: string, code?: string): string {
        const codeMap: Record<string, string> = {
            [AUTH_CODE.INVALID_CREDENTIALS]:
                'El correo o la contraseña no son correctos.',
            [AUTH_CODE.EMAIL_NOT_CONFIRMED]:
                'Email no confirmado. Revisa tu bandeja de entrada.',
            [AUTH_CODE.USER_ALREADY_REGISTERED]:
                'Este email ya está registrado. Puedes iniciar sesión o recuperar tu contraseña.',
            [AUTH_CODE.OVER_RATE_LIMIT]:
                'Demasiados intentos. Por favor, espera unos minutos.',
            [AUTH_CODE.SIGNUP_DISABLED]:
                'El registro está deshabilitado temporalmente.',
            [AUTH_CODE.PASSWORD_TOO_SHORT]:
                'La contraseña debe tener al menos 6 caracteres.',
            'email_address_invalid':
                'El email introducido no es válido.',
            'invalid_email':
                'El email introducido no es válido.'
        };

        if (code && codeMap[code]) {
            return codeMap[code];
        }

        const msg = (message || '').trim();
        const lower = msg.toLowerCase();

        if (/invalid login credentials|incorrect.{0,20}credentials/.test(lower)) {
            return 'El correo o la contraseña no son correctos.';
        }
        if (/email not confirmed|confirm.{0,20}email/i.test(lower)) {
            return 'Email no confirmado. Revisa tu bandeja de entrada.';
        }
        if (/user already registered|already registered/.test(lower)) {
            return 'Este email ya está registrado. Puedes iniciar sesión o recuperar tu contraseña.';
        }
        if (/password should be at least/.test(lower)) {
            return 'La contraseña debe tener al menos 6 caracteres';
        }
        if (/invalid email|email is invalid/.test(lower)) {
            return 'Email inválido';
        }
        if (/signup is disabled|registration is disabled/.test(lower)) {
            return 'El registro está deshabilitado temporalmente';
        }
        if (/rate limit|too many requests|over_email_send_rate_limit/.test(lower)) {
            return 'Demasiados intentos. Por favor, espera unos minutos.';
        }
        if (/password.*required|password.*short/.test(lower)) {
            return 'La contraseña debe tener al menos 6 caracteres';
        }

        // Fallback genérico: nunca mostrar el texto técnico original.
        return 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
    }
};