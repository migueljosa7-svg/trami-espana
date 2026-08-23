-- ===========================================
-- TRAMI ESPAÑA - FASE 7.1: Supresión de cuenta (derecho al olvido)
-- ===========================================
-- Implementa el derecho de supresión del RGPD/LOPDGDD de forma real.
--
-- El cliente web/móvil NO puede borrar filas de `auth.users` directamente
-- (el SDK de cliente no permite DELETE sobre auth.users). La vía correcta es
-- un RPC SECURITY DEFINER que, ejecutándose con privilegios del propietario
-- (postgres), borra la cuenta `auth.users` del usuario autenticado.
--
-- EFECTO EN DATOS (ON DELETE, definido en migración inicial):
--   - profiles.user_id            ON DELETE CASCADE  -> se elimina
--   - favorites.user_id           ON DELETE CASCADE  -> se elimina
--   - reminders.user_id           ON DELETE CASCADE  -> se elimina
--   - assistant_messages          ON DELETE CASCADE (vía assistant_conversations) -> se elimina
--   - assistant_conversations.user_id ON DELETE SET NULL -> la fila se CONSERVA con user_id NULL
--   - feedback.user_id            ON DELETE SET NULL -> la fila se CONSERVA con user_id NULL
--
-- Las filas que se conservan con user_id = NULL NO contienen datos personales
-- identificables del usuario y pueden mantenerse por necesidades técnicas del
-- servicio (histórico agregado) sin violar el derecho de supresión.

BEGIN;

-- Eliminar por si existiera una versión previa.
DROP POLICY IF EXISTS "Users can delete own account" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own account" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own account" ON public.reminders;

-- RPC principal: borra la cuenta del usuario autenticado.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Si no hay usuario autenticado, no se puede eliminar nada.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;

    -- Borrar la fila de auth.users. Las tablas de datos de usuario asociadas
    -- se eliminan o se disocian según el ON DELETE declarado en el esquema.
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Solo usuarios autenticados pueden invocar la función.
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMIT;
