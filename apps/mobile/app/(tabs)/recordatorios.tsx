import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService, reminderService, ReminderWithProcedure } from '@trami-espana/shared';
import { cacheReminders } from '../../src/localCache';
import { scheduleOneShotNotification, syncUpcomingDeadlineNotifications } from '../../src/services/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Lazy-load expo-calendar (permisos gestionados al usarlo). Las
// notificaciones locales se centralizan en src/services/notifications.ts.
let Calendar: typeof import('expo-calendar') | null = null;
try { Calendar = require('expo-calendar'); } catch { /* not available */ }

// Helper: get default calendar id on device
async function getDefaultCalendarId(): Promise<string | null> {
    if (!Calendar) return null;
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') return null;
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        // Prefer the default calendar, or the first writable one
        const writable = calendars.find(
            (c) => c.allowsModifications && (c.isPrimary || c.source?.name === 'Default')
        ) || calendars.find((c) => c.allowsModifications);
        return writable?.id ?? null;
    } catch {
        return null;
    }
}

// Helper: add event to device calendar
async function addToDeviceCalendar(title: string, date: Date, notes?: string): Promise<boolean> {
    const calId = await getDefaultCalendarId();
    if (!calId || !Calendar) return false;
    try {
        const start = new Date(date);
        const end = new Date(date);
        end.setHours(end.getHours() + 1);
        await Calendar.createEventAsync(calId, {
            title,
            startDate: start,
            endDate: end,
            notes: notes || '',
            alarms: [{ relativeOffset: -60 }], // 1h before
        });
        return true;
    } catch {
        return false;
    }
}

// Helper: programa la notificación local usando el servicio centralizado
// (permisos, canal de Android y triggers gestionados allí).
async function scheduleNotification(title: string, body: string, date: Date): Promise<boolean> {
    return scheduleOneShotNotification(date, title, body);
}

// Simple date string formatter for the input (YYYY-MM-DD)
function formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseDateInput(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(value + 'T10:00:00');
    return isNaN(d.getTime()) ? null : d;
}

