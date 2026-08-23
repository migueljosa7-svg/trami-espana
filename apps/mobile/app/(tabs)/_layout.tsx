import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#2563eb',
            tabBarInactiveTintColor: '#64748b',
            tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: '#e2e8f0',
                paddingTop: 8,
                paddingBottom: 8,
                height: 60
            },
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500'
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Inicio',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="buscar"
                options={{
                    title: 'Buscar',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="asistente"
                options={{
                    title: 'Asistente',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubbles" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="favoritos"
                options={{
                    title: 'Favoritos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="recordatorios"
                options={{
                    title: 'Recordatorios',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="notifications" size={size} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    )
                }}
            />
        </Tabs>
    );
}
