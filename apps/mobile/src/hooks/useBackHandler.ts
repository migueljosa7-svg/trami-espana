import { useCallback, useEffect, useRef } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useForegroundRevision } from '../context/ForegroundRevisionContext';

// ============================================================
// Hooks de interceptación del botón atrás físico (v1.3.1)
// ============================================================
// Todos comparten la misma garantía:
//   1. Devuelven ESTRICTAMENTE `true` para que el SO nunca ejecute su
//      comportamiento por defecto (cerrar la app).
//   2. Se re-registran al volver de segundo plano mediante
//      `useForegroundRevision()` como dependencia del `useFocusEffect`,
//      porque al restaurar la app el FOCO no cambia y, por tanto,
//      `useFocusEffect` no volvería a ejecutarse por sí solo.

/** Evita que el SO ejecute su acción por defecto. */
const CONSUME_BACK_PRESS = true;

/**
 * Botón atrás en una PESTAÑA RAÍZ: muestra el modal de confirmación de
 * salida en lugar de cerrar la app.
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
 * Botón atrás en una pantalla de STACK (p. ej. procedure/[slug]).
 * `onBackPress` ejecuta el retroceso seguro y su valor de retorno se
 * ignora: el evento SIEMPRE queda consumido.
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
 * regresa a las pestañas.
 *
 * NOTA v1.3.1: la versión anterior devolvía `false` en la rama
 * `router.replace('/(tabs)')`. En Android eso indicaba al SO "no he
 * consumido el evento", por lo que ejecutaba `finishActivity()` y la app se
 * cerraba en lugar de navegar. Ahora SIEMPRE devuelve `true`.
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
            // Nunca propagamos: el botón atrás jamás debe romper la app.
        }
        return CONSUME_BACK_PRESS;
    };
}

/**
 * Re-sincroniza los oyentes nativos al volver de segundo plano y ejecuta
 * `onResume` (p. ej. re-aplicar los estilos de la barra del sistema).
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
                // Silencioso: un fallo de estilo nunca debe romper el resume.
            }
        });
        return () => subscription.remove();
    }, []);
}
