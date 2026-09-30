// ===========================================
// TRAMI ESPAÑA - Utilidades
// ===========================================
// Funciones utilitarias compartidas

/**
 * ============================================================
 * Cálculo dinámico de progreso (v1.3.1)
 * ============================================================
 * Fuente ÚNICA de verdad del porcentaje de trámites completados. Al
 * residir aquí (y no duplicarse en componentes) se garantiza que web y
 * mobile calculan exactamente el mismo valor.
 *
 * Requisitos funcionales:
 *  - `total === 0`                  -> 0   (lista vacía nunca es NaN/Infinity)
 *  - `completados === 0`           -> 0
 *  - `completados === total`       -> 100 (SIEMPRE, nunca 60 ni 99)
 *  - valores intermedios           -> proporción exacta redondeada
 *  - valores fuera de rango (0..total) se saturan para no producir
 *    barras de progreso rotas (p. ej. 120% o -30%).
 *
 * @param completados Número de elementos marcados como completados.
 * @param total       Número REAL de elementos de la lista activa.
 */
export const calcProgressPercent = (completados: number, total: number): number => {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(completados) || completados <= 0) return 0;
  const safeTotal = Math.floor(total);
  const safeDone = Math.min(Math.floor(completados), safeTotal);
  return Math.round((safeDone / safeTotal) * 100);
};

/**
 * Formatea una fecha a formato español
 */
export const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Formatea una fecha relativa (hace X días)
 */
export const formatRelativeDate = (date: string | Date): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
    return `Hace ${Math.floor(days / 365)} años`;
};

/**
 * Valida un email
 */
export const isValidEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * Valida un teléfono español
 */
export const isValidPhone = (phone: string): boolean => {
    const regex = /^[679]\d{8}$/;
    return regex.test(phone.replace(/\s/g, ''));
};

/**
 * Capitaliza la primera letra de un string
 */
export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Trunca un texto a un número de caracteres
 */
export const truncate = (text: string, length: number): string => {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
};

/**
 * Genera un slug a partir de un string
 */
export const generateSlug = (text: string): string => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales por guiones
        .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    // `ReturnType<typeof setTimeout>` en lugar de `NodeJS.Timeout`: este paquete
    // es portable (web + móvil nativo). Los tipos de Node no existen en React
    // Native, y referenciarlos obligaba a que cada workspace arrastrase
    // `@types/node` para compilar esta línea.
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Obtiene el label de un ámbito
 */
export const getScopeLabel = (scope: string): string => {
    const labels: Record<string, string> = {
        'estatal': 'Estatal',
        'autonómico': 'Autonómico',
        'provincial': 'Provincial',
        'municipal': 'Municipal'
    };
    return labels[scope] || scope;
};

/**
 * Obtiene el label de un tipo de enlace
 */
export const getLinkTypeLabel = (linkType: string): string => {
    const labels: Record<string, string> = {
        'official': 'Oficial',
        'appointment': 'Cita previa',
        'information': 'Información',
        'download': 'Descarga',
        'other': 'Otro'
    };
    return labels[linkType] || linkType;
};

/**
 * Obtiene el label del estado de verificación
 */
export const getVerificationStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        'draft': 'Borrador',
        'verified': 'Verificado',
        'needs_review': 'Necesita revisión',
        'archived': 'Archivado'
    };
    return labels[status] || status;
};

/**
 * Obtiene el color del estado de verificación
 */
export const getVerificationStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        'draft': 'yellow',
        'verified': 'green',
        'needs_review': 'orange',
        'archived': 'gray'
    };
    return colors[status] || 'gray';
};