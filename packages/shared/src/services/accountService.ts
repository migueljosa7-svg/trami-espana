// ===========================================
// TRAMI ESPAÑA - Servicio de Cuenta (derechos del usuario)
// ===========================================
// Implementa el derecho de supresión (eliminación de cuenta) y facilita la
// portabilidad/exportación de los datos asociados a la cuenta.
//
// La eliminación real se delega en la función SQL `public.delete_my_account()`
// (SECURITY DEFINER, migración 20240101000009_account_deletion.sql), que borra
// la fila de `auth.users` del propio usuario. Las tablas de datos de usuario
// (profiles, favorites, reminders, assistant_messages vía conversación) usan
// ON DELETE CASCADE, por lo que se eliminan junto a la cuenta. Las filas de
// assistant_conversations y feedback que referencian user_id se conservan con
// user_id = NULL (por diseño de la base de datos).
//
// El cliente NUNCA puede borrar de `auth.users` directamente; por eso este
// servicio invoca el RPC autorizado.

import { getSupabaseClient } from '../supabase';

export interface DeleteAccountResult {
    error: Error | null;
}

export interface ExportUserDataResult {
    data: Record<string, unknown> | null;
    error: Error | null;
}

export const accountService = {
    /**
     * Elimina definitivamente la cuenta del usuario autenticado y sus datos
     * asociados invocando el RPC `delete_my_account`.
     */
    async deleteAccount(): Promise<DeleteAccountResult> {
        try {
            const { error } = await getSupabaseClient().rpc('delete_my_account');
            if (error) {
                return { error: new Error(error.message) };
            }
            return { error: null };
        } catch (err) {
            return {
                error: err instanceof Error
                    ? err
                    : new Error('Error al eliminar la cuenta. Inténtalo más tarde.')
            };
        }
    },

    /**
     * Recopila los datos asociados a la cuenta del usuario (favortios,
     * recordatorios, conversaciones y perfil) para facilitar su acceso,
     * rectificación, portabilidad y control por el usuario.
     * Cada consulta se gestiona de forma independiente para que un fallo en
     * una tabla no impida devolver el resto.
     */
    async exportUserData(): Promise<ExportUserDataResult> {
        try {
            const client = getSupabaseClient();
            const results: Record<string, unknown> = {};

            const [profile, favorites, reminders, conversations] = await Promise.all([
                client.from('profiles').select('*').maybeSingle(),
                client.from('favorites').select('*'),
                client.from('reminders').select('*'),
                client.from('assistant_conversations').select('*'),
            ]);

            results.profile = profile.data ?? null;
            results.favorites = favorites.data ?? [];
            results.favoritesError = favorites.error ? favorites.error.message : null;
            results.reminders = reminders.data ?? [];
            results.remindersError = reminders.error ? reminders.error.message : null;
            results.conversations = conversations.data ?? [];
            results.conversationsError = conversations.error ? conversations.error.message : null;

            return { data: results, error: null };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error
                    ? err
                    : new Error('Error al exportar los datos. Inténtalo más tarde.')
            };
        }
    }
};
