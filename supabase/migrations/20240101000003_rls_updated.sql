-- ===========================================
-- TRAMI ESPAÑA - Políticas RLS Actualizadas
-- ===========================================
-- Esta migración actualiza las políticas RLS para las nuevas tablas

-- ===========================================
-- HABILITAR RLS EN NUEVAS TABLAS
-- ===========================================
ALTER TABLE public.procedure_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_links ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- POLÍTICAS PARA procedure_requirements
-- ===========================================

-- Los requisitos de trámites publicados son públicos de lectura
CREATE POLICY "Procedure requirements are publicly readable for published procedures"
    ON public.procedure_requirements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.procedures
            WHERE procedures.id = procedure_requirements.procedure_id
            AND procedures.is_published = true
        )
    );

-- Solo administradores pueden modificar requisitos (por ahora, nadie)
CREATE POLICY "Only authenticated users can insert procedure requirements"
    ON public.procedure_requirements FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can update procedure requirements"
    ON public.procedure_requirements FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can delete procedure requirements"
    ON public.procedure_requirements FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ===========================================
-- POLÍTICAS PARA procedure_documents
-- ===========================================

-- Los documentos de trámites publicados son públicos de lectura
CREATE POLICY "Procedure documents are publicly readable for published procedures"
    ON public.procedure_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.procedures
            WHERE procedures.id = procedure_documents.procedure_id
            AND procedures.is_published = true
        )
    );

-- Solo administradores pueden modificar documentos
CREATE POLICY "Only authenticated users can insert procedure documents"
    ON public.procedure_documents FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can update procedure documents"
    ON public.procedure_documents FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can delete procedure documents"
    ON public.procedure_documents FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ===========================================
-- POLÍTICAS PARA procedure_steps
-- ===========================================

-- Los pasos de trámites publicados son públicos de lectura
CREATE POLICY "Procedure steps are publicly readable for published procedures"
    ON public.procedure_steps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.procedures
            WHERE procedures.id = procedure_steps.procedure_id
            AND procedures.is_published = true
        )
    );

-- Solo administradores pueden modificar pasos
CREATE POLICY "Only authenticated users can insert procedure steps"
    ON public.procedure_steps FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can update procedure steps"
    ON public.procedure_steps FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can delete procedure steps"
    ON public.procedure_steps FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ===========================================
-- POLÍTICAS PARA procedure_links
-- ===========================================

-- Los enlaces de trámites publicados son públicos de lectura
CREATE POLICY "Procedure links are publicly readable for published procedures"
    ON public.procedure_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.procedures
            WHERE procedures.id = procedure_links.procedure_id
            AND procedures.is_published = true
        )
    );

-- Solo administradores pueden modificar enlaces
CREATE POLICY "Only authenticated users can insert procedure links"
    ON public.procedure_links FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can update procedure links"
    ON public.procedure_links FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can delete procedure links"
    ON public.procedure_links FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ===========================================
-- ACTUALIZAR POLÍTICAS DE procedures
-- ===========================================

-- Eliminar política anterior si existe
DROP POLICY IF EXISTS "Published procedures are publicly readable" ON public.procedures;

-- Crear nueva política considerando is_published
CREATE POLICY "Published procedures are publicly readable"
    ON public.procedures FOR SELECT
    USING (is_published = true);

-- ===========================================
-- FUNCIÓN PARA BÚSQUEDA FULL-TEXT
-- ===========================================

-- Función para buscar procedimientos
CREATE OR REPLACE FUNCTION public.search_procedures(
    search_query TEXT,
    category_filter UUID DEFAULT NULL,
    scope_filter TEXT DEFAULT NULL,
    autonomous_community_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    short_description TEXT,
    description TEXT,
    category_id UUID,
    scope TEXT,
    autonomous_community TEXT,
    province TEXT,
    municipality TEXT,
    is_published BOOLEAN,
    last_verified_at TIMESTAMPTZ,
    verification_status TEXT,
    source TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.short_description,
        p.description,
        p.category_id,
        p.scope,
        p.autonomous_community,
        p.province,
        p.municipality,
        p.is_published,
        p.last_verified_at,
        p.verification_status,
        p.source,
        p.source_url,
        p.created_at,
        p.updated_at,
        ts_rank(p.search_vector, websearch_to_tsquery('spanish', search_query)) as rank
    FROM public.procedures p
    WHERE 
        p.is_published = true
        AND p.search_vector @@ websearch_to_tsquery('spanish', search_query)
        AND (category_filter IS NULL OR p.category_id = category_filter)
        AND (scope_filter IS NULL OR p.scope = scope_filter)
        AND (autonomous_community_filter IS NULL OR p.autonomous_community = autonomous_community_filter)
    ORDER BY rank DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Permisos para la función de búsqueda
GRANT EXECUTE ON FUNCTION public.search_procedures TO anon;
GRANT EXECUTE ON FUNCTION public.search_procedures TO authenticated;