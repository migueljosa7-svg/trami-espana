import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent, type View } from 'react-native';

/**
 * Altura (dp) con la que el teclado TAPA realmente al contenedor en Android.
 *
 * - Si el sistema ya redimensionó la ventana (`adjustResize`), el borde
 *   inferior del contenedor coincide con el borde superior del teclado y el
 *   resultado es 0: no se compensa dos veces (bug de la v1.4.1).
 * - Si no la redimensionó (edge-to-edge forzado en Android 15/16 con
 *   targetSdk 35+), devuelve exactamente el solapamiento para aplicarlo como
 *   `paddingBottom` y la barra de escritura queda siempre visible.
 *
 * El padding se aplica DENTRO del contenedor medido, así que no altera su
 * marco: no hay bucle de realimentación entre layout y medición.
 * En iOS devuelve siempre 0 (allí se usa KeyboardAvoidingView).
 */
export function useKeyboardOverlap(containerRef: React.RefObject<View | null>) {
    const [overlap, setOverlap] = useState(0);
    const keyboardTopRef = useRef<number | null>(null);

    const measure = useCallback(() => {
        const keyboardTop = keyboardTopRef.current;
        const node = containerRef.current;
        if (keyboardTop == null || !node) {
            setOverlap(0);
            return;
        }
        // `pageY` es relativo a la vista raíz de React, que en edge-to-edge
        // empieza en el borde superior de la pantalla, igual que `screenY`.
        node.measure((_x, _y, _w, height, _pageX, pageY) => {
            const next = Math.max(0, Math.round(pageY + height - keyboardTop));
            setOverlap((prev) => (prev === next ? prev : next));
        });
    }, [containerRef]);

    useEffect(() => {
        if (Platform.OS !== 'android') return undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const onShow = (e: KeyboardEvent) => {
            keyboardTopRef.current = e.endCoordinates.screenY;
            // Se mide tras el posible redimensionado del sistema.
            clearTimeout(timer);
            timer = setTimeout(measure, 80);
        };
        const onHide = () => {
            keyboardTopRef.current = null;
            clearTimeout(timer);
            setOverlap(0);
        };

        const show = Keyboard.addListener('keyboardDidShow', onShow);
        const hide = Keyboard.addListener('keyboardDidHide', onHide);
        return () => {
            clearTimeout(timer);
            show.remove();
            hide.remove();
        };
    }, [measure]);

    /** Llamar desde `onLayout` del contenedor (p. ej. al ocultarse la tab bar). */
    const onContainerLayout = useCallback(() => {
        if (keyboardTopRef.current != null) measure();
    }, [measure]);

    return { keyboardOverlap: overlap, onContainerLayout };
}
