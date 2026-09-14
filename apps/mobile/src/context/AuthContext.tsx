// ===========================================
// TRAMI ESPAÑA - Contexto de Autenticación
// ===========================================
// Proveedor global de estado de autenticación con rehidratación automática
// de sesión al arrancar la aplicación.

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '@trami-espana/shared';
import type { User, Session } from '@supabase/supabase-js';

// ===========================================
// TIPOS
// ===========================================

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isInitialized: boolean;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// ===========================================
// CONTEXTO
// ===========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================================
// HOOK PERSONALIZADO
// ===========================================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
}

// ===========================================
// PROVEEDOR
// ===========================================

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // ============================================================
    // Rehidratación de sesión al arrancar la app (FIX de carrera).
    //
    // Antes se registraba el listener y se llamaba a getSession() en
    // paralelo y, ante cualquier error puntual, se limpiaba el estado y
    // se cerraba la pantalla de carga: la app terminaba antes de que
    // AsyncStorage rehidratara el token y redirigía a /login.
    //
    // Ahora:
    //  1. Se SUSCRIBE PRIMERO a onAuthStateChange para no perder el
    //     evento INITIAL_SESSION (que emite el cliente al terminar de
    //     leer AsyncStorage).
    //  2. getSession() garantiza la lectura del token persistido
    //     (AuthContext -> authService -> storage).
    //  3. NUNCA se descarta una sesión existente por un error: la sesión
    //     solo se libera con el botón explícito de "Cerrar sesión".
    //  4. Hay una red de seguridad por timeout para no bloquear la app
    //     en la pantalla de carga si algo falla.
    // ============================================================
    useEffect(() => {
        let mounted = true;
        let initFinished = false;
        let sawInitialSession = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        // Limpieza de la suscripción a onAuthStateChange (null si falló).
        let unsubscribe: (() => void) | null = null;

        const markReady = () => {
            if (!mounted || initFinished) return;
            initFinished = true;
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = null;
            setIsLoading(false);
            setIsInitialized(true);
            console.log('[AUTH] Inicialización completada');
        };

        try {
            const { data: authData } = authService.onAuthStateChange((event, currentSession) => {
                console.log('[AUTH] Cambio de estado:', event);

                if (
                    event === 'SIGNED_IN' ||
                    event === 'TOKEN_REFRESHED' ||
                    event === 'INITIAL_SESSION'
                ) {
                    if (event === 'INITIAL_SESSION') {
                        sawInitialSession = true;
                    }
                    // No sobreescribir una sesión válida con null:
                    // solo actualiza si llega una sesión real.
                    if (currentSession) {
                        setSession(currentSession);
                        setUser(currentSession.user ?? null);
                        console.log('[AUTH] Usuario actualizado:', currentSession.user?.email);
                    }
                    // INITIAL_SESSION = el cliente ya terminó de leer el
                    // storage persistido: es seguro cerrar la pantalla de carga.
                    if (event === 'INITIAL_SESSION') {
                        markReady();
                    }
                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    console.log('[AUTH] Sesión cerrada');
                }
            });
            // Preparar la limpieza de forma segura.
            if (authData) {
                const sub = authData.subscription;
                unsubscribe = () => {
                    try {
                        sub.unsubscribe();
                    } catch (cleanupError) {
                        // Silencioso en limpieza.
                        console.log('[AUTH] Error al limpiar listener:', cleanupError);
                    }
                };
            }
        } catch (subscribeError) {
            // Supabase no disponible.
            console.log('[AUTH] No disponible el listener de auth:', subscribeError);
        }

        const initializeAuth = async () => {
            try {
                console.log('[AUTH] Inicializando autenticación...');
                // getSession() espera obligatoriamente la rehidratación
                // desde AsyncStorage (incluye fallback de lectura directa
                // del token persistido en disco).
                const currentSession = await authService.getSession();

                if (!mounted) return;

                if (currentSession) {
                    setSession(currentSession);
                    setUser(currentSession.user);
                    console.log('[AUTH] Sesión rehidratada para:', currentSession.user?.email);
                } else if (!sawInitialSession) {
                    // No hay sesión ni en memoria ni en disco.
                    setSession(null);
                    setUser(null);
                    console.log('[AUTH] No hay sesión activa');
                }
            } catch (error) {
                // IMPORTANTE: un error aquí NO debe cerrar la sesión. Si el
                // token persiste en disco, INITIAL_SESSION/readPersisted lo
                // repondrá; solo se registra el fallo.
                console.log('[AUTH] Error en inicialización (se conserva la sesión si existe):', error);
            } finally {
                // El cliente ya leyó el storage (getSession aguarda la
                // rehidratación): se puede cerrar la pantalla de carga.
                markReady();
            }
        };

        void initializeAuth();

        // Red de seguridad definitiva: nunca dejar la app bloqueada en
        // carga aunque el cliente tarde demasiado en rehidratar.
        timeoutId = setTimeout(() => {
            console.log('[AUTH] Timeout de inicialización: liberando pantalla de carga');
            markReady();
        }, 5000);

        return () => {
            mounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const signOut = useCallback(async () => {
        console.log('[AUTH] Cerrando sesión...');
        await authService.logout();
        setSession(null);
        setUser(null);
        console.log('[AUTH] Sesión cerrada exitosamente');
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            console.log('[AUTH] Usuario refrescado:', currentUser?.email);
        } catch (error) {
            console.log('[AUTH] Error al refrescar usuario:', error);
        }
    }, []);

    const value: AuthContextType = {
        user,
        session,
        isLoading,
        isInitialized,
        signOut,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}