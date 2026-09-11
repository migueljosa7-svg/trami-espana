import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, getSupabaseClient, initializeSupabase } from '@trami-espana/shared';
import { initI18n, getI18nInstance } from '../src/i18n';
import { clearUserCaches, runLocalStorageMigration } from '../src/localCache';
import { ENV, validateEnv } from '../config/env';
import { ThemeProvider, useTheme } from '../constants/theme';
import { AuthProvider } from '../src/context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

// Inicializar i18n y Supabase una única vez en el ciclo de vida de la app.
let i18nReady = false;
function ensureRuntimeInit() {
    if (!i18nReady) {
        try {
            initI18n();
        } catch (e) {
            console.warn('[init] Error inicializando i18n:', e);
        }
        i18nReady = true;
    }
    if (typeof globalThis !== 'undefined' && !globalThis.__supabaseInitialized) {
        try {
            const envErrors = validateEnv();
            if (envErrors.length > 0 && __DEV__) {
                console.warn('[env] Configuración incompleta:', envErrors.join(' '));
            }
            // Persistencia REAL en móvil: AsyncStorage es obligatorio.
            // Sin esto la sesión solo vive en memoria y se pierde al cerrar la app.
            initializeSupabase(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
                storage: AsyncStorage,
            });
        } catch (e) {
            console.warn('[init] Error inicializando Supabase:', e);
        }
        globalThis.__supabaseInitialized = true;
    }
}

// Rehidrata/refresca el token al volver del segundo plano.
// Supabase detiene el auto-refresh en background en nativo; al volver a
// 'active' se reanuda para que auth.uid() vuelva a ser válido y los INSERT
// con RLS (recordatorios/favoritos) no fallen con JWT expirado.
function useSupabaseAutoRefresh() {
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            try {
                const client = getSupabaseClient();
                if (state === 'active') {
                    void client.auth.startAutoRefresh();
                } else {
                    void client.auth.stopAutoRefresh();
                }
            } catch {
                // Supabase aún no inicializado: ignorar.
            }
        });
        return () => subscription.remove();
    }, []);
}

function RootNavigation() {
    const { colors, isDark } = useTheme();
    const [storageReady, setStorageReady] = useState(false);

    useSupabaseAutoRefresh();

    useEffect(() => {
        let mounted = true;
        void runLocalStorageMigration()
            .catch(() => {
                // Nunca debe bloquear el arranque.
            })
            .finally(() => {
                if (mounted) setStorageReady(true);
            });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        try {
            const { data: subscription } = authService.onAuthStateChange((event) => {
                if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
                    void clearUserCaches().catch(() => {
                        // Silencioso: la caché se regenerará.
                    });
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
            // Supabase no disponible: la app funciona sin auth state listener.
            return undefined;
        }
    }, []);

    if (!storageReady) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
            <I18nextProvider i18n={getI18nInstance()}>
                <AuthProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false }} />
                        <Stack.Screen name="registro" options={{ headerShown: false }} />
                        <Stack.Screen name="recuperar-contrasena" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="procedure/[slug]"
                            options={{
                                headerShown: true,
                                title: 'Detalle del trámite',
                                headerBackTitle: 'Atrás',
                            }}
                        />
                        <Stack.Screen name="error" options={{ headerShown: false }} />
                    </Stack>
                </AuthProvider>
            </I18nextProvider>
        </SafeAreaProvider>
    );
}

export default function RootLayout() {
    ensureRuntimeInit();

    return (
        <ErrorBoundary>
            <ThemeProvider>
                <RootNavigation />
            </ThemeProvider>
        </ErrorBoundary>
    );
}
