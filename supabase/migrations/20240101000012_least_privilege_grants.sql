-- ============================================================================
-- 20240101000012_least_privilege_grants.sql
-- FASE 11 — Endurecimiento de grants: mínimo privilegio real.
--
-- PROBLEMA DEMOSTRADO (auditoría 2026-08-22):
--   Las migraciones iniciales otorgaron GRANT ALL a anon/authenticated.
--   La auditoría posterior de grants revocó el DML indebido, pero quedaron
--   residuos sin uso legítimo en TODAS las tablas de public:
--     - TRUNCATE    (¡RLS NO filtra TRUNCATE! Es un privilegio a nivel de tabla)
--     - REFERENCES  (innecesario para clientes PostgREST)
--     - TRIGGER     (innecesario para clientes PostgREST)
--
--   PostgREST no expone TRUNCATE/REFERENCES/TRIGGER, por lo que no hay vía
--   de explotación directa hoy, pero el mínimo privilegio exige revocarlos:
--   cualquier futuro vector (función nueva, cambio de configur, pooler
--   directo) no debe encontrar TRUNCATE concedido a roles de cliente.
--
-- ACCIÓN:
--   REVOKE de los tres privilegios residuales en todas las tablas de public
--   para anon y authenticated. NO se toca SELECT/INSERT/UPDATE/DELETE
--   (alineados con las políticas RLS auditadas) ni el SELECT público de
--   feedback (por diseño, ver 20240101000010_feedback_grants.sql).
--
--   Además se fija ALTER DEFAULT PRIVILEGES para que las tablas futuras no
--   hereden estos residuos.
--
-- NO destructivo: no borra datos, no toca RLS ni políticas, no toca datos.
-- ============================================================================

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Tablas futuras creadas por el rol propietario en este esquema: sin residuos.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
