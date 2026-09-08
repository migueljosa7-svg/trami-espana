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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { authService, accountService, LEGAL_DISCLAIMER } from '@trami-espana/shared';
import ExitAppModal from '../../components/ExitAppModal';
import {
    changeLanguage,
    getCurrentLanguage,
    isRTLLanguage,
    SUPPORTED_LANGUAGES,
    type AppLanguage,
} from '../../src/i18n';
import { clearUserCaches } from '../../src/localCache';
import { useAppTheme, type ThemePreference } from '../../constants/theme';
import type { User } from '@supabase/supabase-js';

export default function ProfileScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    // Tema dinámico (sistema/claro/oscuro) de constants/theme.ts
    const { colors, preference, setPreference } = useAppTheme();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [exitVisible, setExitVisible] = useState(false);
    const [language, setLanguage] = useState(getCurrentLanguage());

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

    const handleSwitchLanguage = (lang: AppLanguage) => {
        if (lang === language) return;
        const wasRTL = isRTLLanguage(language);
        changeLanguage(lang);
        setLanguage(lang);
        // Los idiomas RTL (árabe) requieren reinicio para reordenar el layout.
        if (isRTLLanguage(lang) !== wasRTL) {
            Alert.alert(t('profile.rtlNoticeTitle'), t('profile.rtlNoticeMsg'));
        }
    };

    const handleSignOut = async () => {
        // Aislamiento estricto: al cerrar sesión se purgan de inmediato la
        // caché local de favoritos y recordatorios (AsyncStorage) para que un
        // usuario invitado o distinto no vea datos de una sesión anterior.
        await clearUserCaches();
        await authService.logout();
        setUser(null);
    };

    const confirmDeleteAccount = () => {
        Alert.alert(
            t('profile.auth.deleteAccount'),
            t('profile.auth.deleteAccountConfirm'),
            [
                { text: t('profile.auth.cancel'), style: 'cancel' },
                {
                    text: t('profile.auth.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        const result = await accountService.deleteAccount();
                        if (result.error) {
                            setDeleting(false);
                            Alert.alert(t('common.error'), t('profile.auth.deleteAccountError'));
                            return;
                        }
                        // Purga de la caché local antes de cerrar sesión.
                        await clearUserCaches();
                        await authService.logout();
                        setUser(null);
                        setDeleting(false);
                        Alert.alert(t('profile.auth.accountDeleted'), t('profile.auth.accountDeletedMsg'));
                    },
                },
            ]
        );
    };

    const legalItems = [
        { label: t('profile.legalItems.privacy'), href: '/legal/politica-privacidad', icon: 'shield-checkmark-outline' as const },
        { label: t('profile.legalItems.terms'), href: '/legal/terminos', icon: 'document-text-outline' as const },
        { label: t('profile.legalItems.cookies'), href: '/legal/cookies', icon: 'eye-outline' as const },
        { label: t('profile.legalItems.disclaimer'), href: '/legal/aviso', icon: 'information-circle-outline' as const },
        { label: t('profile.legalItems.data'), href: '/legal/datos', icon: 'lock-closed-outline' as const },
        { label: t('profile.legalItems.contact'), href: '/legal/contacto', icon: 'mail-outline' as const },
    ];

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
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
                                <Text style={styles.verifiedText}>{t('profile.verified')}</Text>
                            </View>
                        </View>
                    ) : (
                        /* ===== GUEST BANNER ===== */
                        <View style={styles.guestCard}>
                            <View style={styles.guestIconContainer}>
                                <Ionicons name="person-outline" size={36} color="#2563eb" />
                            </View>
                            <Text style={styles.guestTitle}>{t('profile.guest.title')}</Text>
                            <Text style={styles.guestSubtitle}>
                                {t('profile.guest.subtitle')}
                            </Text>
                            <View style={styles.guestActions}>
                                <Link href="/login" asChild>
                                    <TouchableOpacity style={styles.loginBtn} activeOpacity={0.85}>
                                        <Ionicons name="log-in-outline" size={18} color="#ffffff" />
                                        <Text style={styles.loginBtnText}>{t('profile.guest.login')}</Text>
                                    </TouchableOpacity>
                                </Link>
                                <Link href="/registro" asChild>
                                    <TouchableOpacity style={styles.registerBtn} activeOpacity={0.85}>
                                        <Text style={styles.registerBtnText}>{t('profile.guest.register')}</Text>
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
                                    <Text style={styles.statLabel}>{t('profile.stats.favorites')}</Text>
                                </TouchableOpacity>
                            </Link>
                            <Link href="/(tabs)/recordatorios" asChild>
                                <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                                    <Ionicons name="notifications" size={22} color="#f59e0b" />
                                    <Text style={styles.statLabel}>{t('profile.stats.reminders')}</Text>
                                </TouchableOpacity>
                            </Link>
                            <Link href="/(tabs)/asistente" asChild>
                                <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
                                    <Ionicons name="chatbubbles" size={22} color="#2563eb" />
                                    <Text style={styles.statLabel}>{t('profile.stats.assistant')}</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    )}

                    {/* ===== LEGAL SECTION ===== */}
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('profile.sections.legal')}</Text>
                    <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                                        <Text style={[styles.menuLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{item.label}</Text>
                                    </View>
                                    <View style={styles.menuChevron}>
                                        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                                    </View>
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>

                    {/* ===== LANGUAGES SECTION (all users) ===== */}
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('profile.language')}</Text>
                    <Text style={styles.languageSubtitle}>{t('profile.languageSubtitle')}</Text>

                    {/* Idiomas nacionales y regionales de España */}
                    <Text style={styles.languageGroupTitle}>{t('profile.languageSpain')}</Text>
                    <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {SUPPORTED_LANGUAGES.filter((lang) => lang.group === 'spain').map((lang, index, arr) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.menuRow,
                                    index < arr.length - 1 && styles.menuRowBorder,
                                ]}
                                onPress={() => handleSwitchLanguage(lang.code)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`${lang.flag} ${lang.label}`}
                            >
                                <View style={styles.menuRowLeft}>
                                    <Text style={styles.langFlag}>{lang.flag}</Text>
                                    <Text style={[styles.menuLabel, { color: colors.text }]}>{lang.label}</Text>
                                </View>
                                {language === lang.code && (
                                    <Ionicons name="checkmark" size={18} color="#2563eb" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Comunidades extranjeras residentes en España */}
                    <Text style={styles.languageGroupTitle}>{t('profile.languageInternational')}</Text>
                    <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {SUPPORTED_LANGUAGES.filter((lang) => lang.group === 'international').map((lang, index, arr) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.menuRow,
                                    index < arr.length - 1 && styles.menuRowBorder,
                                ]}
                                onPress={() => handleSwitchLanguage(lang.code)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`${lang.flag} ${lang.label}`}
                            >
                                <View style={styles.menuRowLeft}>
                                    <Text style={styles.langFlag}>{lang.flag}</Text>
                                    <Text style={[styles.menuLabel, { color: colors.text }]}>{lang.label}</Text>
                                </View>
                                {language === lang.code && (
                                    <Ionicons name="checkmark" size={18} color="#2563eb" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ===== APPEARANCE SECTION (tema) ===== */}
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('profile.sections.appearance')}</Text>
                    <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {([
                            { key: 'system' as ThemePreference, label: t('profile.themeSystem'), icon: 'contrast-outline' as const },
                            { key: 'light' as ThemePreference, label: t('profile.themeLight'), icon: 'sunny-outline' as const },
                            { key: 'dark' as ThemePreference, label: t('profile.themeDark'), icon: 'moon-outline' as const },
                        ]).map((option, index, arr) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.menuRow,
                                    index < arr.length - 1 && styles.menuRowBorder,
                                ]}
                                onPress={() => setPreference(option.key)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={option.label}
                            >
                                <View style={styles.menuRowLeft}>
                                    <Ionicons name={option.icon} size={18} color="#64748b" style={styles.menuIcon} />
                                    <Text style={[styles.menuLabel, { color: colors.text }]}>{option.label}</Text>
                                </View>
                                {preference === option.key && (
                                    <Ionicons name="checkmark" size={18} color="#2563eb" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ===== ACCOUNT ACTIONS (Authenticated) ===== */}
                    {user && (
                        <>
                            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
                                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                                <Text style={styles.signOutText}>{t('profile.auth.signOutConfirm')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={confirmDeleteAccount}
                                disabled={deleting}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                                <Text style={styles.deleteText}>
                                    {deleting ? t('profile.auth.signOut') : t('profile.auth.deleteAccount')}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ===== APP SECTION (all users) ===== */}
                    <Text style={styles.sectionTitle}>{t('profile.sections.app')}</Text>
                    <TouchableOpacity
                        style={styles.exitAppButton}
                        onPress={() => setExitVisible(true)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={t('profile.appSection.exitApp')}
                    >
                        <Ionicons name="exit-outline" size={18} color="#334155" />
                        <Text style={styles.exitAppText}>{t('profile.appSection.exitApp')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Footer */}
            <View style={styles.footerLegal}>
                <View style={styles.footerDivider} />
                <Text style={styles.legalText}>{LEGAL_DISCLAIMER}</Text>
            </View>

            {/* Modal de confirmación de salida */}
            <ExitAppModal visible={exitVisible} onClose={() => setExitVisible(false)} />
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
    // Flecha que cierra cada fila del menú: se mantiene siempre en la misma
    // línea a la derecha del texto gracias a flexDirection row + space-between
    // en menuRow y a que este contenedor no se encoge ni envuelve.
    menuChevron: {
        flexShrink: 0,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Selector de idioma
    langFlag: {
        fontSize: 16,
        marginRight: 12,
    },
    languageSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 12,
    },
    languageGroupTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563eb',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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

    // Exit app
    exitAppButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        marginBottom: 12,
    },
    exitAppText: {
        color: '#334155',
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
