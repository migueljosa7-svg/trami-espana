import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcProgressPercent } from '@trami-espana/shared';

const CHECKLIST_PREFIX = 'trami_checklist_';

interface ChecklistState {
  [key: string]: boolean;
}

/**
 * Calcula el porcentaje de progreso de un checklist.
 *
 * Fórmula estricta (v1.3.1, fuente única de verdad en @trami-espana/shared):
 *   total > 0 ? Math.round((completados / total) * 100) : 0
 *
 * - `total` es SIEMPRE el `length` real del array de ítems cargados
 *   (requisitos + documentos + pasos) para ese trámite.
 * - Prohibido dividir entre bases fijas (p. ej. /10).
 * - `completados === total` devuelve siempre 100.
 * - `total === 0` devuelve 0 (nunca NaN ni Infinity).
 *
 * Se reexporta desde aquí para mantener compatibilidad con los imports
 * históricos (`import { calcChecklistPercent } from '.../useChecklist'`).
 */
export function calcChecklistPercent(completados: number, total: number): number {
  return calcProgressPercent(completados, total);
}

export function useChecklist(procedureSlug: string, itemIds: string[]) {
  const [checkedItems, setCheckedItems] = useState<ChecklistState>({});
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${CHECKLIST_PREFIX}${procedureSlug}`;

  // Cargar estado persistido
  useEffect(() => {
    let mounted = true;
    const loadState = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (mounted && stored) {
          const parsed = JSON.parse(stored) as ChecklistState;
          setCheckedItems(parsed);
        }
      } catch {
        // Silencioso: empieza vacío
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadState();
    return () => { mounted = false; };
  }, [storageKey]);

  // Persistir al cambiar
  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(checkedItems)).catch(() => {});
  }, [checkedItems, isLoading, storageKey]);

  const toggleItem = useCallback((itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }, []);

  // Deduplicar IDs por seguridad: el total refleja ítems reales únicos.
  const uniqueIds = useMemo(() => Array.from(new Set(itemIds)), [itemIds]);
  const totalItems = uniqueIds.length;
  const checkedCount = uniqueIds.filter(id => checkedItems[id]).length;
  const progress = totalItems > 0 ? checkedCount / totalItems : 0;
  // Fórmula estricta solicitada en v1.2.5:
  //   total > 0 ? Math.round((completados / total) * 100) : 0
  // Cuenta TODOS los ítems reales del trámite (requisitos + documentos +
  // pasos). Nunca divide sobre bases fijas (p. ej. /10) ni aplica
  // redondeos intermedios que desvirtúen 6/6 -> 100%.
  const progressPercent = calcChecklistPercent(checkedCount, totalItems);

  const resetChecklist = useCallback(async () => {
    setCheckedItems({});
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {
      // Silencioso
    }
  }, [storageKey]);

  return {
    checkedItems,
    toggleItem,
    totalItems,
    checkedCount,
    progress,
    /** Porcentaje 0-100 calculado con la fórmula estricta. */
    progressPercent,
    isLoading,
    resetChecklist,
  };
}
