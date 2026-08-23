# Trami España — Guía de Lanzamiento en Google Play (2026-08-23)

> Guía operativa paso a paso con los datos REALES de este proyecto. Complementa a
> `PLAY_STORE_LISTING.md` (textos) y `GOOGLE_PLAY_DATA_SAFETY.md` (formularios).
> Estado previo: **AAB firmado y verificado** (`targetSdk 36`, SHA-256
> `C314B8A857F0F79A2D647FA8D02E5845E562C4BAC85675C613518865D1ADAF51`), usuario revisor creado
> y probado vía API.

---

## 0. Datos maestros (copia/pega)

| Concepto | Valor |
|---|---|
| Package / Application ID | `es.tramiespana.app` |
| versionCode / versionName | `1` / `1.0.0` |
| Nombre de app | `Trami España` |
| Idioma por defecto | Español (es-ES) |
| Cuenta Play | Personal — nombre de desarrollador `Trami España` |
| Email soporte público | `tramiespana.app@gmail.com` |
| Supabase URL | `https://saoclucarvowoarhokjx.supabase.co` |
| Anon key (pública) | `sb_publishable_zkYdi9-hvghZwV4W2yqhQw_KXdcrWVC` |
| Región Supabase | AWS eu-west-2 (UE) |
| AAB | `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` |
| Usuario revisor | `reviewer@tramiespana.app` / `Password123!` (creado y verificado HTTP 200) |

---

## 1. Desplegar web + Política de Privacidad en Render

La política vive como fichero físico en `apps/web/public/politica-de-privacidad.html`
(Vite lo copia tal cual a `dist/`). El blueprint `render.yaml` del repo automatiza el resto.

### Opción A — Blueprint (recomendada)
1. Sube el repo a GitHub (rama principal). El repo debe incluir `render.yaml`.
2. En Render: **New + → Blueprint** → conecta el repo → *Apply*.
3. Render pedirá dos variables marcadas `sync:false`; rellénalas:
   - `VITE_SUPABASE_URL` = `https://saoclucarvowoarhokjx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_zkYdi9-hvghZwV4W2yqhQw_KXdcrWVC`
4. Espera el build (~3-5 min). Anota la URL final, p. ej.
   `https://tramiespana-web.onrender.com`.

### Opción B — Manual (sin blueprint)
1. **New → Static Site** → conecta el repo.
2. *Build Command:* `npm install && npm run build --workspace=apps/web`
   *Publish Directory:* `apps/web/dist`
3. *Environment:* añade las dos variables anteriores (+ `NODE_VERSION=20`).
4. Tras el primer deploy: **Settings → Rewrites**: añade
   `/*` → `/index.html` (tipo *Rewrite*) para el fallback SPA.
5. Anota la URL final.

### Verificación post-deploy (imprescindible)
Abre en navegador incógnito y comprueba **200 OK** en:
- `https://<tu-url>/` (landing)
- `https://<tu-url>/politica-de-privacidad.html` ← **esta es la Policy URL para Play**
- Un enlace interno del menú (comprueba que el rewrite SPA funciona)

> Si más adelante compras dominio propio, repite los pasos §2 con el nuevo dominio
> y actualiza la Policy URL en Play Console.

---

## 2. Configurar Supabase para producción

Con la URL de Render ya conocida (se llama `<URL_RENDER>` aquí):

### 2.1 Secret CORS de la Edge Function `assistant`
```bash
npx supabase secrets set CORS_ALLOWED_ORIGINS=<URL_RENDER>
```
(Ejecutar desde la raíz del repo; CLI ya autenticada y vinculada.)
Si añades dominio propio después: `CORS_ALLOWED_ORIGINS=<URL_RENDER>,https://www.tudominio.es`
Tras cambiar secrets NO hace falta redeploy de la función (la lee en caliente).

### 2.2 Auth → URL Configuration (Dashboard)
- **Site URL:** `<URL_RENDER>`
- **Redirect URLs** (añadir ambas):
  - `https://tramiespana-web.onrender.com/**`
  - `tramiespana://**`

### 2.3 Auth → Emails
Ya tienes SMTP activo. Confirma que:
- *Confirm signup* activado (los usuarios nuevos confirman email antes de entrar).
- Plantillas usan `{{ .SiteURL }}` / `{{ .ConfirmationURL }}` (por defecto OK ahora
  que Site URL apunta a Render).

---

## 3. App Access (credenciales para el revisor)

Play Console → **Policy → App access** → *Add new credential*:

| Campo | Valor |
|---|---|
| ¿Todas las funciones están disponibles sin login? | **No** |
| Nº de credenciales | 1 |
| Usuario | `reviewer@tramiespana.app` |
| Contraseña | `Password123!` |
| ¿Requiere PIN/OTP/2FA? | No |
| Instrucciones para el revisor (EN, campo libre) | |

Texto sugerido para el campo *Instructions* (inglés, lo que acelera la revisión):

```
1. Open the app and tap "Iniciar sesión" (bottom tab "Perfil" → login screen).
2. Email: reviewer@tramiespana.app
3. Password: Password123!
4. Once logged in you can: search procedures ("Buscar"), open any procedure
   detail, use the AI assistant tab ("Asistente"), add favorites ("Favoritos")
   and create reminders ("Recordatorios").
5. Account deletion is available at Perfil → Ajustes → Eliminar cuenta.
   Please do NOT delete this account; use it read-only if possible.
No OTP, no 2FA, no special network required.
```

