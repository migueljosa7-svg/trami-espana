import { Stack } from 'expo-router';

export default function LegalLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerBackTitle: 'Volver',
                headerTintColor: '#2563eb',
                headerStyle: { backgroundColor: '#ffffff' },
                headerTitleStyle: { color: '#0f172a' },
                contentStyle: { backgroundColor: '#f8fafc' },
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
