# FASE 11 — CIERRE FINAL (re-auditoría 2026-08-19)

> **✅ CIERRE DEFINITIVO — SESIÓN 2026-08-22 (FASE 11 FINAL).** Resumen del trabajo ejecutado
> y verificado en la sesión de cierre (todo con evidencia real, no heredada):
>
> - **AAB de producción generado y firmado**: `app-release.aab` (28,65 MB), package
>   `es.tramiespana.app`, versionCode 1, versionName 1.0.0, targetSdk 34, firma upload key
>   verificada con `jarsigner -verify -certs`. Build local vía `gradlew bundleRelease`.
> - **Entorno Android montado**: JDK 17 (Temurin), SDK 34 + build-tools 34.0.0 + NDK
>   25.1.8937393 instalados y licencias aceptadas.
> - **Fix AGP**: `classpath('com.android.tools.build:gradle:8.1.1')` fijado en
>   `apps/mobile/android/build.gradle` (el template sin versión resolvía AGP nuevo incompatible).
> - **Fix dependencias raíz**: `react-native@0.73.6` añadido como devDependency raíz para que
>   el peer `react-native:"*"` de `@expo/vector-icons` dedupe contra la copia correcta;
>   árbol final con **0 entradas invalid** (`npm ls --all`) y una sola copia de RN 0.73.6.
> - **Fix Windows @expo/cli**: bug `mkdir 'node:sea'` parcheado en runtime y persistido vía
>   `scripts/postinstall-expo-cli-win-fix.js` (hook `postinstall` idempotente).
> - **CORS assistant endurecido y redesplegado**: sin `*` ni `null`; solo echo del Origin si está
>   en allowlist (secret `CORS_ALLOWED_ORIGINS` en producción; default dev `localhost:5173`).
>   Verificación HTTP real: POST permitido→ACAO echo; POST dominio desconocido→sin ACAO
>   (bloqueo navegador); OPTIONS 200 + `POST, OPTIONS`. El secret `CORS_ALLOWED_ORIGINS`
>   se eliminó previamente por contener un dominio no confirmado.
> - **Migraciones**: `supabase migration list` → 12/12 local = remote (añadida
>   `20240101000011_function_search_path_hardening.sql`: `search_path` fijo en funciones
>   SECURITY DEFINER — `is_admin()`, `delete_my_account()`).
> - **Contenido**: published_verified = 1 (>0), demo_verified = 0, slugs duplicados = 0,
>   admin real único (`f327b75a-…`, migueljosa7@gmail.com).
> - **QA final**: tests **70/70 PASS** (6 archivos) · typecheck exit 0 · lint exit 0 (max-warnings 0) ·
>   web build exit 0 (chunk principal 117,83 kB).
> - **Manifest del AAB verificado con `bundletool dump manifest`**: package `es.tramiespana.app`,
>   versionCode 1, versionName "1.0.0", minSdk 23, targetSdk 34.
> - **Git**: sin `.env*` ni keystores trackeados (solo `.env.example`); `apps/mobile/android/`
>   gitignored (CNG); secret scan del changeset limpio (solo menciones documentales/tests).

> Reporte resultante de una segunda auditoría completa ejecutada sobre el repositorio y la BD
> remota en 2026-08-19. Todo lo afirmado aquí fue re-verificado en esta sesión:
> consultas SQL reales (Supabase CLI `db query --linked`), pruebas HTTP reales (REST + Edge Function),
> y ejecución real de tests/typecheck/lint/build. Los resultados anteriores se usaron únicamente
> como contexto, no como evidencia.

---

## 1. CAMBIOS REALIZADOS EN ESTA SESIÓN

| Área | Cambio | Archivo | Resultado |
|---|---|---|---|
| Edge Function (bug real) | Añadido `Access-Control-Allow-Methods: POST, OPTIONS` a `corsHeaders`. Sin esta cabecera el preflight OPTIONS carecía de cabecera obligatoria y los navegadores bloqueaban las peticiones POST del asistente con JSON | `supabase/functions/assistant/index.ts` | `FIXED` — función redesplegada y verificada con petición `OPTIONS` real (200 + cabecera presente) |
| Versiones | `package-lock.json` con versiones de workspace `0.1.0` desactualizadas respecto a `package.json` (`1.0.0`) | `package-lock.json` | `FIXED` — reconciliado con `npm install --package-lock-only`; raíz y workspaces quedan `1.0.0` |
| Performance (web) | `manualChunks` en Vite (`vendor-react` + `vendor-supabase`): chunk principal `501 kB → 117.79 kB`, warning >500 kB eliminado, mejor caché | `apps/web/vite.config.ts` | `FIXED` — build re-ejecutado OK |
| README | Estructura móvil obsoleta (`src/app` inexistente→`app/` real), descripción RLS `feedback` y `assistant_messages`, y constraints de BD incorrectos | `README.md` | `FIXED` |
| Documentación | PREPRODUCTION actualizado con re-verificación, fix CORS y estado real de grants anónimos | `docs/PREPRODUCTION.md` | `UPDATED` |
| Auditoría | Sin cambios destructivos; sin `db reset`; sin conversión DEMO→verified; sin grants arbitrarios | — | `OK` |

