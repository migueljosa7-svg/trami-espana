import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@trami-espana/shared';
import { useTheme, ThemeColors } from '../constants/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleReset = async () => {
        if (loading) return;
        setError(null);
        if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
            setError('Introduce un email válido (ej. nombre@dominio.com).');
            return;
        }
        setLoading(true);
        try {
            const { error: resetError } = await authService.resetPassword(email.trim());
            if (resetError) {
                setError(authService.getErrorMessage(resetError.message));
                return;
            }
            // Por seguridad, Supabase no revela si el email existe: mostramos
            // siempre la confirmación de envío para no dar pistas a terceros.
            setSent(true);
        } catch {
            setError('Error inesperado. Inténtalo de nuevo en unos minutos.');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <View style={styles.container}>
                <View style={styles.successCard}>
                    <View style={styles.successIcon}>
                        <Ionicons name="paper-plane-outline" size={34} color="#2563eb" />
                    </View>
                    <Text style={styles.successTitle}>Email enviado</Text>
                    <Text style={styles.successText}>
                        Si <Text style={styles.successEmail}>{email.trim()}</Text> está registrado,
                        recibirás un enlace para crear una nueva contraseña en unos minutos.
                    </Text>
                    <Text style={styles.successHint}>
                        No olvides revisar la carpeta de spam o publicidad. El enlace caduca a las
                        24 horas.
                    </Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                            <Text style={styles.primaryButtonText}>Volver a iniciar sesión</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="key-outline" size={28} color="#ffffff" />
                    </View>
                    <Text style={styles.title}>Recuperar contraseña</Text>
                    <Text style={styles.subtitle}>
                        Introduce tu email y te enviaremos un enlace para crear una nueva
                        contraseña
                    </Text>
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            placeholder="tu@email.com"
                            placeholderTextColor="#94a3b8"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            style={styles.input}
                            autoComplete="email"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleReset}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Enviar enlace de recuperación</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Link href="/login" asChild>
                        <TouchableOpacity style={styles.backLink}>
                            <Ionicons name="arrow-back" size={16} color="#2563eb" />
                            <Text style={styles.backLinkText}>Volver a iniciar sesión</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 24,
        paddingTop: 72,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 19,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: colors.errorBackground,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    errorText: {
        flex: 1,
        color: colors.errorText,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.text,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    backLinkText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    successCard: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    successIcon: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 10,
    },
    successText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 10,
    },
    successEmail: {
        fontWeight: '700',
        color: colors.text,
    },
    successHint: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 17,
        marginBottom: 22,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 28,
        width: '100%',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
});
