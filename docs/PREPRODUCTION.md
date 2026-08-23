# Trami España — Guía de Preproducción

Este documento describe el estado REAL de preproducción de Trami España, contrastado de nuevo en la auditoría final de la FASE 11 (2026-08-19) y **re-verificado íntegramente el 2026-08-23** (tests/typecheck/lint/build re-ejecutados, migraciones local vs remoto, métricas de contenido en BD remota, firma y manifest del AAB con jarsigner/bundletool, dimensiones de assets Play y security scan del index): consultas SQL a la BD remota re-ejecutadas, tests/typecheck/lint/build re-ejecutados y pruebas HTTP reales contra la API y la Edge Function.

---

## 1. Variables de entorno

### Frontend (web)

Archivo: `apps/web/.env.local` (no versionado)

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
VITE_APP_NAME=Trami España
VITE_APP_URL=http://localhost:5173
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ASSISTANT=true
VITE_ENABLE_FAVORITES=true
VITE_ENABLE_REMINDERS=true
NODE_ENV=development
```

### Frontend (mobile)

Archivo: `apps/mobile/.env` (no versionado)

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

### Backend (Supabase)

Los **secretos** se configuran en Supabase Dashboard → Settings → Edge Functions → Secrets.

| Secreto | Uso | Estado remoto |
|---|---|---|
| `LLM_API_KEY` | Clave del proveedor LLM (solo backend) | `VERIFIED` (configurado en Supabase Secrets) |
| `LLM_PROVIDER` | `openai` u otro proveedor soportado | `VERIFIED` (configurado en Supabase Secrets) |
| `CORS_ALLOWED_ORIGINS` | Orígenes legítimos para CORS de la Edge Function (separados por comas) | `PENDING_EXTERNAL` — NO configurado a propósito: el valor previo contenía un dominio no confirmado y fue eliminado. Sin secret, la función solo permite `http://localhost:5173` (dev); orígenes desconocidos no reciben cabecera `Access-Control-Allow-Origin` (el navegador los bloquea). Con dominio definitivo: `npx supabase secrets set CORS_ALLOWED_ORIGINS=https://DOMINIO-REAL,https://www.DOMINIO-REAL` |

**Importante:** Nunca commitear secretos ni mostrarlos en logs.

## 2. Migraciones

### Estado remoto (`supabase_migrations.schema_migrations`)

| Migración | Estado |
|---|---|
| `20240101000000_initial_schema.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000001_rls_policies.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000002_normalized_schema.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000003_rls_updated.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000004_lock_content_writes.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000005_admin_roles_and_security.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000006_schema_reconciliation.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000007_secure_content_tables_publication.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000008_anonymous_assistant_messages.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000009_account_deletion.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000010_feedback_grants.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000011_function_search_path_hardening.sql` | `VERIFIED` (aplicada en remoto) |
| `20240101000012_least_privilege_grants.sql` | `VERIFIED` (aplicada en remoto 2026-08-22: revoca TRUNCATE/REFERENCES/TRIGGER residuales de anon/authenticated; ver FASE11_CIERRE_FINAL §20) |

**No modifiques migraciones ya aplicadas.** Crea nuevas migraciones para cambios adicionales.

---

## 3. Seed y Contenido

### Datos DEMO (desarrollo local)
Los datos DEMO de `seed.sql` permanecen con `verification_status = 'draft'` y `is_published = true`.
No se muestran públicamente gracias a la regla de publicación segura (`is_published = true AND verification_status = 'verified'`).

### Datos oficiales en producción
- En la base de datos remota está cargado el primer trámite oficial real: `renovacion-dni` con `verification_status = 'verified'` y `verified_by = 'f327b75a-b43a-4be1-a636-68f7c102f682'` (Admin: `migueljosa7@gmail.com`).
- Estadísticas reales en base de datos:
  - `total`: 12
  - `published`: 12
  - `verified`: 1 (`renovacion-dni`)
  - `published_verified`: 1
  - `demo_verified`: 0

## 4. Roles de Administrador

- El sistema usa `public.user_roles` con rol `admin`. La función `public.is_admin()` comprueba existencia real en BD.
- **Estado actual:** `VERIFIED`. Administrador real configurado en base de datos:
  - `email`: `migueljosa7@gmail.com`
  - `user_id`: `f327b75a-b43a-4be1-a636-68f7c102f682`
  - `role`: `admin`

---

## 5. Edge Functions

### assistant

Estado: **ACTIVE** (`verify_jwt: false` en runtime confirmado con petición real anónima: la función responde sin sesión).

