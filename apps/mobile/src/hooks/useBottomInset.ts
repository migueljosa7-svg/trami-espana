// ===========================================
// TRAMI ESPAÑA - Hook de insets seguros
// ===========================================
// Garantiza que los elementos inferiores (tab bar, FAB, botones, modales)
// queden SIEMPRE elevados por encima de la barra de sistema, en cualquier
// dispositivo: Samsung Galaxy A25, Xiaomi, Pixel, iPhone con notch...
//
// - Android 15/16 (targetSdk 35/36, edge-to-edge forzado): insets.bottom
//   devuelve la altura real de la barra de gestos/botones.
// - Android con 3 botones clásicos: insets.bottom también la reporta.
// - Dispositivos sin barra de sistema: insets.bottom = 0 y se aplica el
//   mínimo de seguridad (16 px).

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Mínimo de seguridad inferior (px) exigido por UX. */
export const MIN_BOTTOM_INSET = 16;

/** Mínimo de seguridad superior (px). */
export const MIN_TOP_INSET = 8;

/**
 * Padding inferior seguro para contenedores: el mayor entre el inset
 * real del sistema y el mínimo de seguridad. `Math.max(insets.bottom, 16)`.
 */
export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets?.bottom ?? 0, MIN_BOTTOM_INSET);
}

/** Padding superior seguro (para headers custom bajo la status bar). */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets?.top ?? 0, MIN_TOP_INSET);
}

/** Insets completos con valores garantizados (no negativos). */
export function useSafeEdgeInsets() {
  const insets = useSafeAreaInsets();
  return {
    top: Math.max(insets?.top ?? 0, MIN_TOP_INSET),
    bottom: Math.max(insets?.bottom ?? 0, MIN_BOTTOM_INSET),
    left: Math.max(insets?.left ?? 0, 0),
    right: Math.max(insets?.right ?? 0, 0),
  };
}
