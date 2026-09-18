import { createContext, useContext, useState, type ReactNode } from 'react';

// ============================================================
// ExitModalContext — v1.2.9
//
// Permite que cualquier pantalla de pestaña raíz muestre el
// modal de confirmación de salida que vive en (tabs)/_layout.tsx.
// El estado lo provee el layout; las pantallas lo consumen con
// useExitModal() para llamar a showExitModal().
// ============================================================

interface ExitModalContextValue {
    showExitModal: boolean;
    setShowExitModal: (visible: boolean) => void;
}

const ExitModalContext = createContext<ExitModalContextValue>({
    showExitModal: false,
    setShowExitModal: () => undefined,
});

export function ExitModalProvider({ children }: { children: ReactNode }) {
    const [showExitModal, setShowExitModal] = useState(false);
    return (
        <ExitModalContext.Provider value={{ showExitModal, setShowExitModal }}>
            {children}
        </ExitModalContext.Provider>
    );
}

/** Hook para que las pantallas hijas activen el modal de salida. */
export function useExitModal() {
    return useContext(ExitModalContext);
}