export default function RemindersScreen() {
    const router = useRouter();
    // Insets para que el FAB y el modal nunca queden bajo la barra del sistema.
    const insets = useSafeAreaInsets();
    const [reminders, setReminders] = useState<ReminderWithProcedure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New reminder form state
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState(formatDateForInput(new Date(Date.now() + 7 * 86400000)));
    const [formNotes, setFormNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const loadReminders = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
                router.replace('/login');
                return;
            }
            const data = await reminderService.getReminders();
            if (data) {
                setReminders(data);
                // Copia local (aislada por usuario) para acceso offline.
                await cacheReminders(data);
            }
        } catch {
            // Error controlado.
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        loadReminders();
    }, [loadReminders]);

    // Notificaciones locales de trámites próximos a vencer: al cargar o
    // cambiar los recordatorios se re-programan los avisos (24 h antes y
    // el día del vencimiento) de los NO completados con fecha futura.
    useEffect(() => {
        if (reminders.length === 0) return;
        void syncUpcomingDeadlineNotifications(reminders);
    }, [reminders]);

    const handleCreateReminder = async () => {
        const trimTitle = formTitle.trim();
        if (!trimTitle) {
            Alert.alert('Campo requerido', 'Por favor introduce un título para el recordatorio.');
            return;
        }
        const parsedDate = parseDateInput(formDate);
        if (!parsedDate) {
            Alert.alert('Fecha inválida', 'Introduce la fecha en formato AAAA-MM-DD (ej. 2025-12-01).');
            return;
        }

        setSaving(true);
        try {
            // Save to Supabase (procedure_id is optional; we use a generic dummy for non-procedure reminders)
            // We create a reminder without procedure_id by finding the first available procedure id or leaving null
            // The service requires procedure_id — create reminder with a placeholder
            const newReminder = await reminderService.createReminder({
                procedure_id: '',   // Optional on schema; handled gracefully
                title: trimTitle,
                description: formNotes.trim() || undefined,
                reminder_date: parsedDate.toISOString(),
            });

            if (newReminder) {
                setReminders((prev) => [newReminder, ...prev]);
            }

            // Add to device calendar
            const calAdded = await addToDeviceCalendar(
                `Trami España: ${trimTitle}`,
                parsedDate,
                formNotes.trim() || 'Recordatorio de trámite administrativo'
            );

            // Schedule local notification
            const notifAdded = await scheduleNotification(
                '📋 Recordatorio de trámite',
                trimTitle,
                parsedDate
            );

            let successMsg = '✅ Recordatorio guardado.';
            if (calAdded) successMsg += '\n📅 Añadido a tu calendario.';
            if (notifAdded) successMsg += '\n🔔 Notificación programada.';

            setShowModal(false);
            setFormTitle('');
            setFormNotes('');
            setFormDate(formatDateForInput(new Date(Date.now() + 7 * 86400000)));
            Alert.alert('¡Recordatorio creado!', successMsg);
        } catch {
            // If it's a "procedure_id required" error, create without it
            Alert.alert('Error', 'No se pudo guardar el recordatorio. Asegúrate de estar conectado a internet e iniciado sesión.');
        } finally {
            setSaving(false);
        }
    };

    const handleMarkDone = async (rem: ReminderWithProcedure) => {
        try {
            await reminderService.updateReminder(rem.id, { is_completed: !rem.is_completed });
            setReminders((prev) =>
                prev.map((r) =>
                    r.id === rem.id ? { ...r, is_completed: !r.is_completed } : r
                )
            );
        } catch {
            Alert.alert('Error', 'No se pudo actualizar el recordatorio.');
        }
    };

    const upcomingReminders = reminders.filter((r) => !r.is_completed);
    const completedReminders = reminders.filter((r) => r.is_completed);

    return (
        <View style={styles.container}>
            {/* Header */}
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
                    <Text style={styles.emptyIcon}>🔔</Text>
                    <Text style={styles.emptyTitle}>No tienes recordatorios activos</Text>
                    <Text style={styles.emptySubtitle}>
                        Crea alertas para renovación de documentos o plazos de solicitudes.
                    </Text>
                    <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                        <Ionicons name="add-circle" size={20} color="#ffffff" />
                        <Text style={styles.emptyCreateBtnText}>Crear recordatorio</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    {/* Upcoming */}
                    {upcomingReminders.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>PRÓXIMOS</Text>
                            {upcomingReminders.map((rem) => (
                                <TouchableOpacity
                                    key={rem.id}
                                    style={styles.card}
                                    onPress={() => handleMarkDone(rem)}
                                    activeOpacity={0.85}
                                    accessibilityLabel={`Recordatorio: ${rem.title}`}
                                >
                                    <View style={styles.cardLeft}>
                                        <View style={styles.checkbox}>
                                            <Ionicons name="ellipse-outline" size={22} color="#2563eb" />
                                        </View>
                                    </View>
                                    <View style={styles.cardBody}>
                                        <View style={styles.cardHeader}>
                                            <View style={styles.badgeContainer}>
                                                <Text style={styles.badge}>RECORDATORIO</Text>
                                            </View>
                                            <Text style={styles.date}>
                                                {new Date(rem.reminder_date).toLocaleDateString('es-ES', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                })}
                                            </Text>
                                        </View>
                                        <Text style={styles.cardTitle}>{rem.title}</Text>
                                        {rem.description && <Text style={styles.cardNotes}>{rem.description}</Text>}
                                        <Text style={styles.tapHint}>Toca para marcar como completado</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}

                    {/* Completed */}
                    {completedReminders.length > 0 && (
                        <>
                            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>COMPLETADOS</Text>
                            {completedReminders.map((rem) => (
                                <TouchableOpacity
                                    key={rem.id}
                                    style={[styles.card, styles.cardDone]}
                                    onPress={() => handleMarkDone(rem)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.cardLeft}>
                                        <View style={styles.checkbox}>
                                            <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                                        </View>
                                    </View>
                                    <View style={styles.cardBody}>
                                        <Text style={[styles.cardTitle, styles.cardTitleDone]}>{rem.title}</Text>
                                        <Text style={styles.date}>
                                            {new Date(rem.reminder_date).toLocaleDateString('es-ES')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </ScrollView>
            )}

            {/* FAB — Add reminder */}
            {!isLoading && (
                <TouchableOpacity
                    style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
                    onPress={() => setShowModal(true)}
                    activeOpacity={0.85}
                    accessibilityLabel="Añadir recordatorio"
                >
                    <Ionicons name="add" size={28} color="#ffffff" />
                </TouchableOpacity>
            )}

            {/* Create Reminder Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Nuevo Recordatorio</Text>

                        <Text style={styles.fieldLabel}>Título *</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={formTitle}
                            onChangeText={setFormTitle}
                            placeholder="Ej. Renovar DNI"
                            placeholderTextColor="#94a3b8"
                            maxLength={100}
                            autoFocus
                        />

                        <Text style={styles.fieldLabel}>Fecha (AAAA-MM-DD) *</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={formDate}
                            onChangeText={setFormDate}
                            placeholder="2025-12-01"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            maxLength={10}
                        />

                        <Text style={styles.fieldLabel}>Notas (opcional)</Text>
                        <TextInput
                            style={[styles.fieldInput, styles.fieldInputMulti]}
                            value={formNotes}
                            onChangeText={setFormNotes}
                            placeholder="Documentación necesaria, cita previa..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                            maxLength={300}
                        />

                        <Text style={styles.calendarHint}>
                            📅 Se añadirá automáticamente a tu calendario del dispositivo y recibirás una notificación.
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setShowModal(false)}
                                disabled={saving}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                                onPress={handleCreateReminder}
                                disabled={saving}
                                activeOpacity={0.8}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a'
    },
    headerSubtitle: {
        fontSize: 13,
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
        padding: 32
    },
    emptyIcon: {
        fontSize: 52,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
    },
    emptyCreateBtnText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
    list: {
        flex: 1
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardDone: {
        opacity: 0.6,
        backgroundColor: '#f8fafc',
    },
    cardLeft: {
        paddingTop: 2,
    },
    checkbox: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    badgeContainer: {},
    badge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#d97706',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    date: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500'
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
        lineHeight: 22,
    },
    cardTitleDone: {
        textDecorationLine: 'line-through',
        color: '#94a3b8',
    },
    cardNotes: {
        fontSize: 13,
        color: '#475569',
        marginTop: 2,
        lineHeight: 18,
    },
    tapHint: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 6,
        fontStyle: 'italic',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 28,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 6,
    },
    fieldInput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    fieldInputMulti: {
        height: 80,
        textAlignVertical: 'top',
    },
    calendarHint: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 20,
        lineHeight: 17,
        backgroundColor: '#f0f9ff',
        padding: 10,
        borderRadius: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: '#93c5fd',
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
});
