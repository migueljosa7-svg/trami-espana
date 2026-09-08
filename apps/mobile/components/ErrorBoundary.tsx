// ===========================================
// TRAMI ESPAÑA - ErrorBoundary global
// ===========================================
// Captura cualquier error de renderizado de React para evitar que la
// aplicación se cierre de forma inesperada ("crash al abrir"). Envuelve
// el árbol completo en app/_layout.tsx. En desarrollo registra el error
// en consola; en producción muestra una pantalla de recuperación.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        // Punto único de telemetría de crashes de render.
        if (__DEV__) {
            console.error('[ErrorBoundary] Error capturado:', error, info.componentStack);
        }
    }

    private handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.card}>
                        <Ionicons name="warning" size={48} color="#f59e0b" />
                        <Text style={styles.title}>Algo ha ido mal</Text>
                        <Text style={styles.subtitle}>
                            Se ha producido un error inesperado, pero tus datos están a salvo.
                            Pulsa el botón para volver a la aplicación.
                        </Text>
                        {__DEV__ && this.state.error ? (
                            <Text style={styles.debug}>{String(this.state.error.message)}</Text>
                        ) : null}
                        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
                            <Text style={styles.buttonText}>Volver a intentarlo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 12,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    debug: {
        fontSize: 11,
        color: '#ef4444',
        fontFamily: 'monospace',
        marginBottom: 16,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 12,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
});
