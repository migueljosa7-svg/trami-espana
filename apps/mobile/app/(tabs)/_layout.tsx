import { useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../constants/theme';
import { useBottomInset } from '../../src/hooks/useBottomInset';
import { useBackHandlerResync } from '../../src/hooks/useBackHandler';
import { useAppExitModal } from '../../src/hooks/useAppExitModal';
import { ExitModalProvider, useExitModal } from '../../src/context/ExitModalContext';
import { ExitConfirmationModal } from '../../components/ExitConfirmationModal';
import { OfflineToast } from '../../components/OfflineToast';

/**
 * Contenido del layout de pestañas.
 * Gestiona la navegación de pestañas y centraliza de forma limpia y universal
 * la interceptación de salida (BackHandler / gestos del sistema en Android).
 */
function TabsContent() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const bottomInset = useBottomInset();
    const router = useRouter();

    // Contexto reactivo global del modal para permitir que pantallas hijas
    // también puedan invocar la salida si fuera necesario.
    const { showExitModal: contextShowModal, setShowExitModal: setContextShowModal } = useExitModal();

    // Hook unificado y universal de interceptación del botón/gesto Atrás.
    // Garantiza ejecución síncrona (return true) en Xiaomi/Redmi (MIUI/HyperOS)
    // y en cualquier dispositivo Android, evitando cierres imprevistos.
    const {
        showExitModal,
        closeExitModal,
        confirmExit,
    } = useAppExitModal({
        enabled: true,
        canGoBack: () => router.canGoBack(),
        onGoBack: () => router.back(),
    });

    const isModalVisible = showExitModal || contextShowModal;
    const handleCancel = useCallback(() => {
        closeExitModal();
        setContextShowModal(false);
    }, [closeExitModal, setContextShowModal]);

    const handleConfirm = useCallback(() => {
        setContextShowModal(false);
        confirmExit();
    }, [confirmExit, setContextShowModal]);

    // Resincronización al volver de segundo plano (mantiene estilos del sistema).
    useBackHandlerResync();

    return (
        <View style={{ flex: 1, minHeight: 0, backgroundColor: colors.background }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.tabBarActive,
                    tabBarInactiveTintColor: colors.tabBarInactive,
                    tabBarHideOnKeyboard: true,
                    tabBarStyle: {
                        backgroundColor: colors.card,
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
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: t('nav.home'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="home" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="buscar"
                    options={{
                        title: t('nav.search'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="search" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="asistente"
                    options={{
                        title: t('nav.assistant'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="chatbubbles" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="favoritos"
                    options={{
                        title: t('nav.favorites'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="heart" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="recordatorios"
                    options={{
                        title: t('nav.reminders'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="notifications" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="perfil"
                    options={{
                        title: t('nav.profile'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person" size={size} color={color} />
                        ),
                    }}
                />
            </Tabs>

            <OfflineToast />

            {/* Modal desacoplado, accesible y tematizado de confirmación de salida */}
            <ExitConfirmationModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
            />
        </View>
    );
}

export default function TabsLayout() {
    return (
        <ExitModalProvider>
            <TabsContent />
        </ExitModalProvider>
    );
}
