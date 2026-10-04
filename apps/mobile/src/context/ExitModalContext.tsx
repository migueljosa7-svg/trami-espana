import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { BackHandler, Platform } from 'react-native';

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

export function ExitModalProvider({ children }: { children: ReactNode }) {
    const [showExitModal, setShowExitModal] = useState(false);

    const openExitModal = useCallback(() => setShowExitModal(true), []);
    const closeExitModal = useCallback(() => setShowExitModal(false), []);
    const confirmExit = useCallback(() => {
        setShowExitModal(false);
        if (Platform.OS === 'android') {
            BackHandler.exitApp();
        }
    }, []);

    return (
        <ExitModalContext.Provider
            value={{
                showExitModal,
                setShowExitModal,
                openExitModal,
                closeExitModal,
                confirmExit,
            }}
        >
            {children}
        </ExitModalContext.Provider>
    );
}

/** Hook para que cualquier pantalla o componente hijo active o controle el modal de salida. */
export function useExitModal(): ExitModalContextValue {
    return useContext(ExitModalContext);
}
