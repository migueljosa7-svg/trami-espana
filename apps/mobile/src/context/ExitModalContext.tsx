// ===========================================
// TRAMI ESPAÑA - ExitModalContext (v1.5.1)
// ===========================================
// Interceptor ÚNICO y global del botón/gesto "Atrás" de Android.
//
// Se monta en la raíz (app/_layout.tsx) y registra un solo listener de
// `hardwareBackPress` que SIEMPRE devuelve `true` de forma síncrona, de modo
// que ni Android ni capas como MIUI/HyperOS, OneUI o ColorOS ejecutan su
// acción por defecto (cerrar la Activity). La decisión se toma según la ruta:
//
//   1. Modal de salida visible       -> se cierra el modal.
//   2. Pestaña Inicio ("/")          -> se muestra SIEMPRE el modal de salida.
//   3. Otra pestaña raíz             -> se vuelve a la pestaña Inicio.
//   4. Pantalla apilada con historial -> router.back().
//   5. Pantalla sin historial         -> se vuelve a las pestañas.
//
// Complemento nativo: AndroidManifest declara
// android:enableOnBackInvokedCallback="false". Sin ello, con targetSdk 36
// (Android 16) el "predictive back" omite onBackPressed() y la app se
// cerraba sin que este listener llegara a ejecutarse.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { BackHandler, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { ExitConfirmationModal } from '../../components/ExitConfirmationModal';
import { useForegroundRevision } from './ForegroundRevisionContext';

export interface ExitModalContextValue {
    showExitModal: boolean;
    setShowExitModal: (visible: boolean) => void;
    openExitModal: () => void;
    closeExitModal: () => void;
    confirmExit: () => void;
}

const ExitModalContext = createContext<ExitModalContextValue>({
    showExitModal: false,
    setShowExitModal: () => undefined,
    openExitModal: () => undefined,
    closeExitModal: () => undefined,
    confirmExit: () => undefined,
});

/** Ruta de la pestaña principal (app/(tabs)/index.tsx). */
const HOME_PATH = '/';

/** Rutas de las demás pestañas raíz (app/(tabs)/*.tsx). */
const ROOT_TAB_PATHS = new Set([
    '/buscar',
    '/asistente',
    '/favoritos',
    '/recordatorios',
    '/perfil',
]);

/** Indica a Android que el evento se ha consumido. */
const CONSUMED = true;

export function ExitModalProvider({ children }: { children: ReactNode }) {
    const [showExitModal, setShowExitModal] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const revision = useForegroundRevision();

    // Refs mutables: el listener lee siempre el estado más reciente sin
    // necesidad de re-suscribirse en cada navegación.
    const visibleRef = useRef(showExitModal);
    visibleRef.current = showExitModal;
    const pathRef = useRef(pathname);
    pathRef.current = pathname;
    const routerRef = useRef(router);
    routerRef.current = router;

    const openExitModal = useCallback(() => setShowExitModal(true), []);
    const closeExitModal = useCallback(() => setShowExitModal(false), []);
    const confirmExit = useCallback(() => {
        setShowExitModal(false);
        if (Platform.OS === 'android') {
            BackHandler.exitApp();
        }
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'android') return undefined;

        const onHardwareBack = (): boolean => {
            try {
                if (visibleRef.current) {
                    setShowExitModal(false);
                    return CONSUMED;
                }

                const path = pathRef.current || HOME_PATH;
                if (path === HOME_PATH) {
                    setShowExitModal(true);
                    return CONSUMED;
                }

                const nav = routerRef.current;
                if (ROOT_TAB_PATHS.has(path)) {
                    nav.navigate('/(tabs)');
                    return CONSUMED;
                }

                if (nav.canGoBack()) {
                    nav.back();
                    return CONSUMED;
                }

                nav.replace('/(tabs)');
            } catch {
                // Cualquier fallo de navegación termina en el modal: nunca se
                // delega en el comportamiento por defecto del sistema.
                setShowExitModal(true);
            }
            return CONSUMED;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
        return () => subscription.remove();
        // `revision` re-registra el listener al volver de segundo plano.
    }, [revision]);

    const value = useMemo<ExitModalContextValue>(
        () => ({ showExitModal, setShowExitModal, openExitModal, closeExitModal, confirmExit }),
        [showExitModal, openExitModal, closeExitModal, confirmExit],
    );

    return (
        <ExitModalContext.Provider value={value}>
            {children}
            <ExitConfirmationModal
                visible={showExitModal}
                onCancel={closeExitModal}
                onConfirm={confirmExit}
            />
        </ExitModalContext.Provider>
    );
}

/** Hook para que cualquier pantalla o componente hijo active o controle el modal de salida. */
export function useExitModal(): ExitModalContextValue {
    return useContext(ExitModalContext);
}
