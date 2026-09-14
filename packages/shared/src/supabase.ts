// ===========================================
// TRAMI ESPAÑA - Cliente Supabase
// ===========================================
// Este archivo contiene la configuración del cliente Supabase
// IMPORTANTE: Nunca incluyas la service_role key en el frontend

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Client of Supabase (initialized in each app)
let supabaseClient: SupabaseClient | null = null;

/**
 * Adaptador de almacenamiento ACTIVO inyectado desde la app
 * (AsyncStorage en móvil). Se conserva una referencia para poder leer el
 * token persistido directamente del disco cuando el cliente aún no ha
 * rehidratado su caché en memoria (condición de carrera en el arranque).
 */
let activeStorage: SupabaseStorageAdapter | null = null;
/** Project ref de la URL de Supabase (para componer la storageKey oficial). */
let activeProjectRef = '';

/**
 * Adaptador mínimo de almacenamiento compatible con Supabase Auth.
 * En web se usa localStorage por defecto; en móvil (Expo / React Native)
 * debe inyectarse AsyncStorage desde la app para que la sesión sobreviva
 * al cerrar la app (sin esto solo vive en memoria RAM).
 */
export interface SupabaseStorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}

export interface InitializeSupabaseOptions {
    storage?: SupabaseStorageAdapter;
}

/**
 * Inicializa el cliente de Supabase con las credenciales
 * Esta función debe ser llamada desde apps/web o apps/mobile.
 * En móvil, pasar `{ storage: AsyncStorage }` es OBLIGATORIO para
 * persistencia real de sesión.
 */
export const initializeSupabase = (
    url: string,
    anonKey: string,
    options?: InitializeSupabaseOptions
): void => {
    activeStorage = options?.storage ?? null;
    // Project ref desde la URL (formato https://<ref>.supabase.co).
    // Se calcula con regex para no depender de `new URL` (no disponible
    // en todos los entornos de React Native / Hermes).
    try {
        const match = /^https?:\/\/([^.]+)/i.exec(url);
        activeProjectRef = match ? match[1] : '';
    } catch {
        activeProjectRef = '';
    }
    supabaseClient = createClient(url, anonKey, {
        auth: {
            ...(options?.storage ? { storage: options.storage } : {}),
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    });
};

/**
 * Obtiene el cliente de Supabase inicializado
 * Lanza un error si no se ha inicializado
 */
export const getSupabaseClient = (): SupabaseClient => {
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized. Call initializeSupabase first.');
    }
    return supabaseClient;
};

/**
 * Clave bajo la que Supabase Auth persiste la sesión en el storage
 * (formato oficial de supabase-js v2: `sb-<project_ref>-auth-token`).
 * Devuelve '' si no se ha podido determinar el project ref.
 */
export const getSupabaseAuthStorageKey = (): string => {
    if (!activeProjectRef) return '';
    return `sb-${activeProjectRef}-auth-token`;
};

/**
 * Lee la sesión persistida DIRECTAMENTE del almacenamiento inyectado
 * (AsyncStorage en móvil) sin depender de la caché en memoria del cliente.
 *
 * Esto es la pieza clave para eliminar la condición de carrera en la que
 * la pantalla de carga termina antes de que AsyncStorage rehidrate la
 * sesión: aunque el cliente devuelva null, aquí se garantiza la lectura
 * del token persistido en disco.
 *
 * Devuelve null si:
 *  - no hay storage inyectado (web usa el cliente normal), o
 *  - no hay token guardado / el JSON no tiene forma de sesión.
 * NUNCA lanza: es un mecanismo de recuperación silencioso.
 */
