import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { useStackBackHandler, createGoBackSafely } from '../src/hooks/useBackHandler';
import {
  DOCUMENT_KINDS,
  DocumentKind,
  TrackedDocument,
  addDocument,
  formatDaysRemaining,
  formatExpiryDate,
  getDocumentKindInfo,
  getExpiryStatus,
  ExpiryStatus,
  loadDocuments,
  removeDocument,
  sortByUrgency,
  summarizeDocuments,
} from '../src/services/documents';
import {
  ensureNotificationPermissions,
  hapticSuccess,
  hapticWarning,
  scheduleDocumentExpiryAlerts,
} from '../src/services/notifications';
import { OfflineToast } from '../components/OfflineToast';
import { SkeletonCard } from '../components/SkeletonLoader';

/**
 * ============================================================
 * KILLER FEATURE #1 (v1.3.1) - Mi Carpeta de Caducidades
 * ============================================================
 * Control de vencimientos de documentos clave. Los datos viven SOLO en el
 * dispositivo (AsyncStorage) y nunca se suben a la nube.
 *
 * Semaforo de color:
 *   verde    -> mas de 90 dias
 *   ambar    -> entre 31 y 89 dias
 *   rojo     -> 30 dias o menos
 *   granate  -> ya caducado
 */
const STATUS_COLORS: Record<ExpiryStatus, { light: string; dark: string }> = {
  valid: { light: '#16a34a', dark: '#4ade80' },
  warning: { light: '#d97706', dark: '#fbbf24' },
  urgent: { light: '#dc2626', dark: '#f87171' },
  expired: { light: '#991b1b', dark: '#fca5a5' },
};

export default function MiCarpetaScreen() {
  const { colors, isDark } = useTheme();
  
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBackSafely = useMemo(
    () => createGoBackSafely(router as Parameters<typeof createGoBackSafely>[0]),
    [router],
  );
  useStackBackHandler(goBackSafely);

  const [documents, setDocuments] = useState<TrackedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState<DocumentKind>('dni');
  const [formLabel, setFormLabel] = useState('');
  const [formDate, setFormDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const docs = await loadDocuments();
    setDocuments(sortByUrgency(docs));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => summarizeDocuments(documents), [documents]);
  const accentOf = useCallback(
    (status: ExpiryStatus) => STATUS_COLORS[status][isDark ? 'dark' : 'light'],
    [isDark],
  );

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const doc = await addDocument({
        kind: formKind,
        label: formLabel,
        expiresAt: formDate,
      });
      await refresh();
      hapticSuccess();
      setShowForm(false);
      setFormLabel('');

      // Programa los avisos: 3 meses, 1 mes, 24 h y el dia de la caducidad.
      const granted = await ensureNotificationPermissions();
      if (granted) {
        const scheduled = await scheduleDocumentExpiryAlerts({
          id: doc.id,
          docType: doc.label,
          expiresAt: new Date(doc.expiresAt),
        });
        if (scheduled > 0) {
          Alert.alert(
            'Guardado',
            `Te avisaremos ${scheduled} ${
              scheduled === 1 ? 'vez' : 'veces'
            } antes de que caduque.`,
          );
        }
      }
    } catch {
      hapticWarning();
      Alert.alert('Error', 'No se pudo guardar el documento.');
    } finally {
      setSaving(false);
    }
  }, [formKind, formLabel, formDate, refresh, saving]);

  const handleDelete = useCallback(
    (doc: TrackedDocument) => {
      Alert.alert(
        'Eliminar documento',
        `¿Seguro que quieres eliminar "${doc.label}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void removeDocument(doc.id).then(() => {
                void refresh();
                hapticSuccess();
              });
            },
          },
        ],
      );
    },
    [refresh],
  );

  const onDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      setShowPicker(false);
      if (event.type === 'set' && date) setFormDate(date);
    },
    [],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {documents.length > 0 && (
          <View
            style={[
              styles.summary,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Resumen</Text>
            <View style={styles.summaryRow}>
              <SummaryChip
                label="Caducados"
                value={summary.expired}
                color={accentOf('expired')}
                colors={colors}
              />
              <SummaryChip
                label="< 30 días"
                value={summary.urgent}
                color={accentOf('urgent')}
                colors={colors}
              />
              <SummaryChip
                label="< 90 días"
                value={summary.warning}
                color={accentOf('warning')}
                colors={colors}
              />
              <SummaryChip
                label="En vigor"
                value={summary.valid}
                color={accentOf('valid')}
                colors={colors}
              />
            </View>
          </View>
        )}

        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : documents.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Tu carpeta está vacía
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Añade la fecha de caducidad de tu DNI, pasaporte o carnet de
              conducir y te avisaremos 3 meses y 1 mes antes de que caduque.
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              onPress={() => setShowForm(true)}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.emptyCtaText}>Añadir mi primer documento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          documents.map((doc) => {
            const status = getExpiryStatus(doc.expiresAt);
            const accent = accentOf(status);
            const info = getDocumentKindInfo(doc.kind);
            return (
              <View
                key={doc.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                accessibilityLabel={`${doc.label}, ${formatDaysRemaining(doc.expiresAt)}`}
              >
                <View style={[styles.cardAccent, { backgroundColor: accent }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: colors.chip }]}>
                      <Ionicons name={info.icon as never} size={20} color={accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {doc.label}
                      </Text>
                      <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                        Caduca el {formatExpiryDate(doc.expiresAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(doc)}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${doc.label}`}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.badge, { backgroundColor: `${accent}1A` }]}>
                    <Text style={[styles.badgeText, { color: accent }]}>
                      {formatDaysRemaining(doc.expiresAt)}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => void Linking.openURL(info.appointmentUrl)}
                      accessibilityRole="button"
                      accessibilityLabel={`Pedir cita previa para ${doc.label}`}
                    >
                      <Ionicons name="calendar-outline" size={15} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Pedir cita previa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionGhost, { borderColor: colors.border }]}
                      onPress={() => router.push(`/procedure/${info.procedureSlug}`)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.actionGhostText, { color: colors.text }]}>
                        Ver trámite
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {documents.length > 0 && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primary, bottom: insets.bottom + 20 },
          ]}
          onPress={() => setShowForm(true)}
          accessibilityRole="button"
          accessibilityLabel="Añadir documento"
        >
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      )}

      <OfflineToast />

      <FormModal
        visible={showForm}
        colors={colors}
        formKind={formKind}
        setFormKind={setFormKind}
        formLabel={formLabel}
        setFormLabel={setFormLabel}
        formDate={formDate}
        setShowPicker={setShowPicker}
        showPicker={showPicker}
        onDateChange={onDateChange}
        saving={saving}
        bottomInset={insets.bottom}
        onClose={() => setShowForm(false)}
        onSave={() => void handleSave()}
      />
    </View>
  );
}

