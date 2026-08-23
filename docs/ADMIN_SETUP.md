# Trami España — Configuración de Administrador

Este documento explica cómo crear el **primer usuario administrador** en Supabase.

---

## 1. Visión general del sistema de roles

- Tabla: `public.user_roles`
- Rol soportado: `admin`
- Función: `public.is_admin()`
- Política: solo administradores pueden escribir en tablas de contenido.

Un usuario normal **no puede**:
- concederse rol admin
- modificar `user_roles`
- saltarse RLS

---

## 2. Crear el primer administrador

Necesitas acceso SQL con privilegios suficientes (por ejemplo, desde Supabase Dashboard → SQL Editor).

### Paso 1 — Crear un usuario en Auth

1. Ve a **Authentication → Users → Invite** (o registrate desde la app en modo development).
2. Anota el `user_id` del usuario.

### Paso 2 — Asignar rol admin

Ejecuta en SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('UUID-DEL-USUARIO', 'admin', 'UUID-DEL-USUARIO')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Paso 3 — Verificar

```sql
SELECT ur.user_id, u.email, ur.role
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

Si aparece el usuario, el rol está activo.

### Paso 4 — Probar

Desde la aplicación, con la sesión iniciada, las operaciones de escritura sobre:

- `procedures`
- `procedure_requirements`
- `procedure_documents`
- `procedure_steps`
- `procedure_links`
- `procedure_categories`

deben funcionar.

Desde un usuario sin rol admin, deben fallar con error RLS.

---

## 3. Revocar administrador

```sql
DELETE FROM public.user_roles
WHERE user_id = 'UUID-DEL-USUARIO'
  AND role = 'admin';
```

---

## 4. Notas

- No almacenes la `service_role` key en frontend ni en código cliente.
- `is_admin()` es `SECURITY DEFINER` y consulta `user_roles` directamente, evitando recursión RLS.
- No uses `user_metadata` como fuente de autoridad para el rol.
