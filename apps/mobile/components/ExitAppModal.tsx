// ===========================================
// TRAMI ESPAÑA - Modal de confirmación de salida
// ===========================================
// Modal profesional que pide confirmación antes de cerrar la app.
// Tras confirmar, cierra la aplicación en Android con BackHandler.exitApp().

import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExitAppModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ExitAppModal({ visible, onClose }: ExitAppModalProps) {
    const handleExit = () => {
        onClose();
        if (Platform.OS === 'android') {
            // Pequeño margen para que el modal se desmonte antes de cerrar.
            setTimeout(() => BackHandler.exitApp(), 100);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="exit-outline" size={30} color="#2563eb" />
                    </View>

                    <Text style={styles.title}>¿Seguro que quieres salir de la aplicación?</Text>
                    <Text style={styles.subtitle}>
                        Tus favoritos y recordatorios guardados estarán aquí cuando vuelvas.
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Cancelar y permanecer en la aplicación"
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.exitButton}
                            onPress={handleExit}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Salir de la aplicación"
                        >
                            <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                            <Text style={styles.exitButtonText}>Salir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dialog: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 12,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 24,
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    exitButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    exitButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
});