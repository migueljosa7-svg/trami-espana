import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { useStackBackHandler, createGoBackSafely } from '../src/hooks/useBackHandler';
import {
  IDENTITY_METHODS,
  IdentityMethodId,
  getIdentityMethod,
  getDifficultyLabel,
} from '../src/services/identityGuide';
import { hapticLight, hapticSuccess } from '../src/services/notifications';
import { OfflineToast } from '../components/OfflineToast';

/**
 * ============================================================
 * KILLER FEATURE #3 (v1.3.1) - Guia de Identidad Digital
 * ============================================================
 * Miniasistente paso a paso para configurar Cl@ve Permanente, el
 * Certificado Digital de la FNMT o el Cl@ve basico por SMS en el movil.
 *
 * Es el problema n.1 de los ciudadanos en Espana: sin identidad electronica
 * no se puede hacer casi ningun tramite online.
 *
 * Cada metodo declara sus pasos y una "trampa frecuente" por paso, que es
 * justo donde los usuarios se atascan (PIN que caduca, clave de seguridad
 * confundida con el PIN, telefono no actualizado en la AEAT, etc.).
 */
export default function GuiaIdentidadScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBackSafely = useMemo(
    () => createGoBackSafely(router as Parameters<typeof createGoBackSafely>[0]),
    [router],
  );
  useStackBackHandler(goBackSafely);

  const [selectedId, setSelectedId] = useState<IdentityMethodId>('clave-permanente');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const method = useMemo(() => getIdentityMethod(selectedId), [selectedId]);

  const toggleStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const nextValue = !prev[stepId];
      if (nextValue) hapticSuccess();
      else hapticLight();
      return { ...prev, [stepId]: nextValue };
    });
  }, []);

  const doneCount = useMemo(
    () => method.steps.filter((s) => completedSteps[`${method.id}-${s.order}`]).length,
    [method, completedSteps],
  );
  // Porcentaje dinamico respecto a los pasos REALES del metodo elegido.
  const progress =
    method.steps.length > 0 ? Math.round((doneCount / method.steps.length) * 100) : 0;

  const resetProgress = useCallback(() => {
    setCompletedSteps(() => ({}));
    hapticLight();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          ELIGE TU MÉTODO
        </Text>
        <View style={styles.methodList}>
          {IDENTITY_METHODS.map((m) => {
            const isActive = m.id === selectedId;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setSelectedId(m.id)}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: isActive ? colors.primarySoft : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
              >
                <View
                  style={[
                    styles.methodIcon,
                    { backgroundColor: isActive ? colors.primary : colors.chip },
                  ]}
                >
                  <Ionicons
                    name={m.icon as never}
                    size={20}
                    color={isActive ? '#ffffff' : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.methodHeader}>
                    <Text
                      style={[
                        styles.methodTitle,
                        { color: isActive ? colors.primary : colors.text },
                      ]}
                    >
                      {m.label}
                    </Text>
                    {m.recommended && (
                      <View
                        style={[styles.recTag, { backgroundColor: colors.successBackground }]}
                      >
                        <Text style={[styles.recTagText, { color: colors.successText }]}>
                          Recomendado
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.methodPurpose, { color: colors.textSecondary }]}>
                    {m.purpose}
                  </Text>
                  <View style={styles.methodMeta}>
                    <View style={[styles.diffDot, { backgroundColor: colors.warning }]} />
                    <Text style={[styles.methodMetaText, { color: colors.textMuted }]}>
                      {getDifficultyLabel(m.difficulty)} · {m.steps.length} pasos
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[
            styles.progressCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.text }]}>
              Progreso: {doneCount}/{method.steps.length} pasos
            </Text>
            <Text
              style={[
                styles.progressPercent,
                { color: progress === 100 ? colors.success : colors.primary },
              ]}
            >
              {progress}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.chip }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? colors.success : colors.primary,
                },
              ]}
            />
          </View>
          {progress > 0 && (
            <TouchableOpacity
              onPress={resetProgress}
              style={styles.resetBtn}
              accessibilityRole="button"
              accessibilityLabel="Reiniciar progreso"
            >
              <Ionicons name="refresh" size={14} color={colors.textMuted} />
              <Text style={[styles.resetText, { color: colors.textMuted }]}>Reiniciar</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          PASOS · {method.label.toUpperCase()}
        </Text>
        {method.steps.map((step) => {
          const stepId = `${method.id}-${step.order}`;
          const isDone = !!completedSteps[stepId];
          return (
            <View
              key={stepId}
              style={[
                styles.stepCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDone ? colors.success : colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.stepHeader}
                onPress={() => toggleStep(stepId)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                accessibilityLabel={`Paso ${step.order}: ${step.title}`}
              >
                <View
                  style={[
                    styles.stepBadge,
                    { backgroundColor: isDone ? colors.success : colors.primary },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  ) : (
                    <Text style={styles.stepBadgeText}>{step.order}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color: colors.text,
                      textDecorationLine: isDone ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {step.title}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>
                {step.detail}
              </Text>

              {step.tip ? (
                <View
                  style={[
                    styles.tipBox,
                    {
                      backgroundColor: colors.warningBackground,
                      borderColor: colors.warningBorder,
                    },
                  ]}
                >
                  <Ionicons name="bulb-outline" size={14} color={colors.warningText} />
                  <Text style={[styles.tipText, { color: colors.warningText }]}>
                    {step.tip}
                  </Text>
                </View>
              ) : null}

              {step.helpUrl ? (
                <TouchableOpacity
                  style={styles.helpBtn}
                  onPress={() => void Linking.openURL(step.helpUrl as string)}
                  accessibilityRole="link"
                  accessibilityLabel={`Ayuda para el paso ${step.order}`}
                >
                  <Text style={[styles.helpText, { color: colors.primary }]}>
                    Ver ayuda oficial ↗
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        <TouchableOpacity
          onPress={() => void Linking.openURL(method.requestUrl)}
          style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`Solicitar ${method.label} en la sede`}
        >
          <Ionicons name="open-outline" size={17} color="#ffffff" />
          <Text style={styles.ctaText}>Solicitar en la sede oficial</Text>
        </TouchableOpacity>
      </ScrollView>

      <OfflineToast />
    </View>
  );
}

/** Estilos de la guía. Los colores se inyectan en línea por ser dinámicos. */
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 6 },
  methodList: { gap: 8 },
  methodCard: { flexDirection: 'row', gap: 11, borderRadius: 14, borderWidth: 1, padding: 13 },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  methodTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  recTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  recTagText: { fontSize: 10, fontWeight: '800' },
  methodPurpose: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  methodMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  methodMetaText: { fontSize: 11, fontWeight: '600' },
  progressCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 9 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { fontSize: 13, fontWeight: '700' },
  progressPercent: { fontSize: 15, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  resetText: { fontSize: 12, fontWeight: '600' },
  stepCard: { borderRadius: 14, borderWidth: 1, padding: 13, gap: 9 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  stepTitle: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  stepDetail: { fontSize: 13, lineHeight: 19 },
  tipBox: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },
  helpBtn: { alignSelf: 'flex-start' },
  helpText: { fontSize: 12, fontWeight: '700' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  ctaText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
