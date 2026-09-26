// ===========================================
// TRAMI ESPAÑA - Detección de red y feedback offline (v1.3.1)
// ===========================================
// Reemplaza los spinners/bloqueos por red por un aviso discreto. La app
// NUNCA se bloquea sin conexión: sigue mostrando la caché local
// (catálogo de trámites, favoritos, recordatorios y "Mi Carpeta").

import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type ConnectionQuality = 'online' | 'offline' | 'unknown';

export interface NetworkStatus {
  /** true solo cuando confirmados que NO hay red. */
  isOffline: boolean;
  /** Estado de la última comprobación. */
  quality: ConnectionQuality;
  /** Nombre del tipo de conexión (wifi, cellular...). */
  connectionType: string;
}

/**
 * Suscribe a los cambios de conectividad de NetInfo.
 *
 * Decisión de diseño: arrancamos en `unknown` (no offline) para no mostrar
 * el aviso de "sin conexión" antes de que NetInfo haya respondido. Solo
 * marcamos offline cuando la señal es inequívoca.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOffline: false,
    quality: 'unknown',
    connectionType: 'unknown',
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const apply = (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
      type: string;
    }) => {
      // `isInternetReachable === null` significa "aún sin determinar":
      // no lo tratamos como offline para evitar falsos positivos.
      const reachable = state.isInternetReachable;
      const confirmedOffline =
        state.isConnected === false || reachable === false;
      setStatus({
        isOffline: confirmedOffline,
        quality: confirmedOffline
          ? 'offline'
          : reachable === true || state.isConnected === true
            ? 'online'
            : 'unknown',
        connectionType: state.type ?? 'unknown',
      });
    };

    try {
      unsubscribeRef.current = NetInfo.addEventListener(apply);
      // Primera comprobación inmediata (el evento no siempre se dispara al montar).
      void NetInfo.fetch().then(apply).catch(() => undefined);
    } catch {
      // NetInfo no disponible (web/tests): la app funciona sin el aviso.
      setStatus({ isOffline: false, quality: 'unknown', connectionType: 'unknown' });
    }

    return () => {
      try {
        unsubscribeRef.current?.();
      } catch {
        // Silencioso.
      }
      unsubscribeRef.current = null;
    };
  }, []);

  return status;
}

/** Mensaje corto que se muestra en el aviso de red. */
export const OFFLINE_TOAST_MESSAGE = 'Sin conexion — mostrando datos guardados';