> Estado verificado hoy por API: login HTTP 200 + lectura de trámites 200 +
> RLS aislando favoritos (`[]`). Credenciales listas para producción.

---

## 4. Subir el AAB a Internal Testing

1. Play Console → **Create app**: nombre `Trami España`, idioma `Español (España)`,
   tipo `App`, gratis/pago `Free`, acepta declaraciones → *Create app*.
2. Menú lateral → **Testing → Internal testing**.
3. Si es la primera vez: crea un *Internal testing track* con una lista de emails
   de testers Gmail (los tuyos) — genera un enlace de opt-in.
4. **Upload**: arrastra
   `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
5. *Release name*: `1.0.0 (1)`. *Release notes* (ES):
   ```
   Primera versión de Trami España:
   buscador de trámites, fichas detalladas, asistente IA,
   favoritos y recordatorios.
   ```
6. **Save → Review release → Start rollout to Internal testing**.

> ⚠️ Regla de versionado: cada futura subida exige incrementar `versionCode`
> (`app.json` → `expo.android.versionCode`) ANTES de regenerar el AAB.
> Nunca reutilizar el 1 si esta build llega a publicarse.

---

## 5. Ficha de la tienda (Main store listing)

Copia textual íntegra en `PLAY_STORE_LISTING.md` §1.1 (78 chars short + full description).
Assets en `docs/play-assets/`:

| Campo | Qué poner |
|---|---|
| App name | `Trami España` |
| Short description | Trámites españoles explicados con claridad: requisitos, costes y asistente IA. |
| Full description | (pegar bloque completo del listing §1.1) |
| App icon | `docs/play-assets/icon-512.png` |
| Feature graphic | `docs/play-assets/feature-graphic-1024x500.png` |
| Phone screenshots (subir las 7, orden sugerido) | `01-inicio`, `02-buscar`, `07-detalle-tramite`, `03-asistente`, `04-favoritos`, `05-recordatorios`, `06-perfil` (carpeta `screenshots/play/`) |
| Contact email | `tramiespana.app@gmail.com` |
| Website | `<URL_RENDER>` (de la §1) |
| Privacy policy | `<URL_RENDER>/politica-de-privacidad.html` |

---

## 6. Data Safety (formulario oficial)

Guía detallada por pantalla, coherente con la política publicada y el código real:

1. *Does your app collect or share user data?* → **Yes**
2. *Is data collected... encrypted in transit?* → **Yes**
3. *Do you provide a way for users to request data deletion?* → **Yes**
4. *Is this data type... shared?* → **No** para todas (el proveedor LLM actúa como
   encargado/procesador bajo contrato; OpenAI API no usa esos datos para entrenar).
5. Añadir estos tipos (Collected=Yes · Shared=No · Ephemeral=No · Required=Yes):

| Tipo Play | Datos | Propósito (marcar solo estos) |
|---|---|---|
| Personal info → Email address | email | App functionality · Account management |
| Personal info → Name | nombre opcional | App functionality |
| Personal info → User IDs | uid Supabase | App functionality · Account management |
| App activity → Other user-generated content | mensajes/conversaciones asistente | App functionality |
| App activity → Other actions | favoritos, recordatorios | App functionality |

6. Todo lo demás (ubicación, contactos, fotos, audio, archivos, salud, finanzas,
   compras, teléfono, advertising ID…) → **No se recopila**.
7. Preguntas finales: Ads = **No**; targeted ads = **No**.

---

## 7. Content rating (IARC), audiencia y resto de tareas

- **App content → Content rating**: cuestionario IARC. Sin violencia/sexo/apuestas/
  drogas; UGC compartido entre usuarios = **No** (las conversaciones son privadas por
  RLS); compra digital = No; anuncios = No; gambling = No. Resultado esperado: *Everyone / PEGI 3*.
- **Target audience**: 18+ (recomendado para evitar requisitos adicionales de Families;
  la política ya fija mínimo contractual de 14 años). Marca "not designed for children".
- **News app declaration**: No.
- **COVID app**: No.
- **Data safety form** ya cubierta (§6).
- **Government apps**: No.
- **Financial features**: Ninguna.
- **Health apps**: Ninguna.
- **Ads**: contiene publicidad = No.

## 8. Checklist final antes de Production

- [ ] URL Render operativa y política accesible en incógnito (§1)
- [ ] Secret CORS configurado (§2.1)
- [ ] Site/Redirect URLs actualizadas (§2.2)
- [ ] Internal testing instalada en un móvil real: login, búsqueda, asistente, favoritos, recordatorios, logout, deep link `tramiespana://`, eliminar cuenta (con cuenta desechable)
- [ ] App access completado (§3)
- [ ] Listing + gráficos subidos (§5)
- [ ] Data safety enviada (§6) e IARC enviada (§7)
- [ ] Sin warnings rojos en Policy/All tasks del dashboard
- [ ] Promote: Internal → Closed (opcional) → **Production**

## 9. Bloqueadores restantes (ya solo externos)

| ID | Acción humana |
|---|---|
| PLAY_UPLOAD | Pasos §4 (requiere tu sesión en Play Console) |
| RENDER_DEPLOY | Pasos §1 (requiere tu GitHub conectado a Render) |
| SUPABASE_URLS | Pasos §2 (requiere sesión dashboard, ~2 min) |
| LEGAL_ENTITY | Si quieres añadir NIF/razón social al responsable, edita §1 de la política y redespliega |

