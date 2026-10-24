import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../constants/theme';
import { useBottomInset } from '../../src/hooks/useBottomInset';
import { OfflineToast } from '../../components/OfflineToast';

/**
 * Layout de pestañas.
 * La interceptación del botón/gesto Atrás y el modal de salida viven en
 * `ExitModalProvider` (app/_layout.tsx): un único listener global evita
 * listeners duplicados que compitan entre sí.
 */
export default function TabsLayout() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const bottomInset = useBottomInset();

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
        </View>
    );
}
