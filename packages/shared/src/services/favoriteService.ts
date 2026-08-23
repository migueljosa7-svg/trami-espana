// ===========================================
// TRAMI ESPAÑA - Servicio de Favoritos
// ===========================================
// Servicio para gestionar favoritos de usuarios

import { getSupabaseClient } from '../supabase';
import type { Favorite, ProcedureWithDetails } from '../types';

// ===========================================
// ERRORES PERSONALIZADOS
// ===========================================

export class FavoriteServiceError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'FavoriteServiceError';
    }
}

// ===========================================
// TIPOS
// ===========================================

export interface FavoriteWithProcedure extends Favorite {
    procedure: ProcedureWithDetails;
}

// ===========================================
// SERVICIO DE FAVORITOS
// ===========================================

export const favoriteService = {
    /**
     * Obtener todos los favoritos del usuario actual
     */
    async getFavorites(): Promise<FavoriteWithProcedure[]> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new FavoriteServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { data, error } = await getSupabaseClient()
                .from('favorites')
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
                .order('created_at', { ascending: false });

            if (error) {
                throw new FavoriteServiceError(
                    'Error al obtener favoritos',
                    'FETCH_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return (data || []) as FavoriteWithProcedure[];
        } catch (error) {
            if (error instanceof FavoriteServiceError) {
                throw error;
            }
            throw new FavoriteServiceError(
                'Error inesperado al obtener favoritos',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Añadir un trámite a favoritos
     */
    async addFavorite(procedureId: string): Promise<{ success: boolean; error?: Error }> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new FavoriteServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { error } = await getSupabaseClient()
                .from('favorites')
                .insert({
                    user_id: user.data.user.id,
                    procedure_id: procedureId
                });

            if (error) {
                if (error.code === '23505') {
                    // Ya existe
                    return { success: true };
                }
                throw new FavoriteServiceError(
                    'Error al añadir a favoritos',
                    'INSERT_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return { success: true };
        } catch (error) {
            if (error instanceof FavoriteServiceError) {
                return { success: false, error };
            }
            return {
                success: false,
                error: new FavoriteServiceError(
                    'Error inesperado al añadir a favoritos',
                    'UNKNOWN_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Eliminar un trámite de favoritos
     */
    async removeFavorite(procedureId: string): Promise<{ success: boolean; error?: Error }> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                throw new FavoriteServiceError(
                    'Usuario no autenticado',
                    'NOT_AUTHENTICATED'
                );
            }

            const { error } = await getSupabaseClient()
                .from('favorites')
                .delete()
                .eq('user_id', user.data.user.id)
                .eq('procedure_id', procedureId);

            if (error) {
                throw new FavoriteServiceError(
                    'Error al eliminar de favoritos',
                    'DELETE_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return { success: true };
        } catch (error) {
            if (error instanceof FavoriteServiceError) {
                return { success: false, error };
            }
            return {
                success: false,
                error: new FavoriteServiceError(
                    'Error inesperado al eliminar de favoritos',
                    'UNKNOWN_ERROR',
                    { originalError: error }
                )
            };
        }
    },

    /**
     * Verificar si un trámite está en favoritos
     */
    async isFavorite(procedureId: string): Promise<boolean> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                return false;
            }

            const { data, error } = await getSupabaseClient()
                .from('favorites')
                .select('id')
                .eq('user_id', user.data.user.id)
                .eq('procedure_id', procedureId)
                .maybeSingle();

            if (error) {
                throw new FavoriteServiceError(
                    'Error al verificar favorito',
                    'FETCH_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return !!data;
        } catch (error) {
            if (error instanceof FavoriteServiceError) {
                throw error;
            }
            throw new FavoriteServiceError(
                'Error inesperado al verificar favorito',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    },

    /**
     * Contar favoritos de un usuario
     */
    async countFavorites(): Promise<number> {
        try {
            const user = await getSupabaseClient().auth.getUser();

            if (!user.data.user) {
                return 0;
            }

            const { count, error } = await getSupabaseClient()
                .from('favorites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.data.user.id);

            if (error) {
                throw new FavoriteServiceError(
                    'Error al contar favoritos',
                    'COUNT_ERROR',
                    { message: error.message, details: error.details }
                );
            }

            return count || 0;
        } catch (error) {
            if (error instanceof FavoriteServiceError) {
                throw error;
            }
            throw new FavoriteServiceError(
                'Error inesperado al contar favoritos',
                'UNKNOWN_ERROR',
                { originalError: error }
            );
        }
    }
};