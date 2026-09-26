import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { accountService, LEGAL_DISCLAIMER } from '@trami-espana/shared';
import {
    changeLanguage,
    getCurrentLanguage,
    isRTLLanguage,
    SUPPORTED_LANGUAGES,
    type AppLanguage,
} from '../../src/i18n';
import { clearUserCaches } from '../../src/localCache';
import { useTheme, type ThemeColors, type ThemePreference } from '../../constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useExitModal } from '../../src/context/ExitModalContext';
import { useExitBackHandler } from '../../src/hooks/useBackHandler';

export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    // Tema dinámico (sistema/claro/oscuro) de constants/theme
    const { colors, preference, setPreference } = useTheme();
    const styles = getStyles(colors);
    const { user, isLoading, signOut: authSignOut } = useAuth();
    const { setShowExitModal } = useExitModal();
    const [deleting, setDeleting] = useState(false);
    // Idioma reactivo: se actualiza con i18n.language para forzar re-render
    const [language, setLanguage] = useState<AppLanguage>(
        (i18n.language as AppLanguage) || getCurrentLanguage()
    );

    // Sincronizar el estado local con el idioma activo de i18n
    useEffect(() => {
        const handleLanguageChanged = (lng: string) => {
            setLanguage(lng as AppLanguage);
        };
        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n]);

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
    // Variables derivadas del idioma actual para el selector compacto (Item 4, v1.2.7)
    const currentLangDef = SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? {
        flag: '🇪🇸',
        label: t('profile.languageSpain') ?? 'Español',
        code: language,
        group: 'spain' as const,
    };
    // ============================================================
    // Intercepta el botón atrás de Android en la pestaña raíz.
    // ============================================================
    useExitBackHandler(useCallback(() => setShowExitModal(true), [setShowExitModal]));

    const currentLangLabel = currentLangDef.label;
    const currentLangFlag = currentLangDef.flag;
    const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);



    const handleSignOut = async () => {
        Alert.alert(
            t('profile.logoutConfirmTitle'),
            t('profile.logoutConfirmMsg'),
            [
                { text: t('profile.auth.cancel'), style: 'cancel' },
                {
                    text: t('profile.auth.signOutConfirm'),
                    style: 'destructive',
                    onPress: async () => {
                        // Aislamiento estricto: al cerrar sesión se purgan de inmediato la
                        // caché local de favoritos y recordatorios (AsyncStorage) para que un
                        // usuario invitado o distinto no vea datos de una sesión anterior.
                        try {
                            await clearUserCaches();
                            await authSignOut();
                        } catch {
                            // Nunca bloquear la redirección por un fallo de purga local.
                        }
                        // Redirigir al login. replace() no requiere canGoBack().
                        router.replace('/login');
                    },
                },
            ]
        );
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
                        await authSignOut();
                        setDeleting(false);
                        Alert.alert(t('profile.auth.accountDeleted'), t('profile.auth.accountDeletedMsg'));
                        router.replace('/login');
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

    // ============================================================
    // KILLER FEATURES v1.3.1: accesos directos a las tres
    // funcionalidades diferenciales desde el Perfil.
    // ============================================================
    const TOOL_ITEMS = [
        {
            label: t('profile.tools.carpeta'),
            subtitle: t('profile.tools.carpetaSub'),
            href: '/mi-carpeta' as const,
            icon: 'folder-open-outline',
            color: '#f59e0b',
        },
        {
            label: t('profile.tools.fees'),
            subtitle: t('profile.tools.feesSub'),
            href: '/tasas' as const,
            icon: 'pricetag-outline',
            color: '#10b981',
        },
        {
            label: t('profile.tools.identity'),
            subtitle: t('profile.tools.identitySub'),
            href: '/guia-identidad' as const,
            icon: 'key-outline',
            color: '#8b5cf6',
        },
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

                    {/* ===== KILLER FEATURES v1.3.1 =====
                        Accesos directos a las tres funcionalidades diferenciales. */}
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                        {t('profile.sections.tools')}
                    </Text>
                    <View style={styles.toolsList}>
                        {TOOL_ITEMS.map((tool) => (
                            <Link key={tool.href} href={tool.href} asChild>
                                <TouchableOpacity
                                    style={[
                                        styles.toolCard,
                                        {
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                    activeOpacity={0.8}
                                    accessibilityRole="link"
                                    accessibilityLabel={tool.label}
                                >
                                    <View
                                        style={[
                                            styles.toolIcon,
                                            { backgroundColor: `${tool.color}1A` },
                                        ]}
                                    >
                                        <Ionicons
                                            name={tool.icon as never}
                                            size={20}
                                            color={tool.color}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.toolTitle, { color: colors.text }]}>
                                            {tool.label}
                                        </Text>
                                        <Text
                                            style={[styles.toolSubtitle, { color: colors.textSecondary }]}
                                            numberOfLines={2}
                                        >
                                            {tool.subtitle}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={18}
                                        color={colors.textMuted}
                                    />
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>

                    {/* ===== LEGAL SECTION (enlaces en línea, centrados) ===== */}
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('profile.sections.legal')}</Text>
                    <View style={[styles.legalChipsWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {legalItems.map((item) => (
                            <Link key={item.href} href={item.href} asChild>
                                <TouchableOpacity
                                    style={[styles.legalChip, { backgroundColor: colors.chip, borderColor: colors.border }]}
                                    activeOpacity={0.7}
                                    accessibilityRole="link"
                                    accessibilityLabel={item.label}
                                >
                                    <Ionicons name={item.icon} size={14} color={colors.primary} />
                                    <Text style={[styles.legalChipText, { color: colors.text }]} numberOfLines={1}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>

                    {/* ===== LANGUAGES SECTION (all users) ===== */}
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('profile.language')}</Text>
                    <Text style={styles.languageSubtitle}>{t('profile.languageSubtitle')}</Text>

                    {/* Selector compacto de idioma (toca para abrir modal de selección) */}
                    <TouchableOpacity
                        style={styles.languagePickerButton}
                        onPress={() => setShowLanguageModal(true)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={t('profile.languagePicker') ?? `Idioma actual: ${currentLangLabel}`}
                    >
                        <View style={styles.languagePickerLeft}>
                            <Text style={styles.languagePickerFlag}>{currentLangFlag}</Text>
                            <View>
                                <Text style={[styles.languagePickerLabel, { color: colors.text }]} numberOfLines={1}>
                                    {currentLangLabel}
                                </Text>
                                <Text style={[styles.languagePickerSub, { color: colors.textMuted }]}>
                                    {language === i18n.language ? t('profile.languageCurrent') : t('profile.languageTapToChange')}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.languagePickerChevron} />
                    </TouchableOpacity>

                    {/* Modal de selección de idioma */}
                    <Modal
                        visible={showLanguageModal}
                        transparent
                        animationType="fade"
                        statusBarTranslucent
                        onRequestClose={() => setShowLanguageModal(false)}
                    >
                        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
                            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                                        {t('profile.languagePicker') ?? 'Seleccionar idioma'}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowLanguageModal(false)}
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('common.close') ?? 'Cerrar'}
                                    >
                                        <Ionicons name="close-outline" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    style={styles.modalContent}
                                    contentContainerStyle={styles.modalContentPadding}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* Idiomas nacionales y regionales de España */}
                                    <Text style={[styles.languageGroupTitle, { color: colors.primary }]}>
                                        {t('profile.languageSpain')}
                                    </Text>
                                    {SUPPORTED_LANGUAGES.filter((lang) => lang.group === 'spain').map((lang) => (
                                        <TouchableOpacity
                                            key={lang.code}
                                            style={[
                                                styles.modalLangRow,
                                                { backgroundColor: colors.chip },
                                                language === lang.code && styles.modalLangRowActive,
                                            ]}
                                            onPress={() => {
                                                handleSwitchLanguage(lang.code);
                                                setShowLanguageModal(false);
                                            }}
                                            activeOpacity={0.75}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${lang.flag} ${lang.label}${language === lang.code ? ' (actual)' : ''}`}
                                        >
                                            <Text style={styles.languagePickerFlag}>{lang.flag}</Text>
                                            <Text style={[styles.menuLabel, { color: colors.text }]} numberOfLines={1}>
                                                {lang.label}
                                            </Text>
                                            {language === lang.code && (
                                                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}

                                    {/* Comunidades extranjeras en España */}
                                    <Text style={[styles.languageGroupTitle, { color: colors.primary, marginTop: 16 }]}>
                                        {t('profile.languageInternational')}
                                    </Text>
                                    {SUPPORTED_LANGUAGES.filter((lang) => lang.group === 'international').map((lang) => (
                                        <TouchableOpacity
                                            key={lang.code}
                                            style={[
                                                styles.modalLangRow,
                                                { backgroundColor: colors.chip },
                                                language === lang.code && styles.modalLangRowActive,
                                            ]}
                                            onPress={() => {
                                                handleSwitchLanguage(lang.code);
                                                setShowLanguageModal(false);
                                            }}
                                            activeOpacity={0.75}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${lang.flag} ${lang.label}${language === lang.code ? ' (actual)' : ''}`}
                                        >
                                            <Text style={styles.languagePickerFlag}>{lang.flag}</Text>
                                            <Text style={[styles.menuLabel, { color: colors.text }]} numberOfLines={1}>
                                                {lang.label}
                                            </Text>
                                            {language === lang.code && (
                                                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>

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
                                <Ionicons name={option.icon} size={18} color="#64748b" style={styles.menuIcon} />
                                <Text
                                    style={[styles.menuLabel, { color: colors.text }]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {option.label}
                                </Text>
                                {preference === option.key && (
                                    <View style={styles.menuChevronFixed}>
                                        <Ionicons name="checkmark" size={18} color="#2563eb" />
                                    </View>
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

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: 48,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
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
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.primary,
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
        color: colors.text,
    },
    email: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
        backgroundColor: colors.successBackground,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.successBorder,
    },
    verifiedText: {
        fontSize: 12,
        color: colors.successText,
        fontWeight: '600',
    },

    // Guest banner
    guestCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    guestTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    guestSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
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
        backgroundColor: colors.primary,
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
        borderColor: colors.primary,
    },
    registerBtnText: {
        color: colors.primary,
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
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // Legal section
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    menuCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        width: '100%',
    },
    menuRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.chip,
    },
    menuIcon: {
        marginRight: 16, // Separación obligatoria respecto al texto
        width: 24,
        textAlign: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'left',
        color: colors.text,
    },
    // Chips legales: los 6 enlaces (privacidad, términos, cookies, aviso,
    // datos y contacto) se muestran en línea horizontal CENTRADA dentro de
    // la tarjeta — no pegados a la izquierda — con salto automático a la
    // línea siguiente solo si no caben en pantallas muy estrechas.
    legalChipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 14,
        marginBottom: 20,
    },
    // KILLER FEATURES v1.3.1
    toolsList: {
        gap: 8,
        marginBottom: 20,
    },
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        borderWidth: 1,
        padding: 13,
    },
    toolIcon: {
        width: 40,
        height: 40,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    toolSubtitle: {
        fontSize: 12,
        lineHeight: 17,
        marginTop: 2,
    },
    legalChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
    },
    legalChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Chevron de fila: nunca se encoge ni salta de línea; centrado
    // verticalmente respecto a la fila (alineación del icono) y con el
    // texto en flex:1 queda fijado en el extremo derecho de la tarjeta.
    menuChevronFixed: {
        flexShrink: 0,
        alignSelf: 'center',
        opacity: 0.5,
    },
    // Selector de idioma
    langFlag: {
        fontSize: 16,
        marginRight: 12,
    },
    languageSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    languageGroupTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
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
        backgroundColor: colors.danger,
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
        backgroundColor: colors.errorBackground,
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.errorBorder,
    },
    deleteText: {
        color: colors.errorText,
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
        backgroundColor: colors.border,
        width: '100%',
        marginBottom: 16,
    },
    legalText: {
        fontSize: 11,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 16,
    },
    // Componentes del selector compacto de idioma y modal (Item 4, v1.2.7)
    languagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.chip,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    languagePickerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    languagePickerFlag: {
        fontSize: 22,
        lineHeight: 24,
    },
    languagePickerLabel: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    languagePickerSub: {
        fontSize: 12,
        marginTop: 2,
    },
    languagePickerChevron: {
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        padding: 0,
    },
    modalCard: {
        borderRadius: 20,
        padding: 0,
        maxHeight: '60%',
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    modalContent: {
        maxHeight: 420,
    },
    modalContentPadding: {
        padding: 8,
    },
    modalLangRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    modalLangRowActive: {
        borderWidth: 2,
        borderColor: colors.primary,
    },

});
