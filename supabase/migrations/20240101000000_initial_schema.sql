-- ===========================================
-- TRAMI ESPAÑA - Esquema Inicial de Base de Datos
-- ===========================================
-- Este archivo contiene el esquema inicial de la base de datos
-- Ejecutar con: supabase migration up

-- ===========================================
-- EXTENSIONES
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TABLA: profiles
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- ===========================================
-- TABLA: procedure_categories
-- ===========================================
CREATE TABLE IF NOT EXISTS public.procedure_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: procedures
-- ===========================================
CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT NOT NULL,
    full_description TEXT NOT NULL,
    category_id UUID REFERENCES public.procedure_categories(id) NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('national', 'autonomous', 'provincial', 'municipal')),
    autonomous_community TEXT,
    province TEXT,
    municipality TEXT,
    requirements TEXT[] DEFAULT '{}',
    documents TEXT[] DEFAULT '{}',
    steps JSONB DEFAULT '[]'::jsonb,
    cost TEXT,
    estimated_duration TEXT,
    official_links JSONB DEFAULT '[]'::jsonb,
    source TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: favorites
-- ===========================================
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, procedure_id)
);

-- ===========================================
-- TABLA: reminders
-- ===========================================
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reminder_date TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: assistant_conversations
-- ===========================================
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: assistant_messages
-- ===========================================
CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.assistant_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- TABLA: feedback
-- ===========================================
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- ÍNDICES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_procedures_slug ON public.procedures(slug);
CREATE INDEX IF NOT EXISTS idx_procedures_status ON public.procedures(status);
CREATE INDEX IF NOT EXISTS idx_procedures_category ON public.procedures(category_id);
CREATE INDEX IF NOT EXISTS idx_procedures_scope ON public.procedures(scope);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_id ON public.assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_id ON public.assistant_messages(conversation_id);

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Trigger para actualizar updated_at en profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_procedures
    BEFORE UPDATE ON public.procedures
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_reminders
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_assistant_conversations
    BEFORE UPDATE ON public.assistant_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- DATOS INICIALES
-- ===========================================

-- Categorías de trámites
INSERT INTO public.procedure_categories (name, slug, description, icon, "order") VALUES
    ('Identidad y Nacionalidad', 'identidad', 'DNI, pasaporte, nacionalidad española', '🪪', 1),
    ('Empadronamiento', 'empadronamiento', 'Empadronamiento en municipios españoles', '📍', 2),
    ('Laboral y Empleo', 'laboral', 'Contratos, desempleo, seguridad laboral', '💼', 3),
    ('Seguridad Social', 'seguridad-social', 'Pensiones, prestaciones, alta médica', '🏥', 4),
    ('Vivienda', 'vivienda', 'Alquiler, compra, ayudas a la vivienda', '🏠', 5),
    ('Educación', 'educacion', 'Matrículas, becas, titulaciones', '📚', 6),
    ('Familia', 'familia', 'Matrimonio, nacimientos, adopción', '👨‍👩‍👧', 7),
    ('Vehículos', 'vehiculos', 'Matriculación, ITV, permisos de conducir', '🚗', 8),
    ('Impuestos', 'impuestos', 'IRPF, IVA, declaraciones', '💰', 9),
    ('Extranjería', 'extranjeria', 'Visados, residencia, ciudadanía', '🌍', 10),
    ('Empresas y Autónomos', 'empresas', 'Creación de empresas, autónomos', '🏢', 11),
    ('Consumo y Derechos', 'consumo', 'Derechos del consumidor, reclamaciones', '⚖️', 12)
ON CONFLICT (slug) DO NOTHING;