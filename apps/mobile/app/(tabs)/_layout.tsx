import { useCallback } from 'react';
import { Tabs } from 'expo-router';
import { BackHandler, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../constants/theme';
import { useBottomInset } from '../../src/hooks/useBottomInset';

export default function TabsLayout() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const router = useRouter();
    const bottomInset = useBottomInset();

    // ============================================================
    // Intercepción del botón físico / gesto "atrás" de Android.
    // Utiliza la API de Expo Router para manejar la navegación.
    // Si hay pantallas en el stack, vuelve a la anterior.
    // Solo muestra diálogo de salida si estamos en la raíz.
    // ============================================================
    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return undefined;
            const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
                if (router.canGoBack()) {
                    router.back();
                    return true; // Intercepta el evento y vuelve a la pantalla anterior
                }
                // En la raíz de una pestaña: mostrar confirmación de salida.
                Alert.alert(t('exitApp.title'), t('exitApp.subtitle'), [
                    { text: t('exitApp.cancel'), style: 'cancel' },
                    {
                        text: t('exitApp.exit'),
                        style: 'destructive',
                        onPress: () => BackHandler.exitApp(),
                    },
                ]);
                return true;
            });
            return () => subscription.remove();
        }, [t, router])
    );

    return (
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
    );
}