/** Chip compacto del resumen superior. */
function SummaryChip({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: number;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  
  return (
    <View style={[styles.summaryChip, { backgroundColor: colors.chip }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/** Modal de alta de un documento. */
function FormModal({
  visible,
  colors,
  formKind,
  setFormKind,
  formLabel,
  setFormLabel,
  formDate,
  setShowPicker,
  showPicker,
  onDateChange,
  saving,
  bottomInset,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  formKind: DocumentKind;
  setFormKind: (k: DocumentKind) => void;
  formLabel: string;
  setFormLabel: (v: string) => void;
  formDate: Date;
  setShowPicker: (v: boolean) => void;
  showPicker: boolean;
  onDateChange: (e: DateTimePickerEvent, d?: Date) => void;
  saving: boolean;
  bottomInset: number;
  onClose: () => void;
  onSave: () => void;
}) {
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.card, paddingBottom: bottomInset + 20 },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nuevo documento
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Tipo de documento
            </Text>
            <View style={styles.kindGrid}>
              {DOCUMENT_KINDS.map((k) => (
                <TouchableOpacity
                  key={k.kind}
                  onPress={() => setFormKind(k.kind)}
                  style={[
                    styles.kindChip,
                    {
                      backgroundColor:
                        formKind === k.kind ? colors.primary : colors.chip,
                      borderColor:
                        formKind === k.kind ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: formKind === k.kind }}
                >
                  <Ionicons
                    name={k.icon as never}
                    size={15}
                    color={formKind === k.kind ? '#ffffff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.kindChipText,
                      { color: formKind === k.kind ? '#ffffff' : colors.text },
                    ]}
                  >
                    {k.shortLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Nombre (opcional)
            </Text>
            <TextInput
              value={formLabel}
              onChangeText={setFormLabel}
              placeholder={getDocumentKindInfo(formKind).shortLabel}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.chip,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              maxLength={40}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Fecha de caducidad
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={[
                styles.dateBtn,
                { backgroundColor: colors.chip, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar fecha, actual ${formatExpiryDate(formDate)}`}
            >
              <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              <Text style={[styles.dateBtnText, { color: colors.text }]}>
                {formatExpiryDate(formDate)}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 },
            ]}
            onPress={onSave}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Guardando…' : 'Guardar documento'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={formDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}
    </Modal>
  );
}

/** Estilos de "Mi Carpeta". Los colores se inyectan en línea por ser dinámicos. */
const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 16, gap: 12 },
    summary: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 4 },
    summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryChip: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    summaryValue: { fontSize: 20, fontWeight: '800' },
    summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
    empty: { borderRadius: 18, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
    emptyTitle: { fontSize: 17, fontWeight: '700' },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 6,
    },
    emptyCtaText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
    card: { borderRadius: 16, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
    cardAccent: { width: 5 },
    cardBody: { flex: 1, padding: 14, gap: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardDate: { fontSize: 12, marginTop: 2 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 10,
      borderRadius: 10,
    },
    actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
    actionGhost: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
    },
    actionGhostText: { fontSize: 13, fontWeight: '600' },
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.55)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '88%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 7 },
    kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    kindChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    kindChipText: { fontSize: 12, fontWeight: '600' },
    input: {
      borderRadius: 11,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 15,
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      borderRadius: 11,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 12,
    },
    dateBtnText: { fontSize: 15, fontWeight: '600' },
    saveBtn: { marginTop: 18, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  });
