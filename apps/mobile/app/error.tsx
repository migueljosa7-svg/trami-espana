import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';

export default function ErrorScreen() {
    const { colors, isDark } = useTheme();
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={styles.content}>
                <Text style={styles.emoji}>😕</Text>
                <Text style={[styles.title, { color: colors.text }]}>Página no encontrada</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Lo sentimos, la página que buscas no existe o ha sido movida.
                </Text>
                <Link href="/" asChild>
                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]}>
                        <Text style={styles.buttonText}>Volver al inicio</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24
    },
    button: {
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
