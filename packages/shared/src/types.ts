// ===========================================
// TRAMI ESPAÑA - Tipos TypeScript
// ===========================================
// Tipos compartidos entre web y mobile

import type { Database } from './supabase';

// Exportar Database para que esté disponible en otros módulos
export { Database };

// Tipos principales de la base de datos
export type Procedure = Database['public']['Tables']['procedures']['Row'];
export type ProcedureCategory = Database['public']['Tables']['procedure_categories']['Row'];
export type ProcedureRequirement = Database['public']['Tables']['procedure_requirements']['Row'];
export type ProcedureDocument = Database['public']['Tables']['procedure_documents']['Row'];
export type ProcedureStep = Database['public']['Tables']['procedure_steps']['Row'];
export type ProcedureLink = Database['public']['Tables']['procedure_links']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];
export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type AssistantConversation = Database['public']['Tables']['assistant_conversations']['Row'];
export type AssistantMessage = Database['public']['Tables']['assistant_messages']['Row'];
export type Feedback = Database['public']['Tables']['feedback']['Row'];

// Tipos extendidos para respuestas con relaciones
export interface ProcedureWithDetails extends Procedure {
    category?: ProcedureCategory;
    requirements?: ProcedureRequirement[];
    documents?: ProcedureDocument[];
    steps?: ProcedureStep[];
    links?: ProcedureLink[];
}

export interface ProceduresListResponse {
    data: ProcedureWithDetails[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface SearchFilters {
    query?: string;
    category_id?: string;
    scope?: string;
    autonomous_community?: string;
    page?: number;
    limit?: number;
}

// Tipos para formularios
export interface LoginFormData {
    email: string;
    password: string;
}

export interface RegisterFormData {
    email: string;
    password: string;
    confirmPassword: string;
    fullName?: string;
}

export interface ProfileFormData {
    full_name: string;
    phone: string;
}

// Tipos para la UI
export interface LoadingState {
    loading: boolean;
    error: string | null;
}

export interface PaginationState {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

// Tipos para filtros
export interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

export interface FilterState {
    categories: FilterOption[];
    scopes: FilterOption[];
    communities: FilterOption[];
}

// Tipos para el asistente
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    created_at: string;
    updated_at: string;
}

// Tipos para favoritos y recordatorios
export interface FavoriteItem {
    id: string;
    procedure_id: string;
    procedure: ProcedureWithDetails;
    created_at: string;
}

export interface ReminderItem {
    id: string;
    procedure_id: string;
    title: string;
    description: string | null;
    reminder_date: string;
    is_completed: boolean;
    created_at: string;
    updated_at: string;
}

// Tipos para feedback
export interface FeedbackData {
    procedure_id?: string;
    rating: number | null;
    comment: string | null;
}

// Tipos para la API
export interface ApiResponse<T> {
    data: T | null;
    error: Error | null;
    status: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

// Tipos para errores
export interface AppError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// Tipos para notificaciones
export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
}

// Tipos para el tema
export type Theme = 'light' | 'dark' | 'system';

// Tipos para idiomas
export type Language = 'es' | 'ca' | 'eu' | 'gl' | 'en';

export interface Translations {
    [key: string]: string | Translations;
}