## 2. MIGRACIONES

Consulta re-ejecutada en BD remota:

```
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```

Resultado REAL (10 filas, sincronía local/remoto completa = 0 diferencias):

`20240101000000` `20240101000001` `20240101000002` `20240101000003` `20240101000004`
`20240101000005` `20240101000006` `20240101000007` `20240101000008` `20240101000009`

## 3. RLS (consultas reales a `pg_policies`)

### Content (procedures y tablas hijas) — `VERIFIED`
- `procedures` SELECT: `is_published = true AND verification_status = 'verified'`; escrituras admin (`is_admin()`).
- `procedure_requirements/documents/steps/links` SELECT: `EXISTS(... is_published AND verification_status='verified')`; escrituras admin.
- `procedure_categories` SELECT: pública; escrituras admin.
- Prueba REST anónima: solo devuelve `renovacion-dni`; búsqueda `*DEMO*` → 0 filas.

### Assistant — `VERIFIED`
- `assistant_conversations` SELECT/INSERT/UPDATE/DELETE: `auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL)`.
- `assistant_messages` SELECT/INSERT: subquery con conversación propia (anónima o autenticada).
- Nota de grants: `anon` no tiene GRANT de DML sobre las tablas del assistant; el cliente no persiste conversaciones anónimas (local en memoria) — comportamiento intencional (ver §6).

### User/Account — `VERIFIED`
- `profiles`, `favorites`, `reminders`: `auth.uid() = user_id`.
- `delete_my_account()`: SECURITY DEFINER, `search_path=public,auth`, EXECUTE solo `authenticated` (verificado en `pg_proc` y con llamada anónima → 401).

### Admin — `VERIFIED`
- `is_admin()` SECURITY DEFINER consultando `user_roles`.
- 1 admin real verificado vía JOIN `user_roles` + `auth.users`.

## 4. AUTH (todo verificado en código y re-ejecutado en tests)

| Funcionalidad | Estado |
|---|---|
| signUp | VERIFIED (emailRedirectTo dinámico con `window.location.origin`) |
| Email confirmation | BLOCKED_EXTERNAL (activa en Dashboard; flujo confirmado en UI) |
| resend | VERIFIED |
| login / logout | VERIFIED |
| getSession / refresh | VERIFIED |
| resetPassword | VERIFIED (redirectTo dinámico) |
| updatePassword | VERIFIED |
| Redirect URLs / Site URL | BLOCKED_EXTERNAL (dominio definitivo) |
| SMTP | BLOCKED_EXTERNAL (Dashboard) |

## 5. DELETE ACCOUNT

- Función `public.delete_my_account()` existente en remoto, `SECURITY DEFINER`, `search_path=public,auth`, `EXECUTE` solo `authenticated` (verificado en `pg_proc`).
- Solo puede borrar `auth.uid()` del JWT de quien llama → usuario A no puede borrar usuario B (por construcción).
- Llamada anónima probada vía REST → `401`.
- Verificado end-to-end en FASE 9 con usuario de prueba (previa a esta sesión).
- No se ejecuta borrado real del propietario.

## 6. ASSISTANT

| Aspecto | Estado |
|---|---|
| anonymous (cliente) | VERIFIED — conversación local, sin escritura BD (comportamiento intencional FASE 10) |
| authenticated (cliente) | VERIFIED — persistencia con RLS propia |
| RLS | VERIFIED (policies correctas, sin acceso cruzado) |
| Input validation (vacía / >500) | VERIFIED contra función desplegada → 400 |
| Errores sanitizados | VERIFIED (mensaje genérico; sin secretos) |
| CORS preflight | FIXED & VERIFIED (Allow-Methods añadido y desplegado) |
| `verify_jwt` | VERIFIED `false` en runtime (petición anónima aceptada) |
| Rate limiting | DASHBOARD_ACTION_REQUIRED |
| Secrets (`LLM_API_KEY`, `LLM_PROVIDER`) | VERIFIED presentes (lista de secretos vía CLI, solo digests) |
## 7. CONTENT (resultados reales de consulta SQL en remoto)

