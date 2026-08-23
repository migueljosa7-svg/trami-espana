-- Hardening de funciones SECURITY DEFINER (Fase 11, ciclo final):
-- Fija search_path en public.is_admin() para eliminar el riesgo de secuestro
-- de resolución de identificadores no cualificados dentro de una función
-- DEFINER (recomendación oficial del linter de Supabase).
--
-- No altera el comportamiento observable: únicamente hace determinista la
-- resolución que hoy depende del search_path del invocador.
-- delete_my_account() y rls_auto_enable() ya tienen search_path fijado.

ALTER FUNCTION public.is_admin() SET search_path = public, auth;
