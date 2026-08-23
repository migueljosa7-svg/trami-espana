// ===========================================
// TRAMI ESPAÑA - Constantes
// ===========================================
// Constantes compartidas entre web y mobile

export const APP_NAME = 'Trami España';

export const APP_VERSION = '1.0.0';

export const PROCEDURE_CATEGORIES = [
    { id: 'identidad', name: 'Identidad', slug: 'identidad', icon: '🪪' },
    { id: 'empadronamiento', name: 'Empadronamiento', slug: 'empadronamiento', icon: '📍' },
    { id: 'laboral', name: 'Laboral', slug: 'laboral', icon: '💼' },
    { id: 'seguridad-social', name: 'Seguridad Social', slug: 'seguridad-social', icon: '🏥' },
    { id: 'impuestos', name: 'Impuestos', slug: 'impuestos', icon: '💰' },
    { id: 'educacion', name: 'Educación', slug: 'educacion', icon: '📚' },
    { id: 'familia', name: 'Familia', slug: 'familia', icon: '👨‍👩‍👧' },
    { id: 'vehiculos', name: 'Vehículos', slug: 'vehiculos', icon: '🚗' },
    { id: 'extranjeria', name: 'Extranjería', slug: 'extranjeria', icon: '🌍' },
    { id: 'vivienda', name: 'Vivienda', slug: 'vivienda', icon: '🏡' },
    { id: 'empresas', name: 'Empresas', slug: 'empresas', icon: '🏢' },
    { id: 'consumo', name: 'Consumo y Derechos', slug: 'consumo', icon: '⚖️' }
] as const;

export const PROCEDURE_SCOPES = [
    { value: 'estatal', label: 'Estatal', color: 'blue' },
    { value: 'autonómico', label: 'Autonómico', color: 'green' },
    { value: 'provincial', label: 'Provincial', color: 'yellow' },
    { value: 'municipal', label: 'Municipal', color: 'purple' }
] as const;

export const LINK_TYPES = [
    { value: 'official', label: 'Oficial', icon: '✓' },
    { value: 'appointment', label: 'Cita previa', icon: '📅' },
    { value: 'information', label: 'Información', icon: 'ℹ️' },
    { value: 'download', label: 'Descarga', icon: '⬇️' },
    { value: 'other', label: 'Otro', icon: '🔗' }
] as const;

export const VERIFICATION_STATUSES = [
    { value: 'draft', label: 'Borrador', color: 'yellow' },
    { value: 'verified', label: 'Verificado', color: 'green' },
    { value: 'needs_review', label: 'Necesita revisión', color: 'orange' },
    { value: 'archived', label: 'Archivado', color: 'gray' }
] as const;

export const PAGINATION_LIMITS = [6, 12, 24, 48] as const;

export const DEFAULT_PAGINATION_LIMIT = 12;

export const SEARCH_DEBOUNCE_MS = 300;

export const MIN_SEARCH_LENGTH = 2;

export const AUTONOMOUS_COMMUNITIES = [
    'Andalucía',
    'Aragón',
    'Asturias',
    'Baleares',
    'Canarias',
    'Cantabria',
    'Castilla-La Mancha',
    'Castilla y León',
    'Cataluña',
    'Ceuta',
    'Extremadura',
    'Galicia',
    'La Rioja',
    'Madrid',
    'Melilla',
    'Murcia',
    'Navarra',
    'País Vasco',
    'Valencia'
] as const;

export const ROUTES = {
    HOME: '/',
    PROCEDURES: '/tramites',
    PROCEDURE_DETAIL: '/tramites/:slug',
    SEARCH: '/buscar',
    ASSISTANT: '/asistente',
    LOGIN: '/login',
    PROFILE: '/perfil',
    FAVORITES: '/favoritos',
    REMINDERS: '/recordatorios',
    PRIVACY: '/privacidad',
    TERMS: '/terminos',
    COOKIES: '/cookies',
    CONTACT: '/contacto',
    ERROR: '/error'
} as const;

export const LEGAL_DISCLAIMER = 'Trami España es un servicio independiente y no está afiliado, patrocinado ni respaldado por ninguna administración pública.';

export const DEMO_DATA_PREFIX = '[DEMO]';

export const DEMO_VERIFICATION_STATUS = 'draft';