-- ===========================================
-- TRAMI ESPAÑA - FASE 5.4: Reconciliación de Esquema
-- ===========================================
-- Elimina residuos de columnas obsoletas de la tabla procedures.
-- Las columnas legacy (status, requirements TEXT[], documents TEXT[],
-- steps JSONB, official_links JSONB, full_description, seo_title,
-- seo_description, last_updated) han sido reemplazadas por:
--   - is_published + verification_status (en lugar de status)
--   - tablas normalizadas: procedure_requirements, procedure_documents,
--     procedure_steps, procedure_links
--   - description (en lugar de full_description)
--   - updated_at (en lugar de last_updated)
-- No se borran migraciones históricas. No se borran datos de las tablas
-- normalizadas. No se toca seed.sql. Es seguro e idempotente.

-- ===========================================
-- 1. DROPEAR ÍNDICE LEGADO
-- ===========================================
DROP INDEX IF EXISTS public.idx_procedures_status;

-- ===========================================
-- 2. DROPEAR COLUMNAS LEGADAS DE procedures
-- ===========================================
-- status: reemplazado por is_published + verification_status
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS status;

-- requirements TEXT[]: reemplazado por tabla procedure_requirements
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS requirements;

-- documents TEXT[]: reemplazado por tabla procedure_documents
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS documents;

-- steps JSONB: reemplazado por tabla procedure_steps
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS steps;

-- official_links JSONB: reemplazado por tabla procedure_links
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS official_links;

-- full_description: reemplazado por description (la columna description existe desde migration 0002)
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS full_description;

-- seo_title, seo_description: no usados por la aplicación
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS seo_title;
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS seo_description;

-- last_updated: reemplazado por updated_at
ALTER TABLE IF EXISTS public.procedures
    DROP COLUMN IF EXISTS last_updated;

-- ===========================================
-- 3. ÍNDICE PARA verification_status
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_procedures_verification_status
    ON public.procedures(verification_status);

-- ===========================================
-- 4. COMENTARIOS DE RECONCILIACIÓN
-- ===========================================
COMMENT ON TABLE public.procedures IS
    'Trámites administrativos españoles. Publicación segura: is_published=true AND verification_status=verified. Columna legacy status eliminada (usar verification_status).';