export const readPersistedSupabaseSession = async (): Promise<Session | null> => {
    try {
        if (!activeStorage) return null;
        const key = getSupabaseAuthStorageKey();
        if (!key) return null;
        const raw = await activeStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as
            | { currentSession?: Session | null; [k: string]: unknown }
            | Session
            | null;
        // auth-js guarda { currentSession, expiresAt, ... } en algunas
        // versiones y la sesión directa en otras. Se soportan ambas formas.
        const session =
            parsed && typeof parsed === 'object' && 'currentSession' in parsed
                ? (parsed.currentSession as Session | null)
                : (parsed as Session | null);
        if (
            session &&
            typeof session === 'object' &&
            typeof (session as Session).access_token === 'string' &&
            (session as Session).user
        ) {
            return session as Session;
        }
        return null;
    } catch {
        return null;
    }
};

// Exportar una instancia por defecto (para compatibilidad)
// En las apps, usar getSupabaseClient() después de inicializar
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return getSupabaseClient()[prop as keyof SupabaseClient];
    }
});

// Tipos para la base de datos
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    user_id: string;
                    full_name: string | null;
                    phone: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    full_name?: string | null;
                    phone?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    full_name?: string | null;
                    phone?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            procedure_categories: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    icon: string | null;
                    order: number;
                    created_at: string;
                };
            };
            procedures: {
                Row: {
                    id: string;
                    title: string;
                    slug: string;
                    short_description: string;
                    description: string;
                    category_id: string;
                    scope: 'estatal' | 'autonómico' | 'provincial' | 'municipal';
                    autonomous_community: string | null;
                    province: string | null;
                    municipality: string | null;
                    is_published: boolean;
                    verification_status: 'draft' | 'verified' | 'needs_review' | 'archived';
                    last_verified_at: string | null;
                    verified_by: string | null;
                    source: string;
                    source_url: string | null;
                    cost: string | null;
                    estimated_duration: string | null;
                    created_at: string;
                    updated_at: string;
                };
            };
            procedure_requirements: {
                Row: {
                    id: string;
                    procedure_id: string;
                    title: string;
                    description: string | null;
                    order_index: number;
                    created_at: string;
                };
            };
            procedure_documents: {
                Row: {
                    id: string;
                    procedure_id: string;
                    name: string;
                    description: string | null;
                    is_required: boolean;
                    order_index: number;
                    created_at: string;
                };
            };
            procedure_steps: {
                Row: {
                    id: string;
                    procedure_id: string;
                    title: string;
                    description: string;
                    order_index: number;
                    is_important: boolean;
                    created_at: string;
                };
            };
            procedure_links: {
                Row: {
                    id: string;
                    procedure_id: string;
                    title: string;
                    url: string;
                    link_type: 'official' | 'appointment' | 'information' | 'download' | 'other';
                    is_official: boolean;
                    description: string | null;
                    created_at: string;
                };
            };
            favorites: {
                Row: {
                    id: string;
                    user_id: string;
                    procedure_id: string;
                    created_at: string;
                };
            };
            reminders: {
                Row: {
                    id: string;
                    user_id: string;
                    procedure_id: string | null;
                    title: string;
                    description: string | null;
                    reminder_date: string;
                    is_completed: boolean;
                    created_at: string;
                    updated_at: string;
                };
            };
                        assistant_conversations: {
                Row: {
                    id: string;
                    user_id: string | null;
                    title: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    title: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    title?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            assistant_messages: {
                Row: {
                    id: string;
                    conversation_id: string;
                    role: 'user' | 'assistant' | 'system';
                    content: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    role: 'user' | 'assistant' | 'system';
                    content: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    conversation_id?: string;
                    role?: 'user' | 'assistant' | 'system';
                    content?: string;
                    created_at?: string;
                };
            };
            user_roles: {
                Row: {
                    id: string;
                    user_id: string;
                    role: 'admin';
                    created_at: string;
                    created_by: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    role: 'admin';
                    created_at?: string;
                    created_by?: string | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    role?: 'admin';
                    created_at?: string;
                    created_by?: string | null;
                };
            };
            feedback: {
                Row: {
                    id: string;
                    user_id: string | null;
                    procedure_id: string | null;
                    rating: number | null;
                    comment: string | null;
                    created_at: string;
                };
            };
        };
    };
};