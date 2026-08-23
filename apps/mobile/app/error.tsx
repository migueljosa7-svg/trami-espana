import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export default function ErrorScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.emoji}>😕</Text>
                <Text style={styles.title}>Página no encontrada</Text>
                <Text style={styles.subtitle}>
                    Lo sentimos, la página que buscas no existe o ha sido movida.
                </Text>
                <Link href="/" asChild>
                    <TouchableOpacity style={styles.button}>
                        <Text style={styles.buttonText}>Volver al inicio</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb'
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24
    },
    button: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600'
    }
});