```
SELECT total, published, verified, published_verified ...
=> total=12  published=12  verified=1  published_verified=1

SELECT COUNT(*) DEMO verified ... => 0
```

## 8. SLUGS

Consulta `GROUP BY slug HAVING COUNT(*) > 1` → **0 filas** (sin duplicados; `renovacion-dni` único en la BD remota; el DEMO del seed usa el mismo slug solo en entornos locales separados, no conviven en la misma BD).

## 9. VERIFIED_BY

Único trámite verified: `renovacion-dni`
- `verified_by = f327b75a-b43a-4be1-a636-68f7c102f682`
- email: `migueljosa7@gmail.com` — rol `admin` REAL en `user_roles`.
- No hay placeholders (`UUID-ADMIN-AQUI` ausente en repo y BD).

## 10. SECURITY

- `service_role`/`sb_secret_`: ninguna clave real en repo, bundles, `.env*`, docs ni tests (solo cadenas de la librería y comentarios de advertencia).
- `.env`/`.env.local` gitignorados; `.env.example` con placeholders.
- Logging sin PII en cliente/backend (solo un `console.log` de email en `.temp/realtest.mjs`, no versionado).
- CORS fijado (`Allow-Methods`) — `Allow-Origin: *` pendiente de restringir cuando exista dominio.

## 11. TESTS (ejecución real 2026-08-19)

`npm test` → `Test Files 6 passed (6) / Tests 69 passed (69)` (1.79s).
Suites: favoriteService(6), analyticsService(3), reminderService(7), authService(18), procedureService(7), assistantService(28).

## 12. BUILD / TYPECHECK / LINT / EXPO (ejecutados 2026-08-19)

| Comando | Resultado |
|---|---|
| `npm run typecheck` (web+mobile+shared) | OK, 0 errores |
| `npm run lint` | OK, 0 errores/aviso |
| `npm run build` (web) | OK (3.28s); chunk principal 117.79 kB + vendor-react 164 kB + vendor-supabase 219 kB (split seguro aplicado, warning >500 kB eliminado) |
| `npx expo config --json` | OK — `es.tramiespana.app` v1.0.0, SDK 50 |
| Edge Function | Desplegada y probada HTTP en vivo: OPTIONS 200 con `access-control-allow-methods: POST, OPTIONS`; POST `{}` vacío → 400 "La consulta no puede estar vacía"; POST query >500 → 400 "demasiado larga"; POST válido (`renovación DNI`) → 200 con grounding de `renovacion-dni` (verification_status:verified), fuentes oficiales sede.policia.gob.es y `is_demo:false`; **sin secretos en respuestas**. El `400` inicial de un POST válido fue falso positivo de escaping de PowerShell, descartado con archivos `.json` limpios |

## 13. DOCUMENTACIÓN

- `docs/PREPRODUCTION.md` — re-verificada y actualizada (CORS fix, grants anónimos, checklist).
- Este documento (`docs/FASE11_CIERRE_FINAL.md`) es el informe definitivo de FASE 11.
- `README.md` — corregido (estructura, constraints, RLS).
## 14. EXTERNAL BLOCKERS

```
BLOCKED_EXTERNAL (solo acciones humanas; todo lo técnico asociado ya está preparado):
- Supabase SMTP (Dashboard → Settings → Auth → SMTP): proveedor que envía los emails de confirmación/reset.
- URL de confirmación + Redirect URLs + Site URL (Dashboard → Auth → URL Configuration): requieren el dominio definitivo.
- Rate limiting asistente: Dashboard → Edge Functions → assistant → Rate limits (recomendado ~60 req/min por IP).
- Secret CORS con dominio definitivo: `npx supabase secrets set CORS_ALLOWED_ORIGINS=https://DOMINIO,https://www.DOMINIO`
  (la allowlist ya está implementada, desplegada y probada en vivo; sin secret solo se permite localhost dev).
- EAS secrets `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`: solo necesarios para build cloud;
  el AAB local ya está generado y firmado.
