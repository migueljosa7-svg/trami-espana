-- FASE 5.9 — FIX: public SELECT policies for content tables
-- Require both is_published=true AND verification_status='verified'
-- for child content tables, matching the procedures table policy.

BEGIN;

-- procedure_requirements
DROP POLICY IF EXISTS "Procedure requirements are publicly readable for published procedures"
  ON public.procedure_requirements;

CREATE POLICY "Procedure requirements are publicly readable for published and verified procedures"
  ON public.procedure_requirements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.procedures
      WHERE procedures.id = procedure_requirements.procedure_id
        AND procedures.is_published = true
        AND procedures.verification_status = 'verified'
    )
  );

-- procedure_documents
DROP POLICY IF EXISTS "Procedure documents are publicly readable for published procedures"
  ON public.procedure_documents;

CREATE POLICY "Procedure documents are publicly readable for published and verified procedures"
  ON public.procedure_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.procedures
      WHERE procedures.id = procedure_documents.procedure_id
        AND procedures.is_published = true
        AND procedures.verification_status = 'verified'
    )
  );

-- procedure_steps
DROP POLICY IF EXISTS "Procedure steps are publicly readable for published procedures"
  ON public.procedure_steps;

CREATE POLICY "Procedure steps are publicly readable for published and verified procedures"
  ON public.procedure_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.procedures
      WHERE procedures.id = procedure_steps.procedure_id
        AND procedures.is_published = true
        AND procedures.verification_status = 'verified'
    )
  );

-- procedure_links
DROP POLICY IF EXISTS "Procedure links are publicly readable for published procedures"
  ON public.procedure_links;

CREATE POLICY "Procedure links are publicly readable for published and verified procedures"
  ON public.procedure_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.procedures
      WHERE procedures.id = procedure_links.procedure_id
        AND procedures.is_published = true
        AND procedures.verification_status = 'verified'
    )
  );

COMMIT;
