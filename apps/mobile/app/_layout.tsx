import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { authService, initializeSupabase } from '@trami-espana/shared';
import { initI18n, getI18nInstance } from '../src/i18n';
import { clearUserCaches } from '../src/localCache';

// Inicializar i18n y Supabase una única vez en el ciclo de vida de la app.
let i18nReady = false;
function ensureRuntimeInit() {
    if (!i18nReady) {
        initI18n();
        i18nReady = true;
    }
    if (typeof globalThis !== 'undefined' && !globalThis.__supabaseInitialized) {
        initializeSupabase(
            process.env.EXPO_PUBLIC_SUPABASE_URL || '',
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        globalThis.__supabaseInitialized = true;
    }
}

export default function RootLayout() {
    ensureRuntimeInit();

    useEffect(() => {
        const { data: subscription } = authService.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
                void clearUserCaches();
            }
        });

        return () => subscription.subscription.unsubscribe();
    }, []);

    return (
        <>
            {/*
                SafeAreaProvider garantiza compatibilidad edge-to-edge (Android 15/16,
                iOS notch, barras de sistema y gestos) sin que la UI se superponga
                con las barras del sistema.
            */}
            <SafeAreaProvider>
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
        </>
    );
}
