import { useCallback, useEffect, useRef } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useForegroundRevision } from '../context/ForegroundRevisionContext';
export { useAppExitModal, type UseAppExitModalOptions, type UseAppExitModalReturn } from './useAppExitModal';

// ============================================================
// Hooks unificados de interceptación del botón/gesto atrás (Android)
// ============================================================
// Principios arquitectónicos:
// 1. Devuelven ESTRICTAMENTE `true` de forma síncrona en el callback.
//    Esto garantiza que ni el SO (Android puro, MIUI/HyperOS, OneUI, etc.)
//    ejecute su acción destructiva por defecto (`finishActivity()`).
// 2. Manejo de referencias mutables para evitar cierres obsoletos (stale closures).
// 3. Re-sincronización tras segundo plano.

/** Constante que indica a Android que el evento 'hardwareBackPress' ha sido consumido. */
const CONSUME_BACK_PRESS = true;

/**
 * Hook para interceptar la salida en una pantalla o pestaña.
 * Se apoya en useFocusEffect para pantallas aisladas.
 */
export function useExitBackHandler(onRequestExit: () => void): void {
    const revision = useForegroundRevision();
    const handlerRef = useRef(onRequestExit);
    handlerRef.current = onRequestExit;

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return undefined;
            const onBackPress = (): boolean => {
                handlerRef.current();
                return CONSUME_BACK_PRESS;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [revision])
    );
}

/**
 * Botón atrás en una pantalla de STACK (p. ej. procedure/[slug], tasas, mi-carpeta).
 * `onBackPress` ejecuta el retroceso seguro y su retorno se garantiza consumido.
 */
export function useStackBackHandler(onBackPress: () => void): void {
    const revision = useForegroundRevision();
    const handlerRef = useRef(onBackPress);
    handlerRef.current = onBackPress;

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return undefined;
            const onHardwareBack = (): boolean => {
                handlerRef.current();
                return CONSUME_BACK_PRESS;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
            return () => subscription.remove();
        }, [revision])
    );
}

/** Contrato mínimo de router que necesita `createGoBackSafely`. */
export interface SafeBackRouter {
    canGoBack?: () => boolean;
    back?: () => void;
    replace: (href: string) => void;
}

/**
 * `goBackSafely` unificado: vuelve atrás si el stack lo permite y, si no,
 * regresa a las pestañas de forma segura.
 * SIEMPRE devuelve `true` síncronamente al sistema.
 */
export function createGoBackSafely(
    router: SafeBackRouter | null | undefined
): () => boolean {
    return () => {
        try {
            if (router?.canGoBack?.()) {
                router.back?.();
                return CONSUME_BACK_PRESS;
            }
            router?.replace('/(tabs)');
        } catch {
            // Protección: nunca propagar excepciones en el handler de hardware
        }
        return CONSUME_BACK_PRESS;
    };
}

/**
 * Re-sincroniza oyentes nativos y estado al volver de segundo plano (AppState -> active).
 */
export function useBackHandlerResync(onResume?: () => void): void {
    const onResumeRef = useRef(onResume);
    onResumeRef.current = onResume;

    useEffect(() => {
        if (Platform.OS !== 'android') return undefined;
        let current = AppState.currentState;
        const subscription = AppState.addEventListener('change', (next) => {
            const resumed = next === 'active' && current !== 'active';
            current = next;
            if (!resumed) return;
            try {
                onResumeRef.current?.();
            } catch {
                // Silencioso: un fallo secundario nunca debe romper el resume
            }
        });
        return () => subscription.remove();
    }, []);
}
