import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { reminderService, ReminderWithProcedure } from '@trami-espana/shared';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { cacheReminders } from '../../src/localCache';
import { scheduleDeadlineNotifications, syncUpcomingDeadlineNotifications } from '../../src/services/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../../constants/theme';
import { useAuth } from '../../src/context/AuthContext';

// Lazy-load expo-calendar (permisos gestionados al usarlo). Las
// notificaciones locales se centralizan en src/services/notifications.ts.
let Calendar: typeof import('expo-calendar') | null = null;
try { Calendar = require('expo-calendar'); } catch { /* not available */ }

// ============================================================
// Compatibilidad GrapheneOS / Android sin Google Play Services.
// Los helpers de calendario NUNCA lanzan excepciones no capturadas:
// devuelven siempre { ok, reason } para que la UI pueda mostrar un
// aviso amistoso y el recordatorio se guarde de todos modos.
// ============================================================
type CalendarFailureReason = 'permission' | 'empty' | 'unavailable' | null;

interface CalendarResult {
    ok: boolean;
    reason: CalendarFailureReason;
    /** ID del calendario seleccionado (solo cuando ok === true). */
    id?: string | null;
}

// Helper: calendario primario de Google en el dispositivo (Android).
// No usar IDs locales hardcodeados: se resuelve el calendario real del usuario.
async function getGooglePrimaryCalendarId(): Promise<CalendarResult> {
    if (!Calendar) return { ok: false, reason: 'unavailable' };
    // 1) Permisos: el módulo puede lanzar en ROMs sin proveedor de calendario
    //    (GrapheneOS / dispositivos sin Google Calendar nativo).
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') return { ok: false, reason: 'permission' };
    } catch (error) {
        console.log('[CALENDARIO] requestCalendarPermissionsAsync lanzó excepción (sin Play Services?):', error);
        return { ok: false, reason: 'unavailable' };
    }
    // 2) Listado de calendarios: también protegido con try/catch.
    try {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        if (!calendars || calendars.length === 0) {
            // Array vacío: no hay proveedor de calendarios disponible.
            return { ok: false, reason: 'empty' };
        }
        // 1) Calendario primario que permita modificaciones.
        const primary = calendars.find(
            (c) => c.isPrimary && c.allowsModifications
        );
        if (primary) return { ok: true, reason: null, id: primary.id };
        // 2) Cuenta de Google activa (ownerAccount de Gmail / source Google).
        const google = calendars.find((c) => {
            const owner = (c.ownerAccount ?? '').toLowerCase();
            const sourceName = (c.source?.name ?? '').toLowerCase();
            const sourceType = (c.source?.type ?? '').toLowerCase();
            const looksGoogle =
                owner.includes('gmail.com') ||
                owner.includes('googlemail.com') ||
                sourceName.includes('google') ||
                sourceName.includes('gmail') ||
                sourceType.includes('google');
            return looksGoogle && c.allowsModifications;
        });
        if (google) return { ok: true, reason: null, id: google.id };
        // 3) Fallback: primer calendario modificable.
        const writable = calendars.find((c) => c.allowsModifications);
        if (writable) return { ok: true, reason: null, id: writable.id };
        return { ok: false, reason: 'empty' };
    } catch (error) {
        // Error de la API de Google (proveedor no disponible / SecurityException
        // en GrapheneOS): no propagar, degradar con motivo 'unavailable'.
        console.log('[CALENDARIO] getCalendarsAsync lanzó excepción (proveedor no disponible?):', error);
        return { ok: false, reason: 'unavailable' };
    }
}

