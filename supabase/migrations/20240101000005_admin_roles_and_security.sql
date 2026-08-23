-- ===========================================
-- TRAMI ESPAÑA - FASE 5.3+5.5+5.7+5.11: Roles Admin + Seguridad + Anónimos
-- ===========================================
-- 1. Crea tabla user_roles (rol admin real, no hardcodeado)
-- 2. Reemplaza is_admin() → comprueba user_roles en BD
-- 3. Añade políticas admin-only (INSERT/UPDATE/DELETE) a tablas de contenido
-- 4. Refuerza SELECT público de procedures con verification_status='verified'
-- 5. Actualiza search_procedures() → también filtra verification_status='verified'
-- 6. Corrige last_verified_at de trámites DEMO (draft → NULL)
-- 7. Alinea CHECK de role en assistant_messages con 'system'
-- 8. Permite conversaciones anónimas (user_id nullable + RLS actualizado)
-- No modifica migraciones anteriores. No borra datos. No convierte DEMO en verified.

-- ===========================================
-- 1. TABLA: user_roles
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver SU propio rol. No se expone información de otros usuarios.
-- La política NO llama a is_admin() para evitar recursión RLS.
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- ===========================================
-- 2. FUNCIÓN: is_admin() — versión real
-- ===========================================
-- Reemplaza el stub que devolvía FALSE.
-- Comprueba en user_roles si el usuario autenticado tiene rol 'admin'.
-- SECURITY DEFINER para poder leer user_roles aunque RLS lo restrinja.
-- Sin recursión: la política SELECT de user_roles usa auth.uid()=user_id, no is_admin().
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ===========================================
-- 3. POLÍTICAS ADMIN para tablas de contenido
-- ===========================================
CREATE POLICY "Admins can insert procedures"
    ON public.procedures FOR INSERT
    WITH CHECK (is_admin());
CREATE POLICY "Admins can update procedures"
    ON public.procedures FOR UPDATE
    USING (is_admin());
CREATE POLICY "Admins can delete procedures"
    ON public.procedures FOR DELETE
    USING (is_admin());

CREATE POLICY "Admins can insert categories"
    ON public.procedure_categories FOR INSERT
    WITH CHECK (is_admin());
CREATE POLICY "Admins can update categories"
    ON public.procedure_categories FOR UPDATE
    USING (is_admin());
CREATE POLICY "Admins can delete categories"
    ON public.procedure_categories FOR DELETE
    USING (is_admin());

CREATE POLICY "Admins can insert procedure requirements"
    ON public.procedure_requirements FOR INSERT
    WITH CHECK (is_admin());
CREATE POLICY "Admins can update procedure requirements"
    ON public.procedure_requirements FOR UPDATE
    USING (is_admin());
CREATE POLICY "Admins can delete procedure requirements"
    ON public.procedure_requirements FOR DELETE
    USING (is_admin());

CREATE POLICY "Admins can insert procedure documents"
    ON public.procedure_documents FOR INSERT
    WITH CHECK (is_admin());
CREATE POLICY "Admins can update procedure documents"
    ON public.procedure_documents FOR UPDATE
    USING (is_admin());
CREATE POLICY "Admins can delete procedure documents"
    ON public.procedure_documents FOR DELETE
    USING (is_admin());

CREATE POLICY "Admins can insert procedure steps"
    ON public.procedure_steps FOR INSERT
    WITH CHECK (is_admin());
CREATE POLICY "Admins can update procedure steps"
    ON public.procedure_steps FOR UPDATE
    USING (is_admin());
CREATE POLICY "Admins can delete procedure steps"
    ON public.procedure_steps FOR DELETE
    USING (is_admin());

CREATE POLICY "Admins can insert procedure links"
    ON public.procedure_links FOR INSERT
    WITH CHECK (is_admin());
CREATE POLICY "Admins can update procedure links"
    ON public.procedure_links FOR UPDATE
    USING (is_admin());
CREATE POLICY "Admins can delete procedure links"
    ON public.procedure_links FOR DELETE
    USING (is_admin());

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update feedback"
    ON public.feedback FOR UPDATE
    USING (is_admin());
CREATE POLICY "Admins can delete feedback"
    ON public.feedback FOR DELETE
    USING (is_admin());

-- ===========================================
-- 4. REFORZAR SELECT público de procedures con verification_status
-- ===========================================
-- Defense in depth: el RLS solo devuelve contenido verificado/publicado.
DROP POLICY IF EXISTS "Published procedures are publicly readable" ON public.procedures;
CREATE POLICY "Published procedures are publicly readable"
    ON public.procedures FOR SELECT
        USING (is_published = true AND verification_status = 'verified');

-- ===========================================
-- 5. ACTUALIZAR search_procedures() SQL function
-- ===========================================
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
        AND p.verification_status = 'verified'
        AND p.search_vector @@ websearch_to_tsquery('spanish', search_query)
        AND (category_filter IS NULL OR p.category_id = category_filter)
        AND (scope_filter IS NULL OR p.scope = scope_filter)
        AND (autonomous_community_filter IS NULL OR p.autonomous_community = autonomous_community_filter)
    ORDER BY rank DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.search_procedures TO anon;
GRANT EXECUTE ON FUNCTION public.search_procedures TO authenticated;

-- ===========================================
-- 6. CORREGIR last_verified_at de trámites DEMO (draft → NULL)
-- ===========================================
UPDATE public.procedures
    SET last_verified_at = NULL,
        verified_by = NULL
WHERE verification_status = 'draft'
  AND last_verified_at IS NOT NULL;

-- ===========================================
-- 7. ALINEAR CHECK de role en assistant_messages con 'system'
-- ===========================================
ALTER TABLE IF EXISTS public.assistant_messages
    DROP CONSTRAINT IF EXISTS assistant_messages_role_check;
ALTER TABLE IF EXISTS public.assistant_messages
    ADD CONSTRAINT assistant_messages_role_check
    CHECK (role IN ('user', 'assistant', 'system'));

-- ===========================================
-- 8. CONVERSACIONES ANÓNIMAS DEL ASISTENTE
-- ===========================================
ALTER TABLE IF EXISTS public.assistant_conversations
    ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.assistant_conversations;
CREATE POLICY "Users can view own conversations"
    ON public.assistant_conversations FOR SELECT
    USING (
        auth.uid() = user_id
        OR (auth.uid() IS NULL AND user_id IS NULL)
    );

DROP POLICY IF EXISTS "Users can create conversations" ON public.assistant_conversations;
CREATE POLICY "Users can create conversations"
    ON public.assistant_conversations FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR (auth.uid() IS NULL AND user_id IS NULL)
    );

DROP POLICY IF EXISTS "Users can update own conversations" ON public.assistant_conversations;
CREATE POLICY "Users can update own conversations"
    ON public.assistant_conversations FOR UPDATE
    USING (
        auth.uid() = user_id
        OR (auth.uid() IS NULL AND user_id IS NULL)
    );

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.assistant_conversations;
CREATE POLICY "Users can delete own conversations"
    ON public.assistant_conversations FOR DELETE
    USING (
        auth.uid() = user_id
        OR (auth.uid() IS NULL AND user_id IS NULL)
    );

