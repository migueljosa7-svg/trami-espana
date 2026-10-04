import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

export interface UseAppExitModalOptions {
    /**
     * Si está activo el interceptor del botón atrás del SO.
     * Por defecto es true.
     */
    enabled?: boolean;
    /**
     * Comprobación opcional de si la navegación puede retroceder antes de mostrar el modal.
     * Si retorna true, la salida no se muestra y se delega en la navegación hacia atrás.
     */
    canGoBack?: () => boolean;
    /**
     * Callback invocado cuando canGoBack() es true.
     */
    onGoBack?: () => void;
}

export interface UseAppExitModalReturn {
    showExitModal: boolean;
    setShowExitModal: (visible: boolean) => void;
    openExitModal: () => void;
    closeExitModal: () => void;
    confirmExit: () => void;
}

/**
 * Hook unificado y universal para el control de salida de la aplicación en Android.
 *
 * Características clave:
 * 1. Interceptación síncrona estricta: siempre retorna `true` en el listener nativo
 *    de `BackHandler` para garantizar que ni el SO ni capas de personalización
 *    (MIUI / HyperOS de Xiaomi/Redmi, OneUI de Samsung, ColorOS, etc.) ejecuten
 *    `finishActivity()` antes de que React procese el evento.
 * 2. Cero cierres obsoletos (stale closures): utiliza referencias mutables sincronizadas
 *    en cada ciclo de render para que el listener siempre evalúe el estado más reciente
 *    sin obligar a re-suscribir el evento en la cola nativa.
 * 3. Comportamiento en dos fases:
 *    - Si el modal ya está visible: pulsar "Atrás" cierra el modal (onRequestClose).
 *    - Si el modal no está visible: si puede retroceder en el stack lo hace, si no, abre el modal.
 */
export function useAppExitModal(options?: UseAppExitModalOptions): UseAppExitModalReturn {
    const [showExitModal, setShowExitModal] = useState<boolean>(false);

    const showModalRef = useRef<boolean>(showExitModal);
    showModalRef.current = showExitModal;

    const optionsRef = useRef<UseAppExitModalOptions | undefined>(options);
    optionsRef.current = options;

    const openExitModal = useCallback(() => {
        setShowExitModal(true);
    }, []);

    const closeExitModal = useCallback(() => {
        setShowExitModal(false);
    }, []);

    const confirmExit = useCallback(() => {
        setShowExitModal(false);
        if (Platform.OS === 'android') {
            BackHandler.exitApp();
        }
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'android') return undefined;
        if (options?.enabled === false) return undefined;

        const onHardwareBack = (): boolean => {
            // Fase A: Si el modal de confirmación está abierto, el botón atrás lo cierra
            if (showModalRef.current) {
                setShowExitModal(false);
                return true; // Consumido síncronamente
            }

            // Fase B: Si el stack de navegación puede retroceder, navega atrás
            const currentOpts = optionsRef.current;
            if (currentOpts?.canGoBack && currentOpts.canGoBack()) {
                currentOpts.onGoBack?.();
                return true; // Consumido síncronamente
            }

            // Fase C: Estamos en la pantalla raíz de salida -> mostramos modal
            setShowExitModal(true);
            return true; // Consumido síncronamente: previene el cierre inmediato del OS
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
        return () => subscription.remove();
    }, [options?.enabled]);

    return {
        showExitModal,
        setShowExitModal,
        openExitModal,
        closeExitModal,
        confirmExit,
    };
}
