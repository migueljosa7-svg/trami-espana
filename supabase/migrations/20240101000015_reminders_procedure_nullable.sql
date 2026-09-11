-- ===========================================
-- TRAMI ESPAÑA - Recordatorios sin trámite obligatorio
-- ===========================================
-- La app móvil permite crear recordatorios manuales (título + fecha)
-- sin asociarlos a un trámite del catálogo. Hasta ahora procedure_id era
-- NOT NULL, lo que provocaba fallos de FK/UUID (22P02/23503) al insertar
-- con procedure_id = '' o NULL. Esta migración lo hace NULLABLE de forma
-- segura e idempotente. No se borran datos ni políticas RLS.
-- Requiere que el servicio envíe NULL (nunca '') cuando no hay trámite.

ALTER TABLE IF EXISTS public.reminders
    ALTER COLUMN procedure_id DROP NOT NULL;

-- La FK con ON DELETE CASCADE se conserva: si se borra el trámite se
-- borran sus recordatorios; los manuales (procedure_id IS NULL) no se ven
-- afectados.

COMMENT ON COLUMN public.reminders.procedure_id IS
    'Trámite asociado (nullable: NULL = recordatorio manual sin trámite).';