Secretos verificados en backend (listado de secretos del proyecto vía Supabase CLI, 2026-08-19):
- `LLM_API_KEY` — Configurado
- `LLM_PROVIDER` — Configurado

### Comportamiento verificado

La Edge Function filtra por `is_published=true AND verification_status='verified'`.
Devuelve únicamente contenido verificado oficial. No convierte DEMO a verified. No expone secretos ni datos sensibles en respuestas ni errores.

Validación de entrada verificada contra la función desplegada (2026-08-19):
- consulta vacía → `400 {"error":"La consulta no puede estar vacía."}`
- consulta >500 caracteres → `400 {"error":"La consulta es demasiado larga (máximo 500 caracteres)."}`

### CORS (fix aplicado y desplegado en FASE 11)

- **Problema detectado:** la respuesta `OPTIONS` (preflight) no incluía `Access-Control-Allow-Methods`.
  Sin esa cabecera los navegadores bloquean las peticiones POST reales con `Content-Type: application/json`.
- **Fix:** se añadió `Access-Control-Allow-Methods: POST, OPTIONS` a `corsHeaders` en
  `supabase/functions/assistant/index.ts` y se redesplegó la función.
- **Verificación real tras el deploy:** preflight `OPTIONS` responde `200` con
  `Access-Control-Allow-Methods: POST, OPTIONS` y las validaciones de la función siguen respondiendo igual.
- ⚠️ El CORS está **endurecido (FASE 11)**: sin `*` ni `null`. La Edge Function solo emite
  `Access-Control-Allow-Origin` para orígenes de la allowlist (secret `CORS_ALLOWED_ORIGINS`
  en producción; default dev `http://localhost:5173`). El secret del dominio definitivo es un
  dato externo (`CORS_ALLOWED_ORIGINS` pendiente de valor real del titular).

---

## 6. RLS y Seguridad

### Lectura pública procedures
Solo se muestran trámites con:
- `is_published = true`
- `verification_status = 'verified'`

### Escritura admin-only
INSERT/UPDATE/DELETE en tablas de contenido (`procedures`, `procedure_categories`, `procedure_requirements`, `procedure_documents`, `procedure_steps`, `procedure_links`) restringido a `is_admin()`.

### Datos de usuario
- `profiles`, `favorites`, `reminders` — acceso por `auth.uid() = user_id`.
- Supresión de cuenta: función `public.delete_my_account()` `SECURITY DEFINER` que elimina `auth.users` del propio usuario autenticado (`auth.uid()`).

### Asistente anónimo
- `assistant_conversations.user_id` nullable.
- Políticas RLS permiten `auth.uid() IS NULL` para invitados (solo filas `user_id IS NULL`) y
  restringen a los autenticados a sus propias conversaciones.
- **Nota REAL (2026-08-19):** `anon` NO tiene GRANT de tabla sobre `assistant_conversations`/
  `assistant_messages` (solo `authenticated` los tiene). Las políticas RLS anónimas existen pero no son
  alcanzables vía REST. Por decisión de producto (FASE 10), el cliente **no persiste** conversaciones
  anónimas: usa una conversación local en memoria y solo escribe en BD con sesión iniciada. Se ha
  mantenido así deliberadamente: habilitar GRANT a `anon` permitiría a cualquier visitante leer las
  conversaciones anónimas compartidas (`user_id IS NULL`). Si en el futuro se quiere historial anónimo
  en servidor, debe resolverse antes el aislamiento entre anónimos.
- Verificación funcional real (REST con anon key): INSERT anónimo en `favorites`,
  `assistant_messages` y RPC `delete_my_account` → `401` (denegado). SELECT anónimo de
  `procedures` devuelve solo contenido `verified`.

---

## 7. Auth

### Configuración remota
- **Email confirmations:** `BLOCKED_EXTERNAL` (Requiere activación en Supabase Dashboard → Auth → Email)
- **SMTP Provider:** `BLOCKED_EXTERNAL` (Requiere configuración de SMTP personalizado en Supabase Dashboard)
- **Redirect URLs:** `BLOCKED_EXTERNAL` (Requiere configuración del dominio definitivo en Supabase Dashboard)
- **Site URL:** `BLOCKED_EXTERNAL` (Requiere dominio definitivo)
- **Signup:** Habilitado y funcionando.

---

## 8. Checklist de Preproducción

