import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { useStackBackHandler, createGoBackSafely } from '../src/hooks/useBackHandler';
import {
  OFFICIAL_FEES,
  OfficialFee,
  ExemptionId,
  Exemption,
  MODELO_790_PAYMENT_URL,
  calculateFeeWithExemption,
  formatFeeAmount,
  getExemptionsForFee,
} from '../src/services/fees';
import { hapticLight, hapticSuccess } from '../src/services/notifications';
import { OfflineToast } from '../components/OfflineToast';

/**
 * ============================================================
 * KILLER FEATURE #2 (v1.3.1) - Calculadora de Tasas y Modelo 790
 * ============================================================
 * Consulta rapida de las tasas oficiales y comprobacion de exenciones del
 * 100% (familia numerosa, IMV, discapacidad, etc.) antes de pagar.
 *
 * La app NUNCA cobra: solo informa y redirige a la pasarela oficial del
 * modelo 790. Cada importe muestra su fecha de revision y avisa de que las
 * tasas se actualizan cada ano en el BOE.
 */
export default function TasasScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBackSafely = useMemo(
    () => createGoBackSafely(router as Parameters<typeof createGoBackSafely>[0]),
    [router],
  );
  useStackBackHandler(goBackSafely);

  const [selectedId, setSelectedId] = useState<string>(OFFICIAL_FEES[0].id);
  const [exemptionId, setExemptionId] = useState<ExemptionId | null>(null);
  const [showExemptions, setShowExemptions] = useState(false);

  const selectedFee: OfficialFee | null = useMemo(
    () => OFFICIAL_FEES.find((f) => f.id === selectedId) ?? null,
    [selectedId],
  );

  const exemptions: Exemption[] = useMemo(
    () => (selectedFee ? getExemptionsForFee(selectedFee.id) : []),
    [selectedFee],
  );

  const check = useMemo(
    () => calculateFeeWithExemption(selectedId, exemptionId),
    [selectedId, exemptionId],
  );

  const openPay = useCallback(() => {
    hapticLight();
    void Linking.openURL(MODELO_790_PAYMENT_URL);
  }, []);

  const openSede = useCallback(() => {
    if (!selectedFee) return;
    hapticLight();
    void Linking.openURL(selectedFee.sedeUrl);
  }, [selectedFee]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Aviso de fiabilidad de los importes */}
        <View
          style={[
            styles.notice,
            {
              backgroundColor: colors.warningBackground,
              borderColor: colors.warningBorder,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.warningText}
          />
          <Text style={[styles.noticeText, { color: colors.warningText }]}>
            Importes orientativos revisados en enero de 2026. Las tasas cambian
            cada año: confirma siempre el importe oficial en la sede.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          ELIGE EL TRÁMITE
        </Text>
        <View style={styles.feeGrid}>
          {OFFICIAL_FEES.map((fee) => {
            const isActive = fee.id === selectedId;
            return (
              <TouchableOpacity
                key={fee.id}
                onPress={() => {
                  setSelectedId(fee.id);
                  setExemptionId(null);
                  hapticLight();
                }}
                style={[
                  styles.feeChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.feeChipText,
                    { color: isActive ? '#ffffff' : colors.text },
                  ]}
                >
                  {fee.label}
                </Text>
                <Text
                  style={[
                    styles.feeChipAmount,
                    { color: isActive ? '#E0EAFF' : colors.textSecondary },
                  ]}
                >
                  {formatFeeAmount(fee.amount)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Detalle del importe y total a pagar */}
        {check && (
          <View
            style={[
              styles.totalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Importe a pagar
            </Text>
            <Text
              style={[
                styles.totalAmount,
                {
                  color: check.isExempt
                    ? colors.success
                    : check.amountToPay < check.fee.amount
                      ? colors.warning
                      : colors.text,
                },
              ]}
            >
              {formatFeeAmount(check.amountToPay)}
            </Text>

            {check.isExempt && (
              <View
                style={[
                  styles.exemptBadge,
                  {
                    backgroundColor: colors.successBackground,
                    borderColor: colors.successBorder,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={colors.successText}
                />
                <Text style={[styles.exemptBadgeText, { color: colors.successText }]}>
                  Exención del 100% aplicada
                </Text>
              </View>
            )}

            <View style={styles.metaGrid}>
              <MetaRow label="Código de tasa" value={check.fee.feeCode} colors={colors} />
              <MetaRow label="Organismo" value={check.fee.organism} colors={colors} />
              <MetaRow label="Revisado" value={check.fee.lastReviewed} colors={colors} />
            </View>

            {check.fee.note ? (
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {check.fee.note}
              </Text>
            ) : null}

            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              {check.disclaimer}
            </Text>

            <TouchableOpacity
              onPress={() => setShowExemptions(true)}
              style={[
                styles.exemptionBtn,
                { borderColor: colors.border, backgroundColor: colors.chip },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ver exenciones y bonificaciones"
            >
              <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
              <Text style={[styles.exemptionBtnText, { color: colors.text }]}>
                ¿Tengo exención? Comprobar ({exemptions.length})
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openPay}
              style={[styles.payBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={`Pagar modelo 790 de ${check.fee.label}`}
            >
              <Ionicons name="card-outline" size={17} color="#ffffff" />
              <Text style={styles.payBtnText}>Pagar Modelo 790</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openSede}
              style={[styles.sedeBtn, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Ir a la sede electrónica"
            >
              <Ionicons name="open-outline" size={15} color={colors.primary} />
              <Text style={[styles.sedeBtnText, { color: colors.primary }]}>
                Ir a la sede electrónica
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <OfflineToast />

      <ExemptionsModal
        visible={showExemptions}
        colors={colors}
        exemptions={exemptions}
        selected={exemptionId}
        feeAmount={check?.fee.amount ?? 0}
        onSelect={(id) => {
          setExemptionId(id);
          hapticSuccess();
        }}
        onClose={() => setShowExemptions(false)}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

/** Fila etiqueta/valor del bloque de metadatos. */
function MetaRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

/** Modal con el catálogo de exenciones aplicables al trámite elegido. */
function ExemptionsModal({
  visible,
  colors,
  exemptions,
  selected,
  feeAmount,
  onSelect,
  onClose,
  bottomInset,
}: {
  visible: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  exemptions: Exemption[];
  selected: ExemptionId | null;
  feeAmount: number;
  onSelect: (id: ExemptionId | null) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.card, paddingBottom: bottomInset + 20 },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Comprueba tu exención
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Marca la condición que se te aplique. La Administración verifica
            siempre la documentación.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
            {/* Opción "no exento" */}
            <TouchableOpacity
              onPress={() => onSelect(null)}
              style={[
                styles.exemptItem,
                {
                  backgroundColor:
                    selected === null ? colors.primarySoft : colors.chip,
                  borderColor: selected === null ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === null }}
            >
              <Text
                style={[
                  styles.exemptItemTitle,
                  { color: selected === null ? colors.primary : colors.text },
                ]}
              >
                No me exento — pago {formatFeeAmount(feeAmount)}
              </Text>
            </TouchableOpacity>

            {exemptions.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                onPress={() => onSelect(selected === ex.id ? null : ex.id)}
                style={[
                  styles.exemptItem,
                  {
                    backgroundColor:
                      selected === ex.id ? colors.primarySoft : colors.chip,
                    borderColor:
                      selected === ex.id ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: selected === ex.id }}
              >
                <View style={styles.exemptItemHeader}>
                  <Ionicons
                    name={selected === ex.id ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selected === ex.id ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.exemptItemTitle,
                      { color: selected === ex.id ? colors.primary : colors.text },
                    ]}
                  >
                    {ex.label}
                  </Text>
                  {ex.fullExemption && (
                    <View style={[styles.fullTag, { backgroundColor: colors.successBackground }]}>
                      <Text style={[styles.fullTagText, { color: colors.successText }]}>
                        100%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.exemptItemDetail, { color: colors.textSecondary }]}>
                  {ex.requirement}
                </Text>
                <Text style={[styles.exemptItemLegal, { color: colors.textMuted }]}>
                  {ex.legalBasis}
                  {ex.requiresJustification ? ' · Requiere justificante' : ''}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={onClose}
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.applyBtnText}>Aplicar y cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Estilos de la pantalla. Los colores se inyectan en línea por ser dinámicos. */
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 6 },
  feeGrid: { gap: 8 },
  feeChip: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 2 },
  feeChipText: { fontSize: 14, fontWeight: '700' },
  feeChipAmount: { fontSize: 12, fontWeight: '600' },
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, marginTop: 4 },
  totalLabel: { fontSize: 12, fontWeight: '700' },
  totalAmount: { fontSize: 30, fontWeight: '800' },
  exemptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  exemptBadgeText: { fontSize: 12, fontWeight: '700' },
  metaGrid: { gap: 5, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metaLabel: { fontSize: 12, fontWeight: '600' },
  metaValue: { fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  note: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  disclaimer: { fontSize: 11, lineHeight: 16, fontStyle: 'italic', marginTop: 4 },
  exemptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  exemptionBtnText: { flex: 1, fontSize: 13, fontWeight: '600' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  payBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  sedeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  sedeBtnText: { fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  exemptItem: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 4 },
  exemptItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exemptItemTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  exemptItemDetail: { fontSize: 12, lineHeight: 17, paddingLeft: 26 },
  exemptItemLegal: { fontSize: 11, paddingLeft: 26 },
  fullTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  fullTagText: { fontSize: 10, fontWeight: '800' },
  applyBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  applyBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