// Helper: add event to device calendar (zona horaria local Europe/Madrid)
async function addToDeviceCalendar(title: string, date: Date, notes?: string): Promise<CalendarResult> {
    try {
        const result = await getGooglePrimaryCalendarId();
        if (!result.ok || !Calendar) return { ok: false, reason: result.reason ?? 'unavailable' };
        const start = new Date(date);
        const end = new Date(date);
        end.setHours(end.getHours() + 1);
        await Calendar.createEventAsync(result.id as string, {
            title,
            startDate: start,
            endDate: end,
            timeZone: 'Europe/Madrid',
            notes: notes || '',
            alarms: [{ relativeOffset: -60 }], // 1h before
        });
        return { ok: true, reason: null };
    } catch (error) {
        // createEventAsync puede lanzar en dispositivos sin proveedor de
        // Google Calendar. Se captura SIEMPRE y se degrada con aviso.
        console.log('[CALENDARIO] createEventAsync lanzó excepción:', error);
        return { ok: false, reason: 'unavailable' };
    }
}

// Helper: programa notificaciones locales (24h antes + el día del evento)
async function scheduleNotification(title: string, body: string, date: Date): Promise<boolean> {
    const result = await scheduleDeadlineNotifications({
        id: 'manual',
        title,
        notes: body,
        deadline: date,
    });
    return result.dayBefore || result.dayOf;
}

