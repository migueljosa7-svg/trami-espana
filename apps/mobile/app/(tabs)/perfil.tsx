import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService, accountService, LEGAL_DISCLAIMER } from '@trami-espana/shared';
import type { User } from '@supabase/supabase-js';

export default function ProfileScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch {
                // Error controlado.
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSignOut = async () => {
        await authService.logout();
        setUser(null);
    };

    const confirmDeleteAccount = () => {
        Alert.alert(
            'Eliminar cuenta',
            '¿Seguro que quieres eliminar tu cuenta y todos tus datos? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        const result = await accountService.deleteAccount();
                        if (result.error) {
                            setDeleting(false);
                            Alert.alert('Error', 'No se pudo eliminar la cuenta. Inténtalo más tarde o contacta con nosotros.');
                            return;
                        }
                        await authService.logout();
                        setUser(null);
                        setDeleting(false);
                        Alert.alert('Cuenta eliminada', 'Tu cuenta y tus datos se han eliminado.');
                    },
                },
            ]
        );
    };

    const legalItems = [
        { label: 'Política de privacidad', href: '/legal/politica-privacidad', icon: 'shield-checkmark-outline' as const },
        { label: 'Términos y condiciones', href: '/legal/terminos', icon: 'document-text-outline' as const },
        { label: 'Política de cookies', href: '/legal/cookies', icon: 'eye-outline' as const },
        { label: 'Aviso de servicio independiente', href: '/legal/aviso', icon: 'information-circle-outline' as const },
        { label: 'Información sobre datos y privacidad', href: '/legal/datos', icon: 'lock-closed-outline' as const },
        { label: 'Contacto', href: '/legal/contacto', icon: 'mail-outline' as const },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <View style={styles.content}>

                    {/* ===== AUTHENTICATED USER CARD ===== */}
                    {user ? (
                        <View style={styles.profileCard}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(user.email || 'U')[0].toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.name}>{user.user_metadata?.full_name || 'Usuario'}</Text>
                            <Text style={styles.email}>{user.email}</Text>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                <Text style={styles.verifiedText}>Cuenta verificada</Text>
                            </View>
                        </View>
                    ) : (
                        /* ===== GUEST BANNER ===== */
                        <View style={styles.guestCard}>
                            <View style={styles.guestIconContainer}>
                                <Ionicons name="person-outline" size={36} color="#2563eb" />
                            </View>
                            <Text style={styles.guestTitle}>Modo Invitado</Text>
                            <Text style={styles.guestSubtitle}>
                                Inicia sesión para sincronizar tus favoritos y recordar fechas clave de tus trámites.
                            </Text>
                            <View style={styles.guestActions}>
                                <Link href="/login" asChild>
                                    <TouchableOpacity style={styles.loginBtn} activeOpacity={0.85}>
                                        <Ionicons name="log-in-outline" size={18} color="#ffffff" />
                                        <Text style={styles.loginBtnText}>Iniciar sesión</Text>
                                    </TouchableOpacity>
                                </Link>
                                <Link href="/login" asChild>
                                    <TouchableOpacity style={styles.registerBtn} activeOpacity={0.85}>
                                        <Text style={styles.registerBtnText}>Registrarse</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    )}

                    {/* ===== QUICK STATS (Authenticated only) ===== */}
                    {user && (
                        <View style={styles.statsRow}>
                            <Link href="/(tabs)/favoritos" asChild>
                                <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                                    <Ionicons name="heart" size={22} color="#ef4444" />
                                    <Text style={styles.statLabel}>Favoritos</Text>
                                </TouchableOpacity>
                            </Link>
                            <Link href="/(tabs)/recordatorios" asChild>
                                <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                                    <Ionicons name="notifications" size={22} color="#f59e0b" />
                                    <Text style={styles.statLabel}>Recordatorios</Text>
                                </TouchableOpacity>
                            </Link>
                            <Link href="/(tabs)/asistente" asChild>
                                <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                                    <Ionicons name="chatbubbles" size={22} color="#2563eb" />
                                    <Text style={styles.statLabel}>Asistente</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    )}

                    {/* ===== LEGAL SECTION ===== */}
                    <Text style={styles.sectionTitle}>Legal y privacidad</Text>
                    <View style={styles.menuCard}>
                        {legalItems.map((item, index) => (
                            <Link key={item.href} href={item.href} asChild>
                                <TouchableOpacity
                                    style={[
                                        styles.menuRow,
                                        index < legalItems.length - 1 && styles.menuRowBorder,
                                    ]}
                                    accessibilityRole="button"
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.menuRowLeft}>
                                        <Ionicons name={item.icon} size={18} color="#64748b" style={styles.menuIcon} />
                                        <Text style={styles.menuLabel}>{item.label}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>

                    {/* ===== ACCOUNT ACTIONS (Authenticated) ===== */}
                    {user && (
                        <>
                            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
                                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                                <Text style={styles.signOutText}>Cerrar sesión</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={confirmDeleteAccount}
                                disabled={deleting}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                                <Text style={styles.deleteText}>
                                    {deleting ? 'Eliminando...' : 'Eliminar cuenta'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            {/* Footer */}
            <View style={styles.footerLegal}>
                <View style={styles.footerDivider} />
                <Text style={styles.legalText}>{LEGAL_DISCLAIMER}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        paddingBottom: 48,
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    center: {
        padding: 48,
        alignItems: 'center',
    },
    content: {
        padding: 16,
    },

    // Authenticated profile card
    profileCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 30,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    email: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    verifiedText: {
        fontSize: 12,
        color: '#15803d',
        fontWeight: '600',
    },

    // Guest banner
    guestCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    guestIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#bfdbfe',
    },
    guestTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    guestSubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    guestActions: {
        width: '100%',
        gap: 10,
    },
    loginBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 14,
    },
    loginBtnText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
    registerBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 13,
        borderWidth: 1.5,
        borderColor: '#2563eb',
    },
    registerBtnText: {
        color: '#2563eb',
        fontWeight: '700',
        fontSize: 15,
    },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },

    // Legal section
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    menuCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 20,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 16,
    },
    menuRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    menuRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIcon: {
        marginRight: 12,
    },
    menuLabel: {
        fontSize: 15,
        color: '#0f172a',
        flex: 1,
    },

    // Account buttons
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ef4444',
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 12,
    },
    signOutText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fee2e2',
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    deleteText: {
        color: '#b91c1c',
        fontWeight: '600',
        fontSize: 15,
    },

    // Footer
    footerLegal: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        alignItems: 'center',
    },
    footerDivider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        width: '100%',
        marginBottom: 16,
    },
    legalText: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 16,
    },
});