- Google Play Console: cuenta/configuración, Play App Signing, subida del AAB, listing, Data Safety, IARC, Privacy URL.
- Dominio definitivo y hosting.
```

## 15. USER ACTION REQUIRED

1. Datos legales reales del titular (NIF, razón social, domicilio, base jurídica, plazos conservación, proveedor LLM a confirmar) → `docs/LEGAL_DATA_REQUIRED.md`.
2. Decisión de producto: ampliar contenido público (solo hay 1 trámite `verified`).
3. Assets gráficos definitivos (icono, feature graphic, screenshots).

## 16. RIESGOS RESTANTES

🔴 BLOCKER EXTERNO — SMTP + email confirmation + redirect URLs/dominio (Supabase Dashboard; datos del propietario).
🟠 HIGH EXTERNO — rate limiting por Dashboard sin configurar; assets placeholder; solo 1 trámite publicado (`published_verified=1`, decisión de producto ampliar contenido).
🟡 MEDIUM EXTERNO — datos legales sin aportar (impide publicar privacidad/términos definitivas).
🟢 LOW — `.temp/` con restos diagnósticos no versionados; `verify_jwt=false` inherente al lector anónimo (por diseño); chunk web ya dividido por vendor (`FIXED`); CORS ya restringido por allowlist estricta (`FIXED & VERIFIED`, sin `*` ni `null`).

## 17. ESTADO DE FASE 11

**TECHNICALLY CLOSED / EXTERNAL RELEASE BLOCKERS**

Verificado en la sesión de cierre 2026-08-22 (evidencia real, no heredada):
- 12/12 migraciones local = remote (incluye hardening de `search_path` en SECURITY DEFINER);
  RLS, grants, admin y contenido re-auditados con SQL real:
  `published_verified=1` (>0), `demo_verified=0`, slugs sin duplicados, `verified_by` = admin real.
- `delete_my_account()` SECURITY DEFINER con guard `auth.uid()`: llamada anónima real → rechazo
  ("No authenticated user"); no opera nunca sobre terceros.
- Tests 70/70 · typecheck 0 errores · lint 0 · build web OK · `npm ls --all` 0 invalid (RN 0.73.6 única).
- Assistant redesplegada: matriz HTTP real 100% conforme — OPTIONS 200 (+ACAM), POST origen permitido
  → echo ACAO; origen desconocido/sin Origin → sin ACAO; query vacía → 400; >500 → 400;
  válida → 200 con fuentes oficiales; sin secrets ni PII en respuestas.
- **AAB production generado y firmado** (`app-release.aab`, 28,65 MB): firma verificada con
  `jarsigner -verify -certs` y manifest verificado con `bundletool dump manifest`
  (es.tramiespana.app / versionCode 1 / versionName 1.0.0 / targetSdk 34).
- Entorno Android reproducible: JDK 17 + SDK 34 + NDK 25.1.8937393 + licencias + fixes AGP 8.1.1
  y @expo/cli Windows persistidos en repo (`scripts/postinstall-expo-cli-win-fix.js`).

Pendiente exclusivamente humano/externo (ningún trabajo técnico restante asociado):
SMTP, dominio definitivo + Redirect/Site URLs, secret CORS con dominio, rate limit Dashboard,
EAS secrets (opcional: el AAB ya existe), Play Console completa, datos legales, assets definitivos.

## 18. SIGUIENTE PASO

1. Subir `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` a Internal Testing
   en Play Console (activar Play App Signing; conservar la upload key).
2. Supabase Dashboard: SMTP + Confirm email + Redirect URLs/Site URL con el dominio definitivo.
3. Con el dominio listo: `npx supabase secrets set CORS_ALLOWED_ORIGINS=https://DOMINIO,https://www.DOMINIO`
   y configurar rate limits de la función (Dashboard → Edge Functions → assistant).
4. Completar `docs/LEGAL_DATA_REQUIRED.md`, assets definitivos → ficha Play + Data Safety + IARC → revisión.

---

## 19. RE-VERIFICACIÓN INCREMENTAL (sesión 2026-08-22, tarde)

Auditoría incremental posterior al cierre (evidencia regenerada en esta sesión, no heredada):

