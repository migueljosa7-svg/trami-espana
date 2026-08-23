import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { authService, reminderService, ReminderWithProcedure } from '@trami-espana/shared';

export default function RemindersScreen() {
    const router = useRouter();
    const [reminders, setReminders] = useState<ReminderWithProcedure[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadReminders = async () => {
            setIsLoading(true);
            try {
                const currentUser = await authService.getCurrentUser();

                // Sin usuario: no tocar Supabase ni servicios. Redirigir a login.
                if (!currentUser) {
                    router.replace('/login');
                    return;
                }

                const data = await reminderService.getReminders();
                if (data) setReminders(data);
            } catch {
                // Error controlado.
            } finally {
                setIsLoading(false);
            }
        };
        loadReminders();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mis Recordatorios</Text>
                <Text style={styles.headerSubtitle}>Alertas de fechas clave de trámites</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : reminders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No tienes recordatorios activos</Text>
                    <Text style={styles.emptySubtitle}>
                        Configura avisos sobre renovación de documentos o plazos de solicitudes.
                    </Text>
                </View>
            ) : (
                <ScrollView style={styles.list} contentContainerStyle={{ padding: 16 }}>
                    {reminders.map((rem) => (
                        <View key={rem.id} style={styles.card} accessibilityLabel={`Recordatorio: ${rem.title}`}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.badge}>RECORDATORIO</Text>
                                <Text style={styles.date}>{new Date(rem.reminder_date).toLocaleDateString('es-ES')}</Text>
                            </View>
                            <Text style={styles.cardTitle}>{rem.title}</Text>
                            {rem.description && <Text style={styles.cardNotes}>{rem.description}</Text>}
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a'
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center'
    },
    list: {
        flex: 1
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    badge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#d97706',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    date: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500'
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a'
    },
    cardNotes: {
        fontSize: 13,
        color: '#475569',
        marginTop: 4
    }
});