- [x] Migraciones aplicadas en Supabase remoto (0000 - 0010) `VERIFIED`
- [x] RLS verificada en Supabase remoto para todas las tablas `VERIFIED`
- [x] Secrets de LLM configurados en Edge Functions (`LLM_API_KEY`, `LLM_PROVIDER`) `VERIFIED`
- [x] Administrador real registrado en `public.user_roles` `VERIFIED`
- [x] Contenido verificado cargado (`published_verified = 1`, `demo_verified = 0`) `VERIFIED`
- [x] Supresión de cuenta (`delete_my_account`) implementada y asegurada (guard `auth.uid()` probado) `VERIFIED`
- [x] Tests unitarios y de integración verdes (70/70) `VERIFIED`
- [x] Typecheck y Linting 100% limpios (0 errores) `VERIFIED`
- [x] Build de producción web exitoso `VERIFIED`
- [x] Configuración Expo y EAS bundle `es.tramiespana.app` v1.0.0 `VERIFIED`
- [x] **Android API 36** (targetSdk/compileSdk 36, minSdk 23) configurado y verificado en el AAB
      release (`bundletool dump manifest`); `android.suppressUnsupportedCompileSdk=36` documentado en
      `gradle.properties` (AGP 8.1.1 fijado por expo-modules-core) `FIXED & VERIFIED`
- [x] Core library desugaring habilitado (`desugar_jdk_libs` 2.1.2): **necesario pero NO suficiente**.
      El D8 incluido en AGP 8.1.1 NO reescribe `java.util.List.removeLast()` (método default de
      Java 21, runtime solo desde API 35). El crash se REPRODUJO de verdad en E2E el 2026-08-23
      (`NoSuchMethodError` en `com.swmansion.rnscreens.ScreenStack.obtainDrawingOp`) y quedó
      resuelto por el parche fuente del punto siguiente `FIXED & VERIFIED (2026-08-23, tarde)`
- [x] Parche Kotlin de expo-modules-core (`PermissionsService.kt` safe-call) persistido en
      `scripts/postinstall-expo-cli-win-fix.js` (idempotente) para build con API 36 `FIXED & VERIFIED`
- [x] **Parche Kotlin de react-native-screens** (`ScreenStack.kt`: `drawingOpPool.removeLast()` →
      `drawingOpPool.removeAt(drawingOpPool.size - 1)`, equivalente exacto disponible desde API 1)
      añadido a `scripts/postinstall-expo-cli-win-fix.js` (idempotente). Única ocurrencia de APIs
      SequencedCollection en todo el árbol nativo (scan completo de node_modules) — elimina el crash
      en Android < API 35 `FIXED & VERIFIED (2026-08-23, tarde)`
- [x] **E2E release REAL en emulador API 34 / Android 14 (2026-08-23, tarde)**: instalación limpia
      (`uninstall` + `install` del APK firmado por gradle), arranque sin ningún entry en
      `logcat AndroidRuntime:E`, proceso vivo tras 22 s + back + relaunch desde launcher,
      `mCurrentFocus = es.tramiespana.app/.MainActivity`, deep link `tramiespana://` enrutado a la
      instancia en ejecución, sin errores `ReactNativeJS:E`, sin ANR/FATAL, screenshot real
      1080×2340 capturado (`docs/play-assets/evidence/e2e-api34-home.png`) `VERIFIED`
- [x] Edge Function `assistant` desplegada con CORS allowlist estricto: origen permitido → echo del Origin; origen desconocido → sin cabecera ACAO (bloqueo navegador); sin `*` ni `null`. Matriz HTTP real verificada en vivo (OPTIONS/POST permitidos, desconocidos y sin Origin) `FIXED & VERIFIED`
- [ ] Secret `CORS_ALLOWED_ORIGINS` con el dominio definitivo `BLOCKED_EXTERNAL` (mecanismo ya implementado, desplegado y probado)
- [x] Búsqueda del asistente tolerante a signos de puntuación española (`¿ ? ¡`) corregida y desplegada (regresión test) `FIXED & VERIFIED`
- [x] Versiones coherentes: `package.json` (root/web/mobile/shared), `app.json`, `VITE_APP_VERSION` = `1.0.0`; `package-lock.json` reconciliado `FIXED`
- [ ] SMTP personalizado configurado en Supabase `BLOCKED_EXTERNAL`
- [ ] Dominio definitivo y redirect URLs en Supabase `BLOCKED_EXTERNAL`
- [ ] Rate limit de la Edge Function `assistant` por función `BLOCKED_EXTERNAL` (Dashboard → Edge Functions → assistant)
- [ ] Datos legales del titular / NIF / Razón social `USER_ACTION_REQUIRED`
- [ ] Diseño final de assets gráficos / screenshots `USER_ACTION_REQUIRED`
- [ ] Publicación en Google Play Console `USER_ACTION_REQUIRED`
