import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../constants/theme';
import { useBottomInset } from '../../src/hooks/useBottomInset';

export default function TabsLayout() {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    // Insets del sistema (barra de gestos/botones). En dispositivos sin
    // barra devuelve el mínimo de seguridad 16 px, de modo que la tab bar
    // queda SIEMPRE elevada y 100 % accesible en cualquier fabricante
    // (Samsung, Xiaomi, Pixel...) y en Android 15/16 edge-to-edge.
    const bottomInset = useBottomInset(); // Math.max(insets.bottom, 16)

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.tabBarActive,
            tabBarInactiveTintColor: colors.tabBarInactive,
            tabBarStyle: {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingTop: 8,
                // paddingBottom dinámico: nunca inferior a insets.bottom ni a 16 px.
                paddingBottom: bottomInset,
                // La altura crece con el inset para que las etiquetas no se recorten.
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
    );
}
