// ===========================================
// TRAMI ESPAÑA - Cliente Supabase
// ===========================================
// Este archivo contiene la configuración del cliente Supabase
// IMPORTANTE: Nunca incluyas la service_role key en el frontend

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Client of Supabase (initialized in each app)
let supabaseClient: SupabaseClient | null = null;

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