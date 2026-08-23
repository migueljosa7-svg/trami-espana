-- Alinear grants de la tabla feedback con las políticas RLS existentes.
-- La tabla feedback fue creada en 20250201185100_feedback_table.sql con
-- políticas RLS definidas, pero los grants no respaldan esas políticas:
--   - SELECT público  → política "Feedback is publicly readable" (USING true)
--   - INSERT autenticado → política "Authenticated users can create feedback"
--   - UPDATE/DELETE owner → políticas "Users can update/delete own feedback"
--
-- Sin estos grants, la API REST no puede alcanzar las políticas (RLS deniega
-- por defecto cuando no hay grant). No hay código cliente que use la tabla aún,
-- pero los grants deben estar alineados con el diseño documentado.
--
-- Patrón seguido: coincide con el patrón de otras tablas de datos de usuario
-- (profiles, favorites, reminders) donde authenticated tiene DML completo.

-- Lectura pública (politica USING true)
GRANT SELECT ON TABLE public.feedback TO anon;

-- DML para usuarios autenticados (INSERT según CHECK, UPDATE/DELETE según USING owner)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feedback TO authenticated;
