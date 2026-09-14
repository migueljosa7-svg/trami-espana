import { useState, useEffect } from 'react';
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
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { authService, isEmailNotConfirmedError } from '@trami-espana/shared';
import { clearUserCaches } from '../src/localCache';
import { useTheme, ThemeColors } from '../constants/theme';

// Deep link de Expo al que apunta el email de activación (misma URL que el registro).
const EMAIL_REDIRECT_URL = Linking.createURL('/auth/callback');

export default function LoginScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const params = useLocalSearchParams<{ confirmed?: string }>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
    const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

    // Aviso de confirmación de email tras volver desde el enlace del correo.
    useEffect(() => {
        if (params.confirmed === 'true') {
            setConfirmationNotice(
                '¡Email confirmado con éxito! Ya puedes iniciar sesión con tu cuenta.'
            );
        }
    }, [params.confirmed]);

    const handleLogin = async () => {
        if (!email.trim() || !password || loading) return;
        setLoading(true);
        setError(null);
        setEmailNotConfirmed(false);
        setConfirmationNotice(null);
        try {
            const { error: loginError } = await authService.login({
                email: email.trim(),
                password,
            });
            if (loginError) {
                setError(authService.getErrorMessage(loginError.message));
                setEmailNotConfirmed(isEmailNotConfirmedError(loginError));
                return;
            }
            // Aislamiento estricto: al iniciar sesión se descarta cualquier
            // caché local previa para cargar SOLO los datos del usuario autenticado.
            await clearUserCaches();
            // Autenticado → entrar a la app (tab principal)
            router.replace('/(tabs)');
        } catch {
            setError('Error inesperado al iniciar sesión. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendConfirmation = async () => {
        if (!email.trim() || resending) return;
        setResending(true);
        setError(null);
        try {
            const { error: resendError } = await authService.resendConfirmation(
            email.trim(),
            EMAIL_REDIRECT_URL
        );
            if (resendError) {
                setError(authService.getErrorMessage(resendError.message));
                return;
            }
            setConfirmationNotice(
                'Hemos reenviado el email de confirmación. Revisa tu bandeja de entrada (y la carpeta de spam).'
            );
        } catch {
            setError('No se pudo reenviar el email. Inténtalo de nuevo más tarde.');
        } finally {
            setResending(false);
        }
    };

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
                        <Ionicons name="document-text" size={30} color="#ffffff" />
                    </View>
                    <Text style={styles.title}>Iniciar sesión</Text>
                    <Text style={styles.subtitle}>
                        Accede con tu email y contraseña para sincronizar favoritos y recordatorios
                    </Text>
                </View>

                {confirmationNotice && (
                    <View style={styles.successBox}>
                        <Ionicons name="checkmark-circle" size={18} color="#15803d" />
                        <Text style={styles.successText}>{confirmationNotice}</Text>
                    </View>
                )}

                {error && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {emailNotConfirmed && (
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleResendConfirmation}
                        disabled={resending}
                        activeOpacity={0.8}
                    >
                        {resending ? (
                            <ActivityIndicator size="small" color="#2563eb" />
                        ) : (
                            <>
                                <Ionicons name="mail-outline" size={16} color="#2563eb" />
                                <Text style={styles.resendButtonText}>
                                    Reenviar email de confirmación
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
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
                            testID="input-email"
                        />
                    </View>

                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Tu contraseña"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            style={styles.input}
                            autoComplete="password"
                            testID="input-password"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword((v) => !v)}
                            style={styles.eyeButton}
                            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#94a3b8"
                            />
                        </TouchableOpacity>
                    </View>

                    <Link href="/recuperar-contrasena" asChild>
                        <TouchableOpacity style={styles.forgotButton}>
                            <Text style={styles.forgotButtonText}>¿Olvidaste tu contraseña?</Text>
                        </TouchableOpacity>
                    </Link>

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

                <View style={styles.footer}>
                    <Text style={styles.footerText}>¿No tienes cuenta todavía?</Text>
                    <Link href="/registro" asChild>
                        <TouchableOpacity style={styles.registerLink}>
                            <Text style={styles.registerLinkText}>Crear una cuenta</Text>
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
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        paddingTop: 56,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 19,
    },
    successBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: colors.successBackground,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    successText: {
        flex: 1,
        color: colors.successText,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
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
        marginBottom: 12,
    },
    errorText: {
        flex: 1,
        color: colors.errorText,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 11,
        marginBottom: 12,
    },
    resendButtonText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 13,
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
        marginBottom: 14,
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
    eyeButton: {
        padding: 4,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        paddingVertical: 2,
        marginBottom: 14,
    },
    forgotButtonText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
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
        marginTop: 28,
    },
    footerText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    registerLink: {
        paddingVertical: 4,
    },
    registerLinkText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});
