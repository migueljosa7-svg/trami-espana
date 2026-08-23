import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '@trami-espana/shared';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email || !password || loading) return;
        setLoading(true);
        setError(null);
        try {
            const { error: loginError } =
                await authService.login({ email, password });
            if (loginError) {
                setError(loginError.message);
                return;
            }
            // Autenticado → entrar a la app (tab principal)
            router.replace('/(tabs)');
        } catch {
            setError('Error inesperado al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>
                Accede con tu email y contraseña para continuar
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TextInput
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoComplete="email"
                testID="input-email"
            />
            <TextInput
                placeholder="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                autoComplete="password"
                testID="input-password"
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                testID="button-login"
            >
                {loading ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.buttonText}>Entrar</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 24,
    },
    error: {
        color: '#dc2626',
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 15,
    },
});
