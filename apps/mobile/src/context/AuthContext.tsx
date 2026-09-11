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

    // Rehidratación de sesión al arrancar la app
    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                console.log('[AUTH] Inicializando autenticación...');
                
                // Verificar si hay una sesión activa en Supabase
                const currentSession = await authService.getSession();
                
                if (mounted) {
                    if (currentSession) {
                        setSession(currentSession);
                        setUser(currentSession.user);
                        console.log('[AUTH] Sesión rehidratada para:', currentSession.user?.email);
                    } else {
                        setSession(null);
                        setUser(null);
                        console.log('[AUTH] No hay sesión activa');
                    }
                }
            } catch (error) {
                console.log('[AUTH] Error en inicialización:', error);
                if (mounted) {
                    setSession(null);
                    setUser(null);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    setIsInitialized(true);
                    console.log('[AUTH] Inicialización completada');
                }
            }
        };

        initializeAuth();

        return () => {
            mounted = false;
        };
    }, []);

    // Listener de cambios en el estado de autenticación
    useEffect(() => {
        try {
            const { data: subscription } = authService.onAuthStateChange((event, currentSession) => {
                console.log('[AUTH] Cambio de estado:', event);
                
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    setSession(currentSession);
                    setUser(currentSession?.user ?? null);
                    console.log('[AUTH] Usuario actualizado:', currentSession?.user?.email);
                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    console.log('[AUTH] Sesión cerrada');
                }
            });

            return () => {
                try {
                    subscription.subscription.unsubscribe();
                } catch {
                    // Silencioso en limpieza.
                }
            };
        } catch {
            // Supabase no disponible.
            console.log('[AUTH] No disponible el listener de auth');
        }
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