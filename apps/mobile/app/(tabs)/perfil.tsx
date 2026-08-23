import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Link } from 'expo-router';
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
        { label: 'Política de privacidad', href: '/legal/politica-privacidad' },
        { label: 'Términos y condiciones', href: '/legal/terminos' },
        { label: 'Política de cookies', href: '/legal/cookies' },
        { label: 'Aviso de servicio independiente', href: '/legal/aviso' },
        { label: 'Información sobre datos y privacidad', href: '/legal/datos' },
        { label: 'Contacto', href: '/legal/contacto' },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <View style={styles.content}>
                    {user ? (
                        <View style={styles.profileCard}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(user.email || 'U')[0].toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.name}>{user.user_metadata?.full_name || 'Usuario'}</Text>
                            <Text style={styles.email}>{user.email}</Text>
                        </View>
                    ) : (
                        <View style={styles.guestContent}>
                            <Text style={styles.guestTitle}>Modo Invitado</Text>
                            <Text style={styles.guestSubtitle}>
                                Inicia sesión para sincronizar tus favoritos y recordar fechas clave de tus trámites.
                                Las secciones legales están disponibles para todos.
                            </Text>
                        </View>
                    )}

                    {/* Legal y privacidad */}
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
                                >
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuChevron}>›</Text>
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>

                    {user ? (
                        <>
                            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                                <Text style={styles.signOutText}>Cerrar sesión</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={confirmDeleteAccount}
                                disabled={deleting}
                            >
                                <Text style={styles.deleteText}>
                                    {deleting ? 'Eliminando...' : 'Eliminar cuenta'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : null}
                </View>
            )}

            <View style={styles.footerLegal}>
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
        paddingBottom: 40,
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
        fontSize: 20,
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
    profileCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 20,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    email: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    guestContent: {
        padding: 24,
        alignItems: 'center',
        marginBottom: 8,
    },
    guestTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    guestSubtitle: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 10,
    },
    menuCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
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
    menuLabel: {
        fontSize: 15,
        color: '#0f172a',
    },
    menuChevron: {
        fontSize: 20,
        color: '#94a3b8',
    },
    signOutButton: {
        backgroundColor: '#ef4444',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    signOutText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 15,
    },
    deleteButton: {
        backgroundColor: '#fee2e2',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    deleteText: {
        color: '#b91c1c',
        fontWeight: '600',
        fontSize: 15,
    },
    footerLegal: {
        padding: 16,
        alignItems: 'center',
    },
    legalText: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center',
    },
});

