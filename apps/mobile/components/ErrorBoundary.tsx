// ===========================================
// TRAMI ESPAÑA - ErrorBoundary global
// ===========================================
// Captura cualquier error de renderizado de React para evitar que la
// aplicación se cierre de forma inesperada ("crash al abrir"). Envuelve
// el árbol completo en app/_layout.tsx. En desarrollo registra el error
// en consola; en producción muestra una pantalla de recuperación.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
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
        if (__DEV__) {
            console.error('[ErrorBoundary] Error capturado:', error, info.componentStack);
        }
    }

    private handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
        }
        return this.props.children;
    }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }): ReactNode {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const bg = isDark ? '#0b1220' : '#f8fafc';
    const cardBg = isDark ? '#111a2c' : '#ffffff';
    const borderColor = isDark ? '#243044' : '#e2e8f0';
    const titleColor = isDark ? '#f1f5f9' : '#0f172a';
    const textColor = isDark ? '#7c8aa5' : '#64748b';

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Ionicons name="warning" size={48} color="#f59e0b" />
                <Text style={[styles.title, { color: titleColor }]}>Algo ha ido mal</Text>
                <Text style={[styles.subtitle, { color: textColor }]}>
                    Se ha producido un error inesperado, pero tus datos están a salvo.
                    Pulsa el botón para volver a la aplicación.
                </Text>
                {__DEV__ && error ? (
                    <Text style={styles.debug}>{String(error.message)}</Text>
                ) : null}
                <TouchableOpacity style={styles.button} onPress={onReset} activeOpacity={0.85}>
                    <Text style={styles.buttonText}>Volver a intentarlo</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
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