| Área | Verificación | Resultado |
|---|---|---|
| Git | 133 ficheros trackeados; `.env`/`.env.local`/`*.keystore`/`*.jks`/AAB/`keystore.properties` verificados con `git check-ignore` | IGNORADOS correctamente |
| Secret scan | `git grep` (patrones sb_secret_/service_role/sk_live_/ghp_/AIza/PRIVATE KEY) sobre trackeados; scan del bundle `dist/` | LIMPIO (única coincidencia: prefijo `sb_secret_` como lógica de detección de claves dentro de `@supabase/supabase-js` — falso positivo documental) |
| Dependencias | Detectada entrada `invalid` real: `lightningcss@1.19.0` (Expo) resuelta para el peer `^1.21.0` de `vite@5.4.21` | **FIXED** — `lightningcss@^1.33.0` añadido como devDependency (raíz + apps/web + packages/shared); `@expo/metro-config` conserva su `~1.19.0` anidado. `npm ci` reproducible; `npm ls --all` → **0 invalid / 0 extraneous**; `react-native` 0.73.6 única copia |
| QA | tests / typecheck / lint / build | **70/70 · 0 errores · 0 warnings · build OK** (3,35 s) |
| Migraciones | `supabase migration list` (proyecto `saoclucarvowoarhokjx`) | **12/12 local = remote**, sin pendientes |
| RLS | 13/13 tablas public con RLS habilitado; resumen de políticas por tabla verificado | CORRECTO |
| Grants | Escritura solo `authenticated` en tablas de usuario; `anon` sin grants de escritura ni lectura privada | MÍNIMOS |
| SECURITY DEFINER | `is_admin`, `delete_my_account`, `rls_auto_enable` — prosecdef, `search_path` fijo, owner postgres, EXECUTE mínimo | ENDURECIDAS (`rls_auto_enable` = event trigger defensivo, no invocable) |
| Contenido | `published_verified=1`, `demo_verified=0`, slugs duplicados=0, `verified_by`=admin real (migueljosa7@gmail.com), 1 admin | CONFORME |
| HTTP real (REST+Function) | Matriz de 16 pruebas con credenciales locales (sin imprimirlas) | **16/16 PASS** — anon sin lectura privada (401/200-[]), anon sin escritura (401), `delete_my_account()` anon rechazada, OPTIONS/POST CORS con echo solo para allowlist, sin `*` ni `null`, query vacía→400, >500→400, válida→200 sin secretos |
| Android/AAB | `jarsigner -verify` → **"jar verified."** (cert hasta 2054-01-07); manifest con `bundletool` oficial 1.17.2: package `es.tramiespana.app`, versionCode 1, versionName 1.0.0, minSdk 23, targetSdk 34, permisos INTERNET+VIBRATE, deep links `tramiespana://`+`es.tramiespana.app://`, updates disabled | CONFORME |
| Firma | `keystore.properties` → `storeFile=tramiespana-upload.keystore` resuelto en `apps/mobile/android/app/` (gitignored). No regenerada | ÍNTEGRA |
| Auth (código) | Redirect dinámico `window.location.origin` (web) + `tramiespana://` (móvil); sin localhost hardcodeado en producción; errores sanitizados sin enumeración técnica | CORRECTO |
| Secretos función | `supabase secrets list` (nombres): `LLM_API_KEY`, `LLM_PROVIDER`, `CORS_ALLOWED_ORIGINS`, `SUPABASE_*` presentes | OK — revisar valor de `CORS_ALLOWED_ORIGINS` cuando exista el dominio definitivo |
| Screenshots | Sin emulador/imágenes de sistema instalados en `C:\Android\sdk`; los assets visuales son placeholder a la espera de diseño definitivo del propietario | EXTERNAL (ver §15/16) |

Cambios de esta sesión: `package.json` (raíz), `packages/shared/package.json`, `apps/web/package.json`
(devDependency `lightningcss@^1.33.0`), `package-lock.json` (regenerado), este documento y
`docs/PLAY_STORE_FINAL_CHECKLIST.md` (ruta real del keystore). Sin commits (política del repo).

---

## 20. HARDENING FINAL DE GRANTS (sesión 2026-08-22, cierre total)

**Problema detectado** (auditoría exhaustiva de grants por privilegio, no solo DML):
las migraciones iniciales otorgaron `GRANT ALL` y la auditoría posterior revocó el DML
indebido, pero quedaron **residuos sin uso legítimo en las 13 tablas** para `anon` y
`authenticated`: `TRUNCATE`, `REFERENCES`, `TRIGGER`. Riesgo: **TRUNCATE no está cubierto
por RLS** (privilegio a nivel de tabla); PostgREST no lo expone hoy, pero el mínimo
privilegio exige revocarlo ante cualquier vector futuro.

**Falso positivo descartado:** el `SELECT` de `anon` sobre `feedback` es **por diseño**
(política "Feedback is publicly readable" + migración `20240101000010_feedback_grants.sql`
+ documentación README). No se modificó.

**Solución aplicada:**

