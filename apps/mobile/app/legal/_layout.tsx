import { Stack } from 'expo-router';
import { useTheme } from '../../constants/theme';

export default function LegalLayout() {
    const { colors, isDark } = useTheme();
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerBackTitle: 'Volver',
                headerTintColor: colors.primary,
                headerStyle: { backgroundColor: isDark ? '#0F172A' : '#ffffff' },
                headerTitleStyle: { color: colors.text },
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="politica-privacidad" options={{ title: 'Política de privacidad' }} />
            <Stack.Screen name="terminos" options={{ title: 'Términos y condiciones' }} />
            <Stack.Screen name="cookies" options={{ title: 'Cookies y tecnologías' }} />
            <Stack.Screen name="contacto" options={{ title: 'Contacto' }} />
            <Stack.Screen name="aviso" options={{ title: 'Aviso de servicio' }} />
            <Stack.Screen name="datos" options={{ title: 'Datos y privacidad' }} />
        </Stack>
    );
}
