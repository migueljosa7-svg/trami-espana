-- ===========================================
-- TRAMI ESPAÑA - FASE 5.2: Bloquear escrituras de contenido administrativo
-- ===========================================
-- Objetivo: cerrar la vulnerabilidad por la que cualquier usuario autenticado
-- (auth.uid() IS NOT NULL) podía INSERT/UPDATE/DELETE en las tablas de contenido
-- administrativo:
--   - procedure_requirements
--   - procedure_documents
--   - procedure_steps
--   - procedure_links
--
-- Decisiones tomadas (según auditoría de la BD remota):
--   1. NO existe un sistema de roles admin real (is_admin() es un stub que devuelve FALSE).
--   2. NO existe tabla/columna de roles admin (solo 'assistant_messages.role', que no es un
--      sistema de roles).
--   3. Por tanto, NO se introduce ninguna política de escritura nueva ni se improvisa admin.
--   4. Se ELIMINAN las políticas inseguras 'auth.uid() IS NOT NULL'.
--      Tras su eliminación y con RLS habilitado, la ausencia de política de INSERT/UPDATE/DELETE
--      provoca que la operación se DENIEGUE por defecto (PostgreSQL RLS: sin política = denegado).
--   5. Las políticas de SELECT públicas se mantienen EXACTAMENTE IGUAL (no se rompe la lectura).
--   6. No se modifica 'procedures': ya solo tiene política SELECT pública; no hay escritura
--      concedida a usuarios normales, por lo que ya estaba protegida por defecto.
--   7. No se borran datos. No se toca seed.sql. No se convierte ningún DEMO en verified.
--
-- La migración es IDEMPOTENTE y REVERSIBLE: se puede re-ejecutar (DROP IF EXISTS) y
-- documenta cómo restaurar el estado anterior si fuera necesario.
--
-- Siguiente paso (NO implementado aquí): implementar roles admin reales
-- (p.ej. columna 'role' en profiles o tabla 'admin_roles') y, solo entonces, añadir
-- políticas de escritura basadas en esa función de autorización real.
-- ===========================================

-- ===========================================
-- 1) procedure_requirements
-- ===========================================
DROP POLICY IF EXISTS "Only authenticated users can insert procedure requirements" ON public.procedure_requirements;
DROP POLICY IF EXISTS "Only authenticated users can update procedure requirements" ON public.procedure_requirements;
DROP POLICY IF EXISTS "Only authenticated users can delete procedure requirements" ON public.procedure_requirements;

-- ===========================================
-- 2) procedure_documents
-- ===========================================
DROP POLICY IF EXISTS "Only authenticated users can insert procedure documents" ON public.procedure_documents;
DROP POLICY IF EXISTS "Only authenticated users can update procedure documents" ON public.procedure_documents;
DROP POLICY IF EXISTS "Only authenticated users can delete procedure documents" ON public.procedure_documents;

-- ===========================================
-- 3) procedure_steps
-- ===========================================
DROP POLICY IF EXISTS "Only authenticated users can insert procedure steps" ON public.procedure_steps;
DROP POLICY IF EXISTS "Only authenticated users can update procedure steps" ON public.procedure_steps;
DROP POLICY IF EXISTS "Only authenticated users can delete procedure steps" ON public.procedure_steps;

-- ===========================================
-- 4) procedure_links
-- ===========================================
DROP POLICY IF EXISTS "Only authenticated users can insert procedure links" ON public.procedure_links;
DROP POLICY IF EXISTS "Only authenticated users can update procedure links" ON public.procedure_links;
DROP POLICY IF EXISTS "Only authenticated users can delete procedure links" ON public.procedure_links;

-- ===========================================
-- NOTA DE AUDITORÍA (para futura referencia)
-- ===========================================
-- Tras esta migración, las tablas de contenido quedan:
--   - SELECT: pública (solo para trámites publicados)  [sin cambios]
--   - INSERT: DENEGADO para anon y authenticated (sin política)
--   - UPDATE: DENEGADO para anon y authenticated (sin política)
--   - DELETE: DENEGADO para anon y authenticated (sin política)
-- Solo el propietario (postgres / service_role) puede escribir, como debe ser.
--
-- 'procedures' NO se modifica: solo tiene política SELECT pública y, al no existir
-- políticas de escritura, ya estaba protegida por defecto frente a usuarios normales.
-- ===========================================
