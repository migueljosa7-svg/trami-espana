# Trami España — Configuración de Supabase para Producción

Este documento recoge la configuración recomendada de Supabase para el entorno de **producción**.

---

## 1. Proyecto Supabase

- Crea un proyecto dedicado para producción (no compartas el proyecto de desarrollo).
- Habilita:
  - **Email confirmations** (`enable_confirmations = true`)
  - **Secure email change** (si aplica)
  - **Leaked password protection** (si está disponible)

---

## 2. Auth

### URLs permitidas

En **Authentication → URL Configuration**:

- **Site URL**: `https://tramiespana.es`
- **Redirect URLs**:
  - `https://tramiespana.es/**`
  - `https://www.tramiespana.es/**`

En móvil (si aplica):

- `exp://127.0.0.1:19000/**` (solo desarrollo)
- Dominios de producción de la app cuando se publiquen.

### Proveedores OAuth

No configures proveedores OAuth (Google, Apple, etc.) sin credenciales reales validadas.

---

## 3. RLS

Todas las tablas sensibles tienen RLS activado:

- `procedures`
- `procedure_requirements`
- `procedure_documents`
- `procedure_steps`
- `procedure_links`
- `procedure_categories`
- `profiles`
- `favorites`
- `reminders`
- `assistant_conversations`
- `assistant_messages`

Solo administradores pueden escribir en tablas de contenido.
El público lee solo contenido `is_published = true AND verification_status = 'verified'`.

---

## 4. Secrets

Los siguientes secrets deben definirse en **Edge Functions → Secrets**:

| Nombre | Descripción |
|---|---|
| `LLM_API_KEY` | Clave del modelo de lenguaje |
| `LLM_PROVIDER` | Proveedor LLM (`openai`, etc.) |

**No versiones secretos en el repositorio.**

---

## 5. CORS

La Edge Function `assistant` responde con headers CORS permitiendo cualquier origen.
Para producción, restringe `Access-Control-Allow-Origin` a tus dominios reales.

---

## 6. Backups

Habilita backups automáticos diarios en Supabase.

---

## 7. Rollback

Ante un problema grave:

1. No ejecutes `DROP` ni `TRUNCATE` en producción sin confirmación explícita.
2. Usa el panel de Supabase para restaurar un backup.
3. Si el problema es una migración nueva, documenta el revert antes de deshacerla.
