-- ===========================================
-- TRAMI ESPAÑA - Esquema Normalizado
-- ===========================================
-- Esta migración agrega tablas normalizadas para procedimientos
-- y mejora el esquema existente

-- ===========================================
-- MODIFICAR TABLA procedures
-- ===========================================

-- Agregar columnas faltantes a procedures
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'draft' CHECK (verification_status IN ('draft', 'verified', 'needs_review', 'archived'));
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Renombrar status a is_published (si existe)
-- NOTA: Si ya tienes datos, necesitas migrar el campo status primero
-- Por ahora, mantenemos ambos campos para compatibilidad

-- Actualizar el CHECK constraint de scope para incluir 'estatal'
ALTER TABLE public.procedures DROP CONSTRAINT IF EXISTS procedures_scope_check;
ALTER TABLE public.procedures ADD CONSTRAINT procedures_scope_check 
    CHECK (scope IN ('estatal', 'autonómico', 'provincial', 'municipal'));

-- ===========================================
-- TABLA: procedure_requirements
-- ===========================================
CREATE TABLE IF NOT EXISTS public.procedure_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: procedure_documents
-- ===========================================
CREATE TABLE IF NOT EXISTS public.procedure_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT true NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: procedure_steps
-- ===========================================
CREATE TABLE IF NOT EXISTS public.procedure_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: procedure_links
-- ===========================================
CREATE TABLE IF NOT EXISTS public.procedure_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    link_type TEXT NOT NULL CHECK (link_type IN ('official', 'appointment', 'information', 'download', 'other')),
    is_official BOOLEAN DEFAULT false NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- ÍNDICES PARA BÚSQUEDA Y FILTRADO
-- ===========================================

-- Índices para procedures
CREATE INDEX IF NOT EXISTS idx_procedures_slug ON public.procedures(slug);
CREATE INDEX IF NOT EXISTS idx_procedures_is_published ON public.procedures(is_published);
CREATE INDEX IF NOT EXISTS idx_procedures_category_id ON public.procedures(category_id);
CREATE INDEX IF NOT EXISTS idx_procedures_scope ON public.procedures(scope);
CREATE INDEX IF NOT EXISTS idx_procedures_autonomous_community ON public.procedures(autonomous_community);
CREATE INDEX IF NOT EXISTS idx_procedures_verification_status ON public.procedures(verification_status);

-- Índices para tablas relacionadas
CREATE INDEX IF NOT EXISTS idx_procedure_requirements_procedure_id ON public.procedure_requirements(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_documents_procedure_id ON public.procedure_documents(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_steps_procedure_id ON public.procedure_steps(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_links_procedure_id ON public.procedure_links(procedure_id);

-- ===========================================
-- FULL TEXT SEARCH EN PROCEDURES
-- ===========================================

-- Crear columna tsvector para búsqueda de texto completo
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Función para actualizar el vector de búsqueda
CREATE OR REPLACE FUNCTION public.update_procedure_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('spanish', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.short_description, '')), 'B') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el vector de búsqueda
DROP TRIGGER IF EXISTS update_procedure_search_vector ON public.procedures;
CREATE TRIGGER update_procedure_search_vector
    BEFORE INSERT OR UPDATE OF title, short_description, description
    ON public.procedures
    FOR EACH ROW
    EXECUTE FUNCTION public.update_procedure_search_vector();

-- Índice GIN para búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_procedures_search_vector ON public.procedures USING GIN(search_vector);

-- ===========================================
-- TRIGGERS PARA UPDATED_AT
-- ===========================================

-- Actualizar updated_at en procedures
DROP TRIGGER IF EXISTS set_updated_at_procedures ON public.procedures;
CREATE TRIGGER set_updated_at_procedures
    BEFORE UPDATE ON public.procedures
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para actualizar updated_at en tablas relacionadas
DROP TRIGGER IF EXISTS set_updated_at_procedure_requirements ON public.procedure_requirements;
CREATE TRIGGER set_updated_at_procedure_requirements
    BEFORE UPDATE ON public.procedure_requirements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_procedure_documents ON public.procedure_documents;
CREATE TRIGGER set_updated_at_procedure_documents
    BEFORE UPDATE ON public.procedure_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_procedure_steps ON public.procedure_steps;
CREATE TRIGGER set_updated_at_procedure_steps
    BEFORE UPDATE ON public.procedure_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- COMENTARIOS EN TABLAS
-- ===========================================

COMMENT ON TABLE public.procedures IS 'Trámites administrativos españoles';
COMMENT ON TABLE public.procedure_requirements IS 'Requisitos para realizar un trámite';
COMMENT ON TABLE public.procedure_documents IS 'Documentación necesaria para un trámite';
COMMENT ON TABLE public.procedure_steps IS 'Pasos a seguir en un trámite';
COMMENT ON TABLE public.procedure_links IS 'Enlaces relacionados con un trámite';