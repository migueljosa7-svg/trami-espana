import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';
import { OFFLINE_TOAST_MESSAGE, useNetworkStatus } from '../src/hooks/useNetworkStatus';

interface OfflineToastProps {
  /** Segundos que permanece visible el aviso. */
  durationMs?: number;
}

/**
 * Aviso discreto de "sin conexión" (v1.3.1).
 *
 * Requisitos de UX:
 *  - NO bloquea la app: la caché local sigue siendo usable.
 *  - Aparece y desaparece solo (auto-dismiss) para no cansar al usuario.
 *  - Es pulsable para descartarlo antes de tiempo.
 *
 * @see useNetworkStatus para la fuente de verdad de la conectividad.
 */
export function OfflineToast({ durationMs = 4000 }: OfflineToastProps) {
  const { colors } = useTheme();
  const { isOffline } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Limpia el temporizador anterior para no dejar timers colgados.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isOffline) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), durationMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOffline, durationMs]);

  if (!visible) return null;

  return (
    <View
      style={styles.wrapper}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={() => setVisible(false)}
        style={[
          styles.toast,
          {
            backgroundColor: colors.warningBackground,
            borderColor: colors.warningBorder,
          },
        ]}
        accessibilityRole="alert"
        accessibilityLabel={OFFLINE_TOAST_MESSAGE}
      >
        <Ionicons name="cloud-offline-outline" size={16} color={colors.warningText} />
        <Text style={[styles.text, { color: colors.warningText }]} numberOfLines={2}>
          {OFFLINE_TOAST_MESSAGE}
        </Text>
        <Ionicons name="close" size={16} color={colors.warningText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  text: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
