// ===========================================
// TRAMI ESPAÑA - Servicio de Recordatorios
// ===========================================
// Servicio para gestionar recordatorios de usuarios

import { getSupabaseClient } from '../supabase';
import type { Reminder, ProcedureWithDetails } from '../types';

// ===========================================
// ERRORES PERSONALIZADOS
// ===========================================

export class ReminderServiceError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ReminderServiceError';
    }
}

// ===========================================
// TIPOS
// ===========================================

export interface ReminderWithProcedure extends Reminder {
    procedure: ProcedureWithDetails;
}

export interface CreateReminderData {
    procedure_id: string;
    title: string;
    description?: string;
    reminder_date: string;
}

export interface UpdateReminderData {
    title?: string;
    description?: string;
    reminder_date?: string;
    is_completed?: boolean;
}

// ===========================================
// SERVICIO DE RECORDATORIOS
// ===========================================

export const reminderService = {
    /**
     * Obtener todos los recordatorios del usuario actual
     */
    async getReminders(): Promise<ReminderWithProcedure[]> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new ReminderServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { data, error } = await getSupabaseClient()
                .from('reminders')
                .select(`
                    *,
                    procedure:procedures(
                        *,
                        category:procedure_categories(*),
                        requirements:procedure_requirements(*),
                        documents:procedure_documents(*),
                        steps:procedure_steps(*),
                        links:procedure_links(*)
                    )
                `)
                .eq('user_id', user.data.user.id)
                .order('reminder_date', { ascending: true });

            if (error) {
                throw new ReminderServiceError(
                    'Error al obtener recordatorios',
                    'FETCH_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return (data || []) as ReminderWithProcedure[];
        } catch (error) {
            if (error instanceof ReminderServiceError) {
                throw error;
            }
            throw new ReminderServiceError(
                'Error inesperado al obtener recordatorios',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Crear un nuevo recordatorio
     */
    async createReminder(data: CreateReminderData): Promise<ReminderWithProcedure | null> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new ReminderServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { data: reminder, error } = await getSupabaseClient()
                .from('reminders')
                .insert({
                    user_id: user.data.user.id,
                    procedure_id: data.procedure_id,
                    title: data.title,
                    description: data.description || null,
                    reminder_date: data.reminder_date,
                    is_completed: false
                })
                .select(`
                    *,
                    procedure:procedures(
                        *,
                        category:procedure_categories(*),
                        requirements:procedure_requirements(*),
                        documents:procedure_documents(*),
                        steps:procedure_steps(*),
                        links:procedure_links(*)
                    )
                `)
                .single();

            if (error) {
                throw new ReminderServiceError(
                    'Error al crear recordatorio',
                    'INSERT_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return reminder as ReminderWithProcedure;
        } catch (error) {
            if (error instanceof ReminderServiceError) {
                throw error;
            }
            throw new ReminderServiceError(
                'Error inesperado al crear recordatorio',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Actualizar un recordatorio
     */
    async updateReminder(id: string, data: UpdateReminderData): Promise<ReminderWithProcedure | null> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new ReminderServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { data: reminder, error } = await getSupabaseClient()
                .from('reminders')
                .update(data)
                .eq('id', id)
                .eq('user_id', user.data.user.id)
                .select(`
                    *,
                    procedure:procedures(
                        *,
                        category:procedure_categories(*),
                        requirements:procedure_requirements(*),
                        documents:procedure_documents(*),
                        steps:procedure_steps(*),
                        links:procedure_links(*)
                    )
                `)
                .single();

            if (error) {
                throw new ReminderServiceError(
                    'Error al actualizar recordatorio',
                    'UPDATE_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return reminder as ReminderWithProcedure;
        } catch (error) {
            if (error instanceof ReminderServiceError) {
                throw error;
            }
            throw new ReminderServiceError(
                'Error inesperado al actualizar recordatorio',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Marcar recordatorio como completado
     */
    async completeReminder(id: string): Promise<{ success: boolean; error?: Error }> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new ReminderServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { error } = await getSupabaseClient()
                .from('reminders')
                .update({ is_completed: true })
                .eq('id', id)
                .eq('user_id', user.data.user.id);

            if (error) {
                throw new ReminderServiceError(
                    'Error al completar recordatorio',
                    'UPDATE_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return { success: true };
        } catch (error) {
            if (error instanceof ReminderServiceError) {
                return { success: false, error };
            }
            return {
                success: false,
                error: new ReminderServiceError(
                    'Error inesperado al completar recordatorio',
                    'UNKNOWN_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Eliminar un recordatorio
     */
    async deleteReminder(id: string): Promise<{ success: boolean; error?: Error }> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new ReminderServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { error } = await getSupabaseClient()
                .from('reminders')
                .delete()
                .eq('id', id)
                .eq('user_id', user.data.user.id);

            if (error) {
                throw new ReminderServiceError(
                    'Error al eliminar recordatorio',
                    'DELETE_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return { success: true };
        } catch (error) {
            if (error instanceof ReminderServiceError) {
                return { success: false, error };
            }
            return {
                success: false,
                error: new ReminderServiceError(
                    'Error inesperado al eliminar recordatorio',
                    'UNKNOWN_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Contar recordatorios pendientes
     */
    async countPendingReminders(): Promise<number> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                return 0;
            }

            const { count, error } = await getSupabaseClient()
                .from('reminders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.data.user.id)
                .eq('is_completed', false);

            if (error) {
                throw new ReminderServiceError(
                    'Error al contar recordatorios',
                    'COUNT_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return count || 0;
        } catch (error) {
            if (error instanceof ReminderServiceError) {
                throw error;
            }
            throw new ReminderServiceError(
                'Error inesperado al contar recordatorios',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    }
};