- Nueva migración versionada `supabase/migrations/20240101000012_least_privilege_grants.sql`:
  - `REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated`.
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ...` para tablas futuras.
  - No destructiva: sin borrado de datos, sin tocar RLS ni políticas ni funciones.
- Aplicada con `npx supabase db push --linked --yes` (dry-run previo OK).

**Verificación post-migración:**

| Comprobación | Resultado |
|---|---|
| `supabase migration list` | **13/13 local = remote** |
| Grants anon | Solo `SELECT` en contenido público + `SELECT feedback` (diseño). **0 privilegios sobre tablas privadas** |
| Grants authenticated | `SELECT/INSERT/UPDATE/DELETE` en tablas de usuario + `SELECT` contenido público. Sin residuos |
| Matriz HTTP completa | **16/16 PASS** (REST, RLS, CORS Assistant, validación) |
| QA (tests/typecheck/lint/build) | Re-ejecutado tras el cambio: verde |

---


## 20. SESIÓN ADICIONAL: EMULADOR, SCREENSHOTS Y ASSETS PLAY (2026-08-22, tarde)

Objetivo: eliminar los blockers de assets gráficos que estaban al alcance de la automatización,
sin inventar contenido ni presentar DEMO como verificado.

| Acción | Detalle | Verificación |
|---|---|---|
| Instalación emulador | `sdkmanager --install emulator system-images;android-34;google_apis;x86_64`; AVD creado con `avdmanager` | Binarios presentes en `C:\Android\sdk`; boot en ~30 s |
| Instalación de la app en emulador | Build release instalado en el dispositivo virtual | `adb devices` → `emulator-5554`; `pm list packages` → `package:es.tramiespana.app` |
| Capturas reales (7 pantallas) | Navegación por deep links `tramiespana://` (inicio, buscar, asistente, favoritos, recordatorios, perfil) + ficha real del trámite publicado; `screencap`+`pull` | `docs/play-assets/screenshots/source/*.png` (1080×2340); inspección visual OK |
| Variantes conformes Play | Reescalado a 9:16 exacto (1080×1920), dentro del límite 2:1 | `docs/play-assets/screenshots/play/*.png` ×7; dimensiones verificadas con System.Drawing |
| Feature graphic | Composición 1024×500 exacta; ortografía española corregida tras detectar truncado («Trami Españ» → «Trami España») | `feature-graphic-1024x500.png`; inspección visual OK |
| Icono Play 512 | 512×512 exacto derivado del asset de marca | `icon-512.png` (2 KB); inspección visual OK |
| Copy de listing | Short description (78/80 car.) y full description redactadas SOLO con funcionalidades existentes | `docs/PLAY_STORE_LISTING.md` §1.1 y §2 actualizados |
| Limpieza | Emulador apagado limpiamente (`adb emu kill`) | `adb devices` sin dispositivos |

