import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
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
    const router = useRouter();
    const [storageReady, setStorageReady] = useState(false);

    useSupabaseAutoRefresh();

    // Captura del deep link de confirmación de Supabase (tramiespana:///auth/callback?code=...).
    // Sin esto, al pulsar el enlace del email el SO abre la app pero la sesión PKCE
    // nunca se intercambia y el usuario queda sin autenticar.
    useEffect(() => {
        const handleDeepLink = async (url: string | null) => {
            if (!url) return;
            try {
                const parsed = Linking.parse(url);
                const path = (parsed.path ?? '').replace(/^\/+/, '');
                if (path !== 'auth/callback' && path !== 'login' && !url.includes('auth/callback')) {
                    return;
                }
                const params = (parsed.queryParams ?? {}) as Record<string, string | undefined>;
                const code = params.code;
                if (code) {
                    const client = getSupabaseClient();
                    const { error } = await client.auth.exchangeCodeForSession(code);
                    if (!error) {
                        router.replace('/(tabs)');
                        return;
                    }
                }
                const hashParams = new URLSearchParams(url.split('#')[1] ?? '');
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                if (accessToken && refreshToken) {
                    const client = getSupabaseClient();
                    const { error } = await client.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (!error) {
                        router.replace('/(tabs)');
                        return;
                    }
                }
                router.replace('/login?confirmed=true');
            } catch {
                router.replace('/login?confirmed=true');
            }
        };
        void Linking.getInitialURL().then((url) => handleDeepLink(url));
        const sub = Linking.addEventListener('url', (e) => void handleDeepLink(e.url));
        return () => sub.remove();
    }, [router]);

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
                    <Stack screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.background },
                        headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
                        headerTintColor: isDark ? '#FFFFFF' : '#0F172A',
                        headerTitleStyle: {
                            color: isDark ? '#FFFFFF' : '#0F172A',
                            fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System', default: 'System' }),
                            fontWeight: '600',
                        },
                    }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false }} />
                        <Stack.Screen name="registro" options={{ headerShown: false }} />
                        <Stack.Screen name="recuperar-contrasena" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="procedure/[slug]"
                            options={{
                                headerShown: true,
                                title: 'Detalle del trámite',
                                headerBackTitle: 'Atrás',
                                // Tema oscuro total: la cabecera superior ("Detalle
                                // del trámite") y la flecha de regreso ya no quedan
                                // con fondo blanco en modo oscuro.
                                headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
                                headerTintColor: isDark ? '#FFFFFF' : '#0F172A',
                                headerTitleStyle: {
                            color: isDark ? '#FFFFFF' : '#0F172A',
                            fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System', default: 'System' }),
                            fontWeight: '600',
                        },
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
