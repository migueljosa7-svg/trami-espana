import { useCallback, useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import {
    BackHandler,
    Modal,
    Platform,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../constants/theme';
import { useBottomInset } from '../../src/hooks/useBottomInset';

export default function TabsLayout() {
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const bottomInset = useBottomInset();

    // ============================================================
    // Modal de confirmación de salida (Item 1): ¿Estás seguro de
    // que quieres salir? Con botones Cancelar / Salir.
    // ============================================================
    const [showExitModal, setShowExitModal] = useState(false);

    // ============================================================
    // Intercepción del botón físico / gesto "atrás" de Android.
    //
    // IMPORTANTE: aquí NO se usa useFocusEffect. Los componentes
    // _layout no son pantallas y no reciben el evento focus, por lo
    // que el listener antiguo nunca llegaba a registrarse y el
    // modal de salida dejaba de mostrarse. Se usa un useEffect
    // normal con BackHandler.addEventListener('hardwareBackPress',
    // handleBackPress), activo durante toda la vida del navegador
    // de pestañas.
    // ============================================================
    const handleBackPress = useCallback((): boolean => {
        if (Platform.OS !== 'android') return false;
        // Pantallas principales ((tabs)): si no hay historial (!canGoBack),
        // interceptar el cierre (return true) y mostrar SIEMPRE el modal
        // "¿Estás seguro de que quieres salir de la aplicación?".
        // Solo "Salir" ejecuta BackHandler.exitApp().
        if (!router.canGoBack()) {
            setShowExitModal(true);
            return true;
        }
        // Pantallas secundarias (ej. procedure/[slug] o modal de nuevo
        // recordatorio): NO mostrar el modal de la app. Volver limpio
        // con router.back() manteniendo el listado cargado.
        router.back();
        return true;
    }, [router]);

    useEffect(() => {
        if (Platform.OS !== 'android') return undefined;
        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            handleBackPress
        );
        return () => subscription.remove();
    }, [handleBackPress]);

    // "Sí/Salir" en el modal: cierra la app explícitamente.
    const handleExitApp = useCallback(() => {
        setShowExitModal(false);
        BackHandler.exitApp();
    }, []);

    const handleExitCancel = useCallback(() => setShowExitModal(false), []);

    const exitModalStyles = getExitModalStyles(colors);

    return (
        <>
            <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.tabBarActive,
            tabBarInactiveTintColor: colors.tabBarInactive,
            tabBarStyle: {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingTop: 8,
                paddingBottom: bottomInset,
                height: 56 + bottomInset,
            },
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500'
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: t('nav.home'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="buscar"
                options={{
                    title: t('nav.search'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="asistente"
                options={{
                    title: t('nav.assistant'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubbles" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="favoritos"
                options={{
                    title: t('nav.favorites'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="recordatorios"
                options={{
                    title: t('nav.reminders'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="notifications" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: t('nav.profile'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    )
                }}
            />
            </Tabs>

            {/* ============================================================
                Modal personalizado de confirmación de salida.
                "Sí/Salir" ejecuta BackHandler.exitApp().
            ============================================================ */}
            <Modal
                visible={showExitModal}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={handleExitCancel}
            >
                <View style={[exitModalStyles.overlay, { backgroundColor: colors.overlay }]}>
                    <View
                        style={[
                            exitModalStyles.card,
                            { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                    >
                        <View
                            style={[
                                exitModalStyles.iconWrap,
                                { backgroundColor: isDark ? colors.primarySoft : colors.primarySoft },
                            ]}
                        >
                            <Ionicons name="log-out-outline" size={30} color={colors.primary} />
                        </View>
                        <Text style={[exitModalStyles.title, { color: colors.text }]}>
                            {t('exitApp.title')}
                        </Text>
                        <Text style={[exitModalStyles.subtitle, { color: colors.textSecondary }]}>
                            {t('exitApp.subtitle')}
                        </Text>
                        <View style={exitModalStyles.actions}>
                            <TouchableOpacity
                                style={[
                                    exitModalStyles.button,
                                    exitModalStyles.cancelButton,
                                    { backgroundColor: colors.chip },
                                ]}
                                onPress={handleExitCancel}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel={t('exitApp.cancel')}
                            >
                                <Text style={[exitModalStyles.cancelText, { color: colors.text }]}>
                                    {t('exitApp.cancel')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    exitModalStyles.button,
                                    exitModalStyles.exitButton,
                                    { backgroundColor: colors.danger },
                                ]}
                                onPress={handleExitApp}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel={t('exitApp.exit')}
                            >
                                <Ionicons name="exit-outline" size={16} color="#ffffff" />
                                <Text style={exitModalStyles.exitText}>
                                    {t('exitApp.exit')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

// ============================================================
// Estilos del modal de confirmación de salida (tematizados).
// ============================================================
const getExitModalStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
        },
        card: {
            width: '100%',
            maxWidth: 400,
            borderRadius: 22,
            borderWidth: 1,
            paddingHorizontal: 22,
            paddingTop: 24,
            paddingBottom: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
        },
        iconWrap: {
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
        },
        title: {
            fontSize: 17,
            fontWeight: '700',
            textAlign: 'center',
            lineHeight: 24,
        },
        subtitle: {
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            marginTop: 6,
            marginBottom: 20,
        },
        actions: {
            flexDirection: 'row',
            width: '100%',
            gap: 10,
        },
        button: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            borderRadius: 12,
        },
        cancelButton: {},
        cancelButtonText: { color: colors.text },
        exitButton: {},
        cancelText: {
            fontSize: 15,
            fontWeight: '600',
        },
        exitText: {
            fontSize: 15,
            fontWeight: '700',
            color: '#ffffff',
        },
    });
