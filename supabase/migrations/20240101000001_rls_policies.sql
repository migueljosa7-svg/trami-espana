-- ===========================================
-- TRAMI ESPAÑA - Políticas de Seguridad RLS
-- ===========================================
-- Este archivo contiene las políticas de Row Level Security
-- Ejecutar después del esquema inicial

-- ===========================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ===========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- POLÍTICAS PARA profiles
-- ===========================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Los usuarios pueden crear su propio perfil
CREATE POLICY "Users can create own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ===========================================
-- POLÍTICAS PARA procedure_categories
-- ===========================================

-- Las categorías son públicas de lectura
CREATE POLICY "Categories are publicly readable"
    ON public.procedure_categories FOR SELECT
    USING (true);

-- ===========================================
-- POLÍTICAS PARA procedures
-- ===========================================

-- Los trámites publicados son públicos de lectura
CREATE POLICY "Published procedures are publicly readable"
    ON public.procedures FOR SELECT
    USING (status = 'published');

-- ===========================================
-- POLÍTICAS PARA favorites
-- ===========================================

-- Los usuarios pueden ver sus propios favoritos
CREATE POLICY "Users can view own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

-- Los usuarios pueden crear favoritos
CREATE POLICY "Users can create favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propios favoritos
CREATE POLICY "Users can delete own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ===========================================
-- POLÍTICAS PARA reminders
-- ===========================================

-- Los usuarios pueden ver sus propios recordatorios
CREATE POLICY "Users can view own reminders"
    ON public.reminders FOR SELECT
    USING (auth.uid() = user_id);

-- Los usuarios pueden crear recordatorios
CREATE POLICY "Users can create reminders"
    ON public.reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propios recordatorios
CREATE POLICY "Users can update own reminders"
    ON public.reminders FOR UPDATE
    USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propios recordatorios
CREATE POLICY "Users can delete own reminders"
    ON public.reminders FOR DELETE
    USING (auth.uid() = user_id);

-- ===========================================
-- POLÍTICAS PARA assistant_conversations
-- ===========================================

-- Usuarios autenticados y anónimos pueden ver conversaciones
-- auth.uid() devuelve NULL para usuarios anónimos, por lo que agregamos OR user_id IS NULL
CREATE POLICY "Users can view own conversations"
    ON public.assistant_conversations FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Usuarios autenticados y anónimos pueden crear conversaciones
-- Permite INSERT con user_id autenticado o NULL (anonimato)
CREATE POLICY "Users can create conversations"
    ON public.assistant_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Usuarios autenticados y anónimos pueden actualizar sus propias conversaciones
CREATE POLICY "Users can update own conversations"
    ON public.assistant_conversations FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Usuarios autenticados y anónimos pueden eliminar sus propias conversaciones
CREATE POLICY "Users can delete own conversations"
    ON public.assistant_conversations FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ===========================================
-- POLÍTICAS PARA assistant_messages
-- ===========================================

-- Los usuarios pueden ver mensajes de sus conversaciones
CREATE POLICY "Users can view messages from own conversations"
    ON public.assistant_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assistant_conversations
            WHERE assistant_conversations.id = assistant_messages.conversation_id
            AND assistant_conversations.user_id = auth.uid()
        )
    );

-- Los usuarios pueden crear mensajes en sus conversaciones
CREATE POLICY "Users can create messages in own conversations"
    ON public.assistant_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assistant_conversations
            WHERE assistant_conversations.id = assistant_messages.conversation_id
            AND assistant_conversations.user_id = auth.uid()
        )
    );

-- ===========================================
-- POLÍTICAS PARA feedback
-- ===========================================

-- El feedback es público de lectura
CREATE POLICY "Feedback is publicly readable"
    ON public.feedback FOR SELECT
    USING (true);

-- Los usuarios autenticados pueden crear feedback
CREATE POLICY "Authenticated users can create feedback"
    ON public.feedback FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Los usuarios pueden actualizar su propio feedback
CREATE POLICY "Users can update own feedback"
    ON public.feedback FOR UPDATE
    USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar su propio feedback
CREATE POLICY "Users can delete own feedback"
    ON public.feedback FOR DELETE
    USING (auth.uid() = user_id);

-- ===========================================
-- FUNCIONES AUXILIARES
-- ===========================================

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Por ahora, retornamos false hasta que implementemos roles de admin
    -- En el futuro, se puede agregar una tabla de roles o verificar en profiles
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- HABILITAR ACCESO A FUNCIONES
-- ===========================================

-- Permitir que usuarios autenticados ejecuten is_admin
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;