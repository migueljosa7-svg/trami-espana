import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { getSupabaseClient } from '@trami-espana/shared';
import { useTheme } from '../../constants/theme';

export default function AuthCallbackScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    useEffect(() => {
        let mounted = true;
        const handleUrl = async (url: string | null) => {
            try {
                if (!url) {
                    if (mounted) router.replace('/login?confirmed=true');
                    return;
                }
                const parsed = Linking.parse(url);
                const params = (parsed.queryParams ?? {}) as Record<string, string | undefined>;
                // Supabase PKCE: ?code=... ; implícito legacy: #access_token=...
                const code = params.code;
                if (code) {
                    const client = getSupabaseClient();
                    const { error } = await client.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                    if (mounted) router.replace('/(tabs)');
                    return;
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
                    if (error) throw error;
                    if (mounted) router.replace('/(tabs)');
                    return;
                }
                if (mounted) router.replace('/login?confirmed=true');
            } catch {
                if (mounted) router.replace('/login?confirmed=true');
            }
        };

        void Linking.getInitialURL().then((url) => handleUrl(url));
        const sub = Linking.addEventListener('url', (e) => void handleUrl(e.url));
        const timeout = setTimeout(() => {
            if (mounted) router.replace('/login?confirmed=true');
        }, 12000);
        return () => {
            mounted = false;
            sub.remove();
            clearTimeout(timeout);
        };
    }, [router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.text, { color: colors.textSecondary }]}>
                Confirmando tu cuenta…
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        padding: 24,
    },
    text: {
        fontSize: 15,
        textAlign: 'center',
    },
});
