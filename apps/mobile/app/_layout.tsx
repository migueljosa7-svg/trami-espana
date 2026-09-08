import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { authService, initializeSupabase } from '@trami-espana/shared';
import { initI18n, getI18nInstance } from '../src/i18n';
import { clearUserCaches } from '../src/localCache';
import { ENV, validateEnv } from '../config/env';
import { useAppTheme } from '../constants/theme';
import ErrorBoundary from '../components/ErrorBoundary';

// Inicializar i18n y Supabase una única vez en el ciclo de vida de la app.
let i18nReady = false;
function ensureRuntimeInit() {
    if (!i18nReady) {
        initI18n();
        i18nReady = true;
    }
    if (typeof globalThis !== 'undefined' && !globalThis.__supabaseInitialized) {
        // Variables de entorno centralizadas en config/env.ts
        const envErrors = validateEnv();
        if (envErrors.length > 0 && __DEV__) {
            console.warn('[env] Configuración incompleta:', envErrors.join(' '));
        }
        initializeSupabase(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
        globalThis.__supabaseInitialized = true;
    }
}

export default function RootLayout() {
    ensureRuntimeInit();
    // Tema dinámico: sigue useColorScheme() del sistema o la preferencia
    // guardada por el usuario (constants/theme.ts).
    const { colors, isDark } = useAppTheme();

    useEffect(() => {
        const { data: subscription } = authService.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
                void clearUserCaches();
            }
        });

        return () => subscription.subscription.unsubscribe();
    }, []);

    return (
        <ErrorBoundary>
            {/*
                SafeAreaProvider garantiza compatibilidad edge-to-edge (Android 15/16,
                iOS notch, barras de sistema y gestos) sin que la UI se superponga
                con las barras del sistema. ErrorBoundary lo envuelve todo para
                capturar cualquier fallo de render sin cierres inesperados.
            */}
            <SafeAreaProvider>
                <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
                <I18nextProvider i18n={getI18nInstance()}>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="login"
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="registro"
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="recuperar-contrasena"
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="procedure/[slug]"
                            options={{
                                headerShown: true,
                                title: 'Detalle del trámite',
                                headerBackTitle: 'Atrás'
                            }}
                        />
                        <Stack.Screen
                            name="error"
                            options={{
                                headerShown: false
                            }}
                        />
                    </Stack>
                </I18nextProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