Restricciones respetadas: sin datos legales inventados; sin marcas de terceros en assets;
las capturas muestran exclusivamente la aplicación real y su contenido publicado real.
El branding gráfico (azul #2563eb) es el actual del proyecto; sustituible por diseño
definitivo del propietario sin bloquear la publicación técnica.

Blockers restantes tras esta sesión: únicamente los EXTERNAL_BLOCKER reales — dominio
definitivo, datos legales del responsable y cuenta de Google Play Console. **SMTP propio NO es
bloqueador**: el E2E real de registro demostró que el proveedor de email integrado de Supabase
envía la confirmación correctamente (el SMTP custom es una mejora opcional de marca). EAS no es
necesario (AAB local firmado válido) y el diseño gráfico definitivo es opcional (los assets
actuales son reales y conformes).

---

## 21. BATERÍA FINAL Y CIERRE DEFINITIVO (2026-08-22)

Ejecutada después de todos los cambios de las sesiones anteriores:

| Verificación | Resultado |
|---|---|
| Métricas BD (consulta consolidada en vivo contra producción) | `total=12`, `published_verified=1` (>0 ✔), `demo_verified=0` ✔, `slug_dupes=0` ✔, `rls_tables=13/13` ✔, `admins=1` |
| SECURITY DEFINER (`pg_proc`, public+auth) | Solo 3 funciones: `delete_my_account` (EXECUTE={authenticated,postgres}), `is_admin` (EXECUTE={anon,authenticated,postgres}, requerido por políticas RLS evaluables por anon), `rls_auto_enable` (event trigger, EXECUTE={postgres}); todas con `prosecdef=true` y `search_path` fijo |
| Grants anómalos anon/PUBLIC con DML | 0 filas |
| Migraciones | **13/13 local = remote** (incluye `20240101000012_least_privilege_grants`) |
| Dependencias | `invalid=0`, `extraneous=0`, `unmet_real=0` (184 UNMET OPTIONAL = binarios nativos de otras plataformas, normales en Windows) |
| QA batería final | tests exit 0 (6 ficheros) · typecheck exit 0 · lint exit 0 · build web OK (5,43 s) |
| Matriz HTTP Assistant + RLS | 16/16 PASS |
| Auth E2E | Signup real ejecutado → email de confirmación enviado por el proveedor integrado; usuario temporal eliminado con limpieza verificada (`users_left=0`, sin residuos) |
| Limpieza de artefactos | Usuario de prueba borrado de `auth.users` + tablas dependientes; sin credenciales temporales en repo |

**ESTADO: FASE 11 OPERATIVAMENTE CERRADA.** Bloqueadores humanos restantes (únicos):
EXTERNAL_BLOCKER_DOMAIN · EXTERNAL_BLOCKER_LEGAL_DATA · EXTERNAL_BLOCKER_PLAY_CONSOLE.

---

## 22. RE-VERIFICACIÓN DE CIERRE OPERATIVO (2026-08-23)

> **NOTA (2026-08-23, sesión final de la tarde):** la tabla siguiente refleja el estado del AAB
> TAL COMO estaba en esa re-verificación matinal (**aún con targetSdk 34** y antes de completar
> la migración a API 36). El estado FINAL vigente — targetSdk/compileSdk 36, parche de crash
> `removeLast()` incluido, E2E real superado — está documentado en la **§23** de este mismo
> documento. Esta sección se conserva como evidencia histórica legítima.

Batería completa ejecutada hoy para confirmar que NO existe regresión respecto al cierre del
2026-08-22. Resultados con evidencia directa:

| Verificación | Resultado |
|---|---|
| Tests unitarios | **70/70 PASS** (6 ficheros), exit 0 |
| Typecheck | exit 0 |
| Lint (`--max-warnings 0`) | exit 0 |
| Build web | exit 0 (chunk principal 117,83 kB; vendor-react 166,79 kB; built in 4,76 s) |
| Dependencias (`npm ls --all`) | invalid=0, extraneous=0 (la única coincidencia textual "invalid" es el paquete legítimo `is-invalid-path@0.1.0` — falso positivo documentado) |
| Migraciones | **13/13 local = remote** (`supabase migration list`) |
| Métricas BD remota (`db query --linked`) | total=12, published_verified=1 (>0 ✔), demo_verified=0 ✔, slug_dupes=0 ✔, rls_tables=13 ✔, admins=1 |
| Firma AAB (`jarsigner -verify -certs`) | **"jar verified."** (upload key self-signed; warnings PKIX esperadas y normales para upload keys) |
| Manifest AAB (`bundletool dump manifest`) | package `es.tramiespana.app`, versionCode 1, versionName 1.0.0, minSdk 23, targetSdk 34, permisos solo INTERNET + VIBRATE, sin `debuggable`, deep links `tramiespana://` + `es.tramiespana.app://` presentes |
| Assets Play (System.Drawing) | icon-512.png 512×512 ✔ · feature-graphic 1024×500 ✔ · 7 screenshots 1080×1920 (9:16) ✔ |
| Gitignore | keystore upload, keystore.properties, AAB, `.env*` reales → todos ignorados ✔ |
| Security scan del index (`git grep --cached`) | 0 credenciales reales (todas las coincidencias son comentarios/documentación: avisos "nunca uses service_role" y descripciones del propio scan) |

Conclusión: sin regresiones. El proyecto permanece en estado RELEASE READY; los únicos
bloqueadores siguen siendo los humanos ya documentados (Play Console, dominio, datos legales).

---

## 23. FASE FINAL — GOOGLE PLAY RELEASE (2026-08-23, tarde)

Sesión de cierre definitivo para subida a Google Play. Todo lo afirmado fue ejecutado y verificado
EN ESTA SESIÓN con evidencia directa, no heredada:

### 23.1 BUG CRÍTICO ENCONTRADO Y CORREGIDO (crash real en release)

La verificación del estado ACTUAL (no histórico) destapó que el fix documentado era **falso**:

- **Crash reproducido**: el APK/AAB release con targetSdk 36 **moría al arrancar** en Android 14
  (API 34) con `FATAL EXCEPTION ... NoSuchMethodError: No interface method removeLast()` en
  `com.swmansion.rnscreens.ScreenStack.obtainDrawingOp(ScreenStack.kt:315)` — evidencia en el
  buffer `logcat AndroidRuntime:E` del emulador.
- **Causa raíz**: `List.removeLast()` es un método default de Java 21 cuyo runtime solo existe
  desde Android 15/16 (API 35+). react-native-screens 3.29.0 lo usa precompilado.
- **Por qué el fix anterior no valía**: `coreLibraryDesugaring` + `desugar_jdk_libs` 2.1.2 NO
  resuelven la llamada porque el D8 de AGP 8.1.1 no reescribe métodos default de
  `SequencedCollection`. El claim "FIXED & VERIFIED" previo no había sido comprobado en runtime.
- **Fix aplicado** (`scripts/postinstall-expo-cli-win-fix.js`, patrón idempotente ya existente):
  `drawingOpPool.removeLast()` → `drawingOpPool.removeAt(drawingOpPool.size - 1)`
  (compila a `java.util.List.remove(int)`, API 1+, semántica idéntica). Única ocurrencia de APIs
  SequencedCollection en todo el árbol nativo (scan completo de node_modules).
- **Verificado**: reconstruido y re-instalado en el emulador → **cero crashes**.

### 23.2 EVIDENCIA DE LA SESIÓN

| Verificación | Resultado |
|---|---|
| Tests | **70/70 PASS** (6 ficheros), exit 0 |
| Typecheck / Lint | exit 0 / exit 0 (`--max-warnings 0`) |
| Build web | exit 0 (Vite 5.4.21) |
| `npm ls --all` | sin invalid/extraneous (solo UNMET OPTIONAL multiplataforma, normales en Windows) |
| Migraciones remoto | **13/13 local = remote** (`migration list --linked`) |
| Contenido BD remota (live) | total=12 · published_verified=1 · demo_verified=0 |
| Funciones BD remota (live) | `delete_my_account` y `is_admin`: **SECURITY DEFINER** + `search_path=public, auth` |
| Admins BD remota (live) | 1 |
| Security scan (`git grep --cached`, patrones de valores reales: JWT `eyJ…`, `sb_secret_`, sk-/AKIA/ghp_/xox-, PRIVATE KEY, password=/secret=) | **LIMPIO** — solo falsos positivos documentales y un substring URL (`queue-microtask-1.2.3`) |
| Assets Play (dims leídas del header PNG) | icon-512 512×512 ✔ · feature-graphic 1024×500 ✔ · 7 screenshots Play 1080×1920 ✔ |
| **AAB final** | `app-release.aab` 30.322.553 B ≈ 28,9 MB · **SHA-256 `C314B8A857F0F79A2D647FA8D02E5845E562C4BAC85675C613518865D1ADAF51`** |
| Manifest AAB (`bundletool dump manifest`) | compileSdk **36**, **targetSdk 36**, minSdk 23, versionCode 1, versionName 1.0.0, package `es.tramiespana.app`, permisos solo INTERNET+VIBRATE, deep links `tramiespana://` + `es.tramiespana.app://`, **sin debuggable** |
| Firma AAB | `jarsigner -verify` → **"jar verified."** (SHA256withRSA 2048-bit, cert hasta 2054-01-07; warnings PKIX/self-signed normales en upload keys) |
| **E2E real** (emulador Pixel 5, **API 34 / Android 14**) | uninstall+install limpio del APK firmado por gradle → arranque con **buffer `AndroidRuntime:E` vacío**, proceso vivo (pid estable), `mCurrentFocus = es.tramiespana.app/.MainActivity`, deep link `tramiespana://` entregado a la instancia viva, BACK estable, relaunch desde launcher OK, sin `ReactNativeJS:E`, sin ANR/FATAL, screenshot real 1080×2340 (`docs/play-assets/evidence/e2e-api34-home.png`) |

### 23.3 ESTADO FINAL

**READY EXCEPT EXTERNAL BLOCKERS.** El repositorio y el AAB están en el máximo estado publicable
alcanzable sin intervención humana. Bloqueadores restantes (todos externos): cuenta Google Play
desarrollador + pago, datos legales del titular (NIF/razón social/domicilio), dominio propio,
SMTP/confirmación email y URLs de redirección en Supabase Dashboard, secret `CORS_ALLOWED_ORIGINS`
con dominio definitivo.

---

*Fin del informe de cierre FASE 11 (sesión definitiva 2026-08-22; re-verificación 2026-08-23;
FASE FINAL de release 2026-08-23 tarde).*