// ===========================================
// TRAMI ESPAÑA - Contexto de Autenticación
// ===========================================
// Contexto para gestionar el estado de autenticación global

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@trami-espana/shared';
import type { User, Session } from '@supabase/supabase-js';

// ===========================================
// TIPOS
// ===========================================

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: string | null;
    isRecovery: boolean;
    login: (email: string, password: string) => Promise<{ error: Error | null }>;
    register: (
        email: string,
        password: string,
        confirmPassword: string,
        fullName?: string
    ) => Promise<{
        error: Error | null;
        requiresEmailConfirmation?: boolean;
    }>;
    resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
    logout: () => Promise<{ error: Error | null }>;
    resetPassword: (email: string) => Promise<{ error: Error | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
    clearError: () => void;
    clearRecovery: () => void;
}

// ===========================================
// CONTEXTO
// ===========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================================
// PROVIDER
// ===========================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRecovery, setIsRecovery] = useState(false);

    // ===========================================
    // CARGAR SESIÓN INICIAL
    // ===========================================

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                setLoading(true);

                // Paso 1: recuperar la sesión local
                const currentSession = await authService.getSession();

                if (!isMounted) return;

                if (currentSession) {
                    setSession(currentSession);
                    setUser(currentSession.user || null);
                }

                // ===========================================
                // PASO 2: VALIDAR USUARIO CONTRA SUPABASE
                // ===========================================

                try {
                    if (currentSession) {
                        const currentUser = await authService.getCurrentUser();

                        if (!isMounted) return;

                        if (currentUser) {
                            setUser(currentUser);
                        }
                    }
                } catch {
                    // Error de red o servidor transitorio:
                    // conservamos la sesión local ya cargada.
                }

            } catch {
                // Error controlado en inicialización.
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // ===========================================
        // ESCUCHAR CAMBIOS EN AUTENTICACIÓN
        // ===========================================

        const { data: { subscription } } =
            authService.onAuthStateChange(
                (event, session) => {
                    if (!isMounted) return;

                    // Detectar sesión de recuperación de contraseña
                    if (event === 'PASSWORD_RECOVERY' && session) {
                        setIsRecovery(true);
                        setSession(session);
                        setUser(session.user || null);
                        setLoading(false);
                        return;
                    }

                    // Restablecer modo de recuperación
                    if (event === 'SIGNED_OUT') {
                        setIsRecovery(false);
                    }

                    setSession(session);
                    setUser(session?.user || null);
                    setLoading(false);
                }
            );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // ===========================================
    // LOGIN
    // ===========================================

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await authService.login({
                email,
                password
            });

            if (response.error) {
                setError(response.error.message);
                return { error: response.error };
            }

            setUser(response.user);
            setSession(response.session);

            return { error: null };

        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Error en el inicio de sesión');

            setError(error.message);

            return { error };

        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // REGISTER
    // ===========================================

    const register = async (
        email: string,
        password: string,
        confirmPassword: string,
        fullName?: string
    ) => {
        try {
            setLoading(true);
            setError(null);

            const response = await authService.register({
                email,
                password,
                confirmPassword,
                fullName
            });

            if (response.error) {
                setError(response.error.message);

                return {
                    error: response.error
                };
            }

            if (response.session) {
                setUser(response.user);
                setSession(response.session);

                return {
                    error: null
                };
            }

            return {
                error: null,
                requiresEmailConfirmation: true
            };

        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Error en el registro');

            setError(error.message);

            return {
                error
            };

        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // LOGOUT
    // ===========================================

    const logout = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await authService.logout();

            if (response.error) {
                setError(response.error.message);

                return {
                    error: response.error
                };
            }

            setUser(null);
            setSession(null);

            return {
                error: null
            };

        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Error al cerrar sesión');

            setError(error.message);

            return {
                error
            };

        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // RESEND CONFIRMATION
    // ===========================================

    const resendConfirmation = async (email: string) => {
        try {
            setLoading(true);
            setError(null);

            const response =
                await authService.resendConfirmation(email);

            if (response.error) {
                setError(response.error.message);

                return {
                    error: response.error
                };
            }

            return {
                error: null
            };

        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error(
                        'Ha ocurrido un error. Por favor, inténtalo de nuevo.'
                    );

            setError(error.message);

            return {
                error
            };

        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // RESET PASSWORD
    // ===========================================

    const resetPassword = async (email: string) => {
        try {
            setLoading(true);
            setError(null);

            const response =
                await authService.resetPassword(email);

            if (response.error) {
                setError(response.error.message);

                return {
                    error: response.error
                };
            }

            return {
                error: null
            };

        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error(
                        'Error al enviar email de recuperación'
                    );

            setError(error.message);

            return {
                error
            };

        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // UPDATE PASSWORD
    // ===========================================

    const updatePassword = async (newPassword: string) => {
        try {
            setLoading(true);
            setError(null);

            const response =
                await authService.updatePassword(newPassword);

            if (response.error) {
                setError(response.error.message);

                return {
                    error: response.error
                };
            }

            setIsRecovery(false);

            return {
                error: null
            };

        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error(
                        'Error al actualizar la contraseña'
                    );

            setError(error.message);

            return {
                error
            };

        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // CLEAR ERROR
    // ===========================================

    const clearError = () => {
        setError(null);
    };

    // ===========================================
    // CLEAR RECOVERY
    // ===========================================

    const clearRecovery = () => {
        setIsRecovery(false);
    };

    // ===========================================
    // VALOR DEL CONTEXTO
    // ===========================================

    const value: AuthContextType = {
        user,
        session,
        loading,
        error,
        isRecovery,
        login,
        register,
        resendConfirmation,
        logout,
        resetPassword,
        updatePassword,
        clearError,
        clearRecovery
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ===========================================
// HOOK PERSONALIZADO
// ===========================================

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error(
            'useAuth debe ser usado dentro de un AuthProvider'
        );
    }

    return context;
}