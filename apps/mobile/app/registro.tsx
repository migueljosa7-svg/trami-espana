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
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { authService } from '@trami-espana/shared';
import { useTheme, ThemeColors } from '../constants/theme';
import { getCurrentLanguage } from '../src/i18n';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_COOLDOWN_SECONDS = 60;
// Deep link de Expo al que apunta el email de activación (capturado en
// app/_layout.tsx y app/auth/callback.tsx para completar la sesión PKCE).
const EMAIL_REDIRECT_URL = Linking.createURL('/auth/callback');

export default function RegisterScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
    const [resendInfo, setResendInfo] = useState<string | null>(null);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const validate = (): string | null => {
        if (!fullName.trim()) return 'Introduce tu nombre para personalizar tu cuenta.';
        if (!email.trim() || !EMAIL_REGEX.test(email.trim()))
            return 'Introduce un email válido (ej. nombre@dominio.com).';
        if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
        if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
        return null;
    };

    const handleRegister = async () => {
        if (loading) return;
        setError(null);
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }
        setLoading(true);
        try {
            // Deep linking de Expo: el email de activación redirige a /auth/callback,
            // capturado en app/_layout.tsx y AuthContext para completar la sesión.
            const { error: registerError, requiresEmailConfirmation } =
                await authService.register({
                    email: email.trim(),
                    password,
                    confirmPassword,
                    fullName: fullName.trim(),
                    emailRedirectTo: EMAIL_REDIRECT_URL,
                    // Idioma seleccionado en la app para que Supabase localice
                    // el email de activación (por defecto 'es').
                    locale: getCurrentLanguage(),
                });
            if (registerError) {
                setError(authService.getErrorMessage(registerError.message));
                return;
            }
            if (requiresEmailConfirmation) {
                // Supabase enviará el email de confirmación. No cerramos la puerta:
                // mostramos instrucciones claras y acceso directo al login.
                setNeedsEmailConfirmation(true);
                return;
            }
            // Registro con sesión inmediata (confirmación de email desactivada).
            router.replace('/(tabs)');
        } catch {
            setError('Error inesperado durante el registro. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const startCooldown = () => {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        const interval = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResendConfirmation = async () => {
        if (resending || cooldown > 0 || !email.trim()) return;
        setResending(true);
        setError(null);
        setResendInfo(null);
        try {
            const { error: resendError } = await authService.resendConfirmation(
                email.trim(),
                EMAIL_REDIRECT_URL
            );
            if (resendError) {
                setError(authService.getErrorMessage(resendError.message));
                return;
            }
            setResendInfo(
                'Hemos reenviado el email de confirmación. Revisa tu bandeja de entrada y la carpeta de Spam/Correo no deseado.'
            );
            startCooldown();
        } catch {
            setError('No se pudo reenviar el email. Inténtalo de nuevo más tarde.');
        } finally {
            setResending(false);
        }
    };

    if (needsEmailConfirmation) {
        return (
            <View style={styles.container}>
                <View style={styles.successCard}>
                    <View style={styles.successIcon}>
                        <Ionicons name="mail-open-outline" size={34} color="#2563eb" />
                    </View>
                    <Text style={styles.successTitle}>¡Revisa tu correo!</Text>
                    <Text style={styles.successText}>
                        Hemos enviado un email de confirmación a{' '}
                        <Text style={styles.successEmail}>{email.trim()}</Text>. Sigue el enlace
                        para activar tu cuenta.
                    </Text>
                    <Text style={styles.successHint}>
                        Revisa tu bandeja de entrada y también la carpeta de Spam o Correo no deseado.
                        Si no lo encuentras en unos minutos, puedes reenviarlo.
                    </Text>
                    {resendInfo && (
                        <View style={styles.resendInfoBox}>
                            <Ionicons name="checkmark-circle" size={18} color="#15803d" />
                            <Text style={styles.resendInfoText}>{resendInfo}</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={[styles.resendButton, (resending || cooldown > 0) && styles.buttonDisabled]}
                        onPress={handleResendConfirmation}
                        disabled={resending || cooldown > 0}
                        activeOpacity={0.85}
                    >
                        {resending ? (
                            <ActivityIndicator color="#2563eb" />
                        ) : (
                            <Text style={styles.resendButtonText}>
                                {cooldown > 0
                                    ? `Reenviar correo de confirmación (${cooldown}s)`
                                    : 'Reenviar correo de confirmación'}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <Link href="/login" asChild>
                        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                            <Text style={styles.primaryButtonText}>Ir a iniciar sesión</Text>
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
                        <Ionicons name="person-add" size={28} color="#ffffff" />
                    </View>
                    <Text style={styles.title}>Crear cuenta</Text>
                    <Text style={styles.subtitle}>
                        Regístrate gratis para guardar favoritos y recordar fechas clave
                    </Text>
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.form}>
                    <Text style={styles.label}>Nombre</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Tu nombre"
                            placeholderTextColor="#94a3b8"
                            value={fullName}
                            onChangeText={setFullName}
                            style={styles.input}
                            autoComplete="name"
                        />
                    </View>

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

                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Mínimo 6 caracteres"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            style={styles.input}
                            autoComplete="new-password"
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

                    <Text style={styles.label}>Confirmar contraseña</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Repite tu contraseña"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            style={styles.input}
                            autoComplete="new-password"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Crear cuenta</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity style={styles.loginLink}>
                            <Text style={styles.loginLinkText}>Iniciar sesión</Text>
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
        marginBottom: 26,
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
    footerText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    loginLink: {
        paddingVertical: 4,
    },
    loginLinkText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
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
        marginBottom: 16,
    },
    resendInfoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: colors.successBackground,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    resendInfoText: {
        flex: 1,
        color: colors.successText,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        width: '100%',
        marginBottom: 12,
    },
    resendButtonText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 14,
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
