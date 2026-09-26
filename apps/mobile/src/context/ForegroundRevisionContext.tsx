// ===========================================
// TRAMI ESPAÑA - ForegroundRevisionContext (v1.3.1)
// ===========================================
// CAUSA RAÍZ del bug "al volver de segundo plano el botón atrás cierra la
// app": `useFocusEffect` SOLO se re-ejecuta cuando cambia el foco de la
// pantalla. Al minimizar y restaurar, el foco NO cambia, por lo que el
// `BackHandler.addEventListener` registrado en el primer focus queda
// huérfano en muchos dispositivos (Xiaomi/MIUI, Android 15/16) y el SO
// ejecuta su comportamiento por defecto: `finishActivity()`.
//
// Solución: un contador global `revision` que se incrementa CADA vez que la
// app vuelve a primer plano (AppState -> 'active'). Las pantallas lo
// incluyen en las dependencias de su `useFocusEffect`, lo que obliga a
// React Navigation a desmontar el listener viejo y registrar uno nuevo
// (el closure captura el estado fresco) en el instante exacto del resume.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

const ForegroundRevisionContext = createContext<number>(0);

export function ForegroundRevisionProvider({ children }: { children: ReactNode }) {
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        // `currentState` evita contar el primer 'active' de arranque: en ese
        // momento los listeners aún no se han registrado y el incremento
        // sería un render inútil.
        let current = AppState.currentState;
        const subscription = AppState.addEventListener('change', (next) => {
            const cameBackToForeground = next === 'active' && current !== 'active';
            current = next;
            if (cameBackToForeground) {
                setRevision((prev) => prev + 1);
            }
        });
        return () => subscription.remove();
    }, []);

    return (
        <ForegroundRevisionContext.Provider value={revision}>
            {children}
        </ForegroundRevisionContext.Provider>
    );
}

/**
 * Revisión de primer plano. Se consume (y se incluye en el array de
 * dependencias del useFocusEffect) para re-registrar los BackHandler.
 */
export function useForegroundRevision(): number {
    return useContext(ForegroundRevisionContext);
}
