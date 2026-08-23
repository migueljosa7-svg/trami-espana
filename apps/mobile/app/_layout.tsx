import { Stack } from 'expo-router';
import { initializeSupabase } from '@trami-espana/shared';

export default function RootLayout() {
    // Inicializar Supabase con las variables de entorno
    if (typeof globalThis !== 'undefined' && !globalThis.__supabaseInitialized) {
        initializeSupabase(
            process.env.EXPO_PUBLIC_SUPABASE_URL || '',
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        globalThis.__supabaseInitialized = true;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
    );
}