/** Fecha legible para el boton selector (DD/MM/AAAA). */
function formatDateForDisplay(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

/** Parsea claves internas YYYY-MM-DD (vista calendario). No es entrada manual. */
export function parseDateKey(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(value + 'T10:00:00');
    return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// Helpers de hora y calendario (Item 3)
// ============================================================
/** Formatea la hora como HH:MM (24h). */
function formatTimeForDisplay(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

/** Combina la fecha (Date nativo del picker) con la hora seleccionada. */
function mergeDateAndTime(date: Date, time: Date): Date | null {
    if (!date || isNaN(date.getTime())) return null;
    const base = new Date(date);
    base.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return base;
}

/** ¿Son el mismo día calendario? */
function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/**
 * Devuelve un array de semanas (cada una con 7 celdas Date|null) para el
 * mes indicado. Usado por la vista de calendario.
 */
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = first.getDay(); // 0 = domingo
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}


export default function RemindersScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);
    const { user, isLoading: authLoading } = useAuth();
    // Insets para que el FAB y el modal nunca queden bajo la barra del sistema.
    const insets = useSafeAreaInsets();
    const [reminders, setReminders] = useState<ReminderWithProcedure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New reminder form state
    const [formTitle, setFormTitle] = useState('');
    // v1.2.5: fecha como Date nativo (DateTimePicker modo date). Sin texto manual.
    const [formDateObj, setFormDateObj] = useState<Date>(() => new Date(Date.now() + 7 * 86400000));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [formNotes, setFormNotes] = useState('');
    const [saving, setSaving] = useState(false);
    // Hora del recordatorio (Item 3). Valor por defecto 10:00.
    const [formTime, setFormTime] = useState<Date>(() => {
        const d = new Date();
        d.setHours(10, 0, 0, 0);
        return d;
    });
    const [showTimePicker, setShowTimePicker] = useState(false);
    // Vista de calendario (Item 3).
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const loadReminders = useCallback(async () => {
        // Esperar a que AuthContext rehidrate la sesión (authLoading) antes
        // de decidir si hay que redirigir al login. Sin esto, al volver
        // del segundo plano se redirige aunque la sesión exista en disco.
        if (authLoading) return;
        setIsLoading(true);
        try {
            // Usar el usuario del AuthContext en lugar de llamar a authService directamente
            if (!user) {
                console.log('[RECORDATORIOS] Usuario no autenticado - redirigiendo a login');
                router.replace('/login');
                return;
            }
            console.log('[RECORDATORIOS] Cargando recordatorios para:', user.email);
            const data = await reminderService.getReminders();
            if (data) {
                setReminders(data);
                // Copia local (aislada por usuario) para acceso offline.
                await cacheReminders(data);
                console.log('[RECORDATORIOS] Recordatorios cargados:', data.length);
            }
        } catch (error) {
            console.error('[RECORDATORIOS] Error al cargar recordatorios:', error);
        } finally {
            setIsLoading(false);
        }
    }, [router, user, authLoading]);

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
        const parsedDate = mergeDateAndTime(formDateObj, formTime);
        if (!parsedDate) {
            Alert.alert('Fecha inválida', 'Elige la fecha con el selector de calendario.');
            return;
        }

        // Validar autenticación ANTES de proceder
        if (!user) {
            console.log('[RECORDATORIOS] Usuario no autenticado - no se puede guardar');
            Alert.alert(
                'Inicio de sesión obligatorio',
                'Debes iniciar sesión para crear recordatorios.'
            );
            return;
        }

        console.log('[RECORDATORIOS] Guardando recordatorio para usuario:', user.email);
        setSaving(true);
        try {
            // Recordatorio manual: sin trámite asociado -> procedure_id NULL.
            // Nunca enviar '' (provoca error 22P02/23503 en Postgres).
            // Requiere la migración 20240101000015 (procedure_id NULLABLE).
            const newReminder = await reminderService.createReminder({
                procedure_id: null,
                title: trimTitle,
                description: formNotes.trim() || undefined,
                reminder_date: parsedDate.toISOString(),
            });

            if (newReminder) {
                setReminders((prev) => [newReminder, ...prev]);
                console.log('[RECORDATORIOS] Recordatorio guardado correctamente:', newReminder.id);
            }

            // Add to device calendar. En GrapheneOS / dispositivos sin
            // Google Play Services o Google Calendar esto devuelve
            // { ok: false, reason } sin lanzar: la app NO se bloquea.
            const calResult = await addToDeviceCalendar(
                `Trami España: ${trimTitle}`,
                parsedDate,
                formNotes.trim() || 'Recordatorio de trámite administrativo'
            );

            // Schedule local notification (24h before + on the day)
            const notifResult = await scheduleDeadlineNotifications({
                id: newReminder?.id || 'temp',
                title: trimTitle,
                notes: formNotes.trim() || undefined,
                deadline: parsedDate,
            });

            let successMsg = `✅ Recordatorio guardado para el ${parsedDate.toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric',
            })} a las ${formatTimeForDisplay(parsedDate)}.`;
            if (calResult.ok) successMsg += '\n📅 Añadido a tu calendario con esa hora.';
            if (notifResult.dayBefore || notifResult.dayOf) successMsg += '\n🔔 Notificaciones programadas (24h antes y el día).';

            if (!calResult.ok) {
                // Aviso amistoso en pantalla: el dispositivo no dispone de
                // Google Calendar / Play Services (p. ej. GrapheneOS), pero
                // el recordatorio se ha guardado igualmente en la app con
                // sus notificaciones locales.
                const motivoAviso =
                    calResult.reason === 'permission'
                        ? 'No concediste el permiso de calendario.'
                        : calResult.reason === 'empty'
                            ? 'No se encontró ningún calendario disponible en este dispositivo.'
                            : 'Este dispositivo no tiene Google Calendar ni los servicios de Google.';
                successMsg += `\n\n📅 No se pudo añadir al calendario del dispositivo: ${motivoAviso}\nEl recordatorio se ha guardado en la app y recibirás notificaciones en las fechas programadas.`;
            }

            setShowModal(false);
            setFormTitle('');
            setFormNotes('');
            setFormDateObj(new Date(Date.now() + 7 * 86400000));
            Alert.alert('¡Recordatorio creado!', successMsg);
        } catch (error) {
            // Log detallado del error para depuración
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            const errorCode = error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined;
            console.error('[RECORDATORIOS] Error al guardar recordatorio:', errorMessage, 'Código:', errorCode);
            
            // Mensaje de error más específico según el tipo de error
            if (/not authenticated|not_authenticated|auth/i.test(errorMessage)) {
                Alert.alert('Error de sesión', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
                router.replace('/login');
            } else if (/network|connection|internet/i.test(errorMessage)) {
                Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.');
            } else {
                // ============================================================
                // Fallback 100% local (offline / GrapheneOS / sin Google Play
                // Services): se guarda el recordatorio EN LA APP vía
                // notificaciones locales de Expo, sin que la aplicación se
                // bloquee ni se cierre nunca.
                // ============================================================
                try {
                    const localNotif = await scheduleDeadlineNotifications({
                        id: `local-${Date.now()}`,
                        title: trimTitle,
                        notes: formNotes.trim() || undefined,
                        deadline: parsedDate,
                    });
                    if (localNotif.dayBefore || localNotif.dayOf) {
                        setShowModal(false);
                        setFormTitle('');
                        setFormNotes('');
                        Alert.alert(
                            'Recordatorio guardado en la app',
                            `📱 No se pudo sincronizar con el servidor, pero el recordatorio "${trimTitle}" se ha guardado localmente y recibirás notificaciones el ${parsedDate.toLocaleDateString('es-ES', {
                                day: '2-digit', month: 'short', year: 'numeric',
                            })} a las ${formatTimeForDisplay(parsedDate)}.`
                        );
                    } else {
                        Alert.alert('Aviso', 'No se pudo guardar el recordatorio (ni en el servidor ni de forma local). Inténtalo de nuevo.');
                    }
                } catch (localError) {
                    console.error('[RECORDATORIOS] Fallback local también falló:', localError);
                    Alert.alert('Error', 'No se pudo guardar el recordatorio. Inténtalo de nuevo.');
                }
            }
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

    // Días con citas agendadas (clave YYYY-MM-DD) para la vista de calendario.
    const reminderDays = useMemo(() => {
        const set = new Set<string>();
        reminders.forEach((r) => {
            const d = new Date(r.reminder_date);
            if (!isNaN(d.getTime())) {
                set.add(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                );
            }
        });
        return set;
    }, [reminders]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.headerTitle}>Mis Recordatorios</Text>
                        <Text style={styles.headerSubtitle}>Alertas de fechas clave de trámites</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.calendarBtn}
                        onPress={() => setShowCalendar(true)}
                        activeOpacity={0.75}
                        accessibilityLabel="Ver calendario de citas"
                    >
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
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
                                        <View style={styles.cardActions}>
                                            {/* v1.2.5: sin boton manual de calendario. La sincronizacion
                                                es automatica al guardar (ver handleCreateReminder). */}
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: colors.chip }]}
                                                onPress={() => {
                                                    const date = new Date(rem.reminder_date);
                                                    void scheduleNotification(rem.title, rem.description || 'Recordatorio de trámite', date);
                                                }}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="notifications-outline" size={14} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
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

                        <Text style={styles.fieldLabel}>Fecha *</Text>
                        <TouchableOpacity
                            style={styles.timeField}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.75}
                            accessibilityLabel="Elegir fecha del recordatorio"
                            accessibilityRole="button"
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={styles.timeFieldText}>{formatDateForDisplay(formDateObj)}</Text>
                            <Text style={styles.timeFieldHint}>Toca para elegir fecha</Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={formDateObj}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                                    if (Platform.OS === 'ios') {
                                        // iOS: mantiene el selector abierto mientras se gira.
                                        if (selectedDate) setFormDateObj(selectedDate);
                                    } else {
                                        // Android: el dialogo se cierra al elegir/descartar.
                                        setShowDatePicker(false);
                                        if (event.type === 'set' && selectedDate) setFormDateObj(selectedDate);
                                    }
                                }}
                            />
                        )}

                        <Text style={styles.fieldLabel}>Hora *</Text>
                        <TouchableOpacity
                            style={styles.timeField}
                            onPress={() => setShowTimePicker(true)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="time-outline" size={20} color={colors.primary} />
                            <Text style={styles.timeFieldText}>{formatTimeForDisplay(formTime)}</Text>
                            <Text style={styles.timeFieldHint}>Toca para elegir hora</Text>
                        </TouchableOpacity>

                        {showTimePicker && (
                            <DateTimePicker
                                value={formTime}
                                mode="time"
                                is24Hour
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                                    if (Platform.OS === 'ios') {
                                        // iOS: mantiene el spinner abierto mientras se gira.
                                        if (selectedDate) setFormTime(selectedDate);
                                    } else {
                                        // Android: el diálogo se cierra al elegir/desechar.
                                        setShowTimePicker(false);
                                        if (event.type === 'set' && selectedDate) setFormTime(selectedDate);
                                    }
                                }}
                            />
                        )}

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

            {/* Vista de calendario (Item 3): días con citas agendadas */}
            <Modal
                visible={showCalendar}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCalendar(false)}
            >
                <View style={styles.calendarOverlay}>
                    <View style={[styles.calendarSheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
                        <View style={styles.calendarHeaderRow}>
                            <View>
                                <Text style={styles.calendarSheetTitle}>Calendario de citas</Text>
                                <Text style={styles.calendarSheetSubtitle}>Días marcados con recordatorios</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.calendarCloseBtn}
                                onPress={() => setShowCalendar(false)}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarNav}>
                            <TouchableOpacity
                                style={styles.calendarNavBtn}
                                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={20} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthTitle}>
                                {calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity
                                style={styles.calendarNavBtn}
                                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarWeekRow}>
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((wd) => (
                                <Text key={wd} style={styles.calendarWeekday}>{wd}</Text>
                            ))}
                        </View>

                        {buildMonthGrid(calendarMonth.getFullYear(), calendarMonth.getMonth()).map((week, wi) => (
                            <View key={`week-${wi}`} style={styles.calendarWeekRow}>
                                {week.map((day, di) => {
                                    if (!day) return <View key={`empty-${di}`} style={styles.calendarDayCell} />;
                                    const isToday = isSameDay(day, new Date());
                                    const dayKey =
                                        `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                    const hasReminder = reminderDays.has(dayKey);
                                    return (
                                        <View
                                            key={`day-${di}`}
                                            style={[
                                                styles.calendarDayCell,
                                                hasReminder && styles.calendarDayActive,
                                                isToday && styles.calendarDayToday,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.calendarDayText,
                                                    hasReminder && styles.calendarDayTextActive,
                                                    isToday && styles.calendarDayTextToday,
                                                ]}
                                            >
                                                {day.getDate()}
                                            </Text>
                                            {hasReminder && <View style={styles.calendarDot} />}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}

                        <View style={styles.calendarLegend}>
                            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                            <Text style={styles.calendarLegendText}>Día con cita agendada</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerTextWrap: {
        flex: 1,
    },
    calendarBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    // Selector de hora
    timeField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.chip,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    timeFieldText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    timeFieldHint: {
        flex: 1,
        textAlign: 'right',
        fontSize: 12,
        color: colors.textMuted,
    },
    // Vista de calendario
    calendarOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    calendarSheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    calendarHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    calendarSheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    calendarSheetSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    calendarCloseBtn: {
        padding: 6,
    },
    calendarNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    calendarNavBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarMonthTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        textTransform: 'capitalize',
    },
    calendarWeekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    calendarWeekday: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        paddingVertical: 6,
    },
    calendarDayCell: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 1,
    },
    calendarDayText: {
        fontSize: 14,
        color: colors.text,
    },
    calendarDayActive: {
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    calendarDayTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    calendarDayToday: {
        borderWidth: 1,
        borderColor: colors.border,
    },
    calendarDayTextToday: {
        color: colors.success,
        fontWeight: '800',
    },
    calendarDot: {
        position: 'absolute',
        bottom: 5,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    calendarLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        justifyContent: 'center',
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    calendarLegendText: {
        fontSize: 12,
        color: colors.textSecondary,
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
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
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
        color: colors.textMuted,
        letterSpacing: 1,
        marginBottom: 10,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.background,
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
        color: colors.warningText,
        backgroundColor: colors.warningBackground,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    date: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500'
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
        lineHeight: 22,
    },
    cardTitleDone: {
        textDecorationLine: 'line-through',
        color: colors.textMuted,
    },
    cardNotes: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    tapHint: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 6,
        fontStyle: 'italic',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        marginBottom: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    actionBtnText: {
        fontSize: 11,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 28,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
    },
    fieldInput: {
        backgroundColor: colors.chip,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.text,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fieldInputMulti: {
        height: 80,
        textAlignVertical: 'top',
    },
    calendarHint: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 20,
        lineHeight: 17,
        backgroundColor: colors.primarySoft,
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
        borderColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: isDark ? '#1e3a5f' : '#93c5fd',
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
});
