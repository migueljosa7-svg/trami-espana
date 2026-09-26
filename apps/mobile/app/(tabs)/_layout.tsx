import { useCallback } from 'react';
import { Tabs } from 'expo-router';
import {
    BackHandler,
    Modal,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomInset } from '../../src/hooks/useBottomInset';
import { useBackHandlerResync } from '../../src/hooks/useBackHandler';
import { ExitModalProvider, useExitModal } from '../../src/context/ExitModalContext';
import { OfflineToast } from '../../components/OfflineToast';

// ============================================================
// TabsContent — consumidor del ExitModalContext.
// El BackHandler global se ha eliminado: ahora cada pantalla de
// pestaña raíz registra su propio useFocusEffect + BackHandler
// que llama a setShowExitModal(true) desde este contexto.
// ============================================================
function TabsContent() {
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const bottomInset = useBottomInset();
    const { showExitModal, setShowExitModal } = useExitModal();

    // "Sí/Salir" en el modal: cierra la app explícitamente.
    const handleExitApp = useCallback(() => {
        setShowExitModal(false);
        BackHandler.exitApp();
    }, [setShowExitModal]);

    const handleExitCancel = useCallback(() => setShowExitModal(false), [setShowExitModal]);

    const exitModalStyles = getExitModalStyles(colors);

    // ============================================================
    // v1.3.1: al volver de segundo plano, vuelve a aplicar el fondo
    // de la ventana del sistema para que la barra nativa no cambie
    // de color de forma inesperada al restaurar la app.
    // ============================================================
    useBackHandlerResync(() => {
        // El `Tabs` ya queda montado: no hace falta forzar un re-render.
        // Este callback existe para mantener el punto de extension y para
        // re-evaluar el inset inferior en dispositivos con barra dinamica.
        // (La re-registracion de los BackHandler la hace cada pantalla de
        //  pestaña mediante useExitBackHandler + useForegroundRevision.)
    });

    return (
        <View style={{ flex: 1, backgroundColor: '#0F172A', paddingBottom: insets.bottom }}>
            <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.tabBarActive,
            tabBarInactiveTintColor: colors.tabBarInactive,
            tabBarStyle: {
                backgroundColor: isDark ? '#0F172A' : colors.card,
                borderTopColor: colors.border,
                paddingTop: 8,
                paddingBottom: bottomInset,
                height: 56 + bottomInset,
            },
            tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '500',
                marginTop: -6,
            },
            tabBarAllowFontScaling: false,
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

            {/* Aviso discreto de "sin conexion" (v1.3.1). No bloquea la app:
                los datos guardados en cache siguen siendo navegables. */}
            <OfflineToast />

            {/* ============================================================
                Modal personalizado de confirmación de salida.
                Activado por useFocusEffect + BackHandler en cada pantalla
                de pestaña raíz mediante ExitModalContext.
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
        </View>
    );
}

// ============================================================
// TabsLayout — provee el ExitModalContext para todo el árbol
// de pestañas. Las pantallas hijo consumen useExitModal() para
// disparar el modal desde su propio useFocusEffect.
// ============================================================
export default function TabsLayout() {
    return (
        <ExitModalProvider>
            <TabsContent />
        </ExitModalProvider>
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
