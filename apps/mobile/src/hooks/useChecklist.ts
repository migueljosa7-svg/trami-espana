import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHECKLIST_PREFIX = 'trami_checklist_';

interface ChecklistState {
  [key: string]: boolean;
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

  const totalItems = itemIds.length;
  const checkedCount = itemIds.filter(id => checkedItems[id]).length;
  const progress = totalItems > 0 ? checkedCount / totalItems : 0;
  // Fórmula estricta solicitada en v1.2.3:
  //   total > 0 ? Math.round((completados / total) * 100) : 0
  // Cuenta TODOS los ítems reales del trámite (requisitos + documentos +
  // pasos). Nunca divide sobre bases fijas (p. ej. /10) ni aplica
  // redondeos intermedios que desvirtúen 6/6 -> 100%.
  const progressPercent = totalItems > 0
    ? Math.round((checkedCount / totalItems) * 100)
    : 0;

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
