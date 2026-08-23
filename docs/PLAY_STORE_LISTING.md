# Trami España — Preparación de Google Play Console (FASE 7)

> **ACTUALIZADO 2026-08-23:** cuenta Play Console **Personal creada**. Ejecución paso a paso
> en **`docs/PLAY_CONSOLE_LAUNCH_GUIDE.md`** (Render, Supabase, App Access, Data Safety).
> El AAB definitivo está firmado y verificado (`targetSdk 36`; SHA-256
> `C314B8A857F0F79A2D647FA8D02E5845E562C4BAC85675C613518865D1ADAF51`).

---

## 1. Datos del app (Settings → App identity)
| Campo | Valor | Estado |
|---|---|---|
| Nombre | Trami España | ✅ Definido |
| Default language | Español (es-ES) | ✅ Definido |
| App name (short) | Trami España | ✅ Definido |
| **Package name** | `es.tramiespana.app` | ✅ Definido (config en app.json) |
| Version (tag de lanzamiento) | `1.0.0` / `versionCode 1` | ✅ Definido |
| Full description | ✅ Redactado (ver §1.1) | ✅ FASE 11 |
| Short description (≤80 chars) | ✅ 78 caracteres (ver §1.1) | ✅ FASE 11 |
| Website | URL de Render (guía §1) | ⏳ tras desplegar Render |
| Policy URL | `<URL_RENDER>/politica-de-privacidad.html` | ✅ página creada · ⏳ URL tras deploy |

### 1.1 Textos de listing redactados (FASE 11)

> Basados exclusivamente en funcionalidades reales de la app. Sin datos legales inventados.

**Short description (78 caracteres):**

```text
Trámites españoles explicados con claridad: requisitos, costes y asistente IA.
```

**Full description:**

```text
Consulta cómo hacer los trámites administrativos más habituales en España, con
información clara y organizada: qué necesitas, cuánto cuesta, cuánto tarda y
dónde realizarlo en la fuente oficial.

FUNCIONES PRINCIPALES

• Buscador de trámites por categoría y palabra clave.
• Fichas detalladas: requisitos, documentación, coste, duración estimada y
  enlace a la sede oficial.
• Asistente con inteligencia artificial: pregunta en lenguaje natural y recibe
  una orientación basada en el contenido verificado de la aplicación, con su
  descargo correspondiente.
• Favoritos: guarda los trámites que te interesan y tenlos siempre a mano.
• Recordatorios: crea avisos para no perder plazos ni renovaciones.
• Cuenta opcional para sincronizar tus datos entre dispositivos, con eliminación
  de cuenta disponible desde la propia aplicación.

AVISO IMPORTANTE

Trami España es un servicio independiente de información y NO está afiliado a
ninguna administración pública. La información es orientativa y debe
confirmarse siempre en las fuentes oficiales (p. ej., sede.gob.es o la sede
electrónica de tu ayuntamiento). Los resultados del asistente pueden contener
errores; comprueba siempre la fuente oficial antes de actuar.

Descarga gratuita. El uso de la cuenta requiere un email válido. Política de
privacidad disponible dentro de la aplicación.
```

## 2. Gráficos (Play Console > Graphics)
| Asset | Requisito | Estado |
|---|---|---|
| App icon (512×512) | PNG, ≤1 MB | ✅ GENERADO: `docs/play-assets/icon-512.png` (512×512, 2 KB; branding provisional #2563eb) |
| Feature graphic (1024×500) | PNG/JPG | ✅ GENERADO: `docs/play-assets/feature-graphic-1024x500.png` (1024×500 exacto) |
| Phone screenshots (2-8) | ratio ≤ 2:1 | ✅ 7/7 GENERADAS: `docs/play-assets/screenshots/play/*.png` (1080×1920, 9:16 — capturas REALES de la app en emulador API 34) |
| 7" tablet screenshots | opcional | ⏳ No generado (opcional) |
| 10" tablet screenshots | opcional | ⏳ No generado (opcional) |
| Video (opcional) | YouTube | ⏳ PENDIENTE (opcional) |

> **Nota FASE 11:** capturas tomadas de la aplicación REAL ejecutada en emulador Android 14
> mediante deep links `tramiespana://` (sin contenido falseado). El material bruto 1080×2340
> (ratio 2,17:1, NO conforme a Play) se conserva en `screenshots/source/`; subir solo `play/`.
> Icono y feature graphic usan el branding actual del proyecto; sustituibles por diseño
> definitivo sin bloquear la publicación.

## 3. Categoría / Audiencia
- Categoría: [REQUIERE: elegir, p. ej. `Productivity` / `Reference`]
- Tags: [REQUIERE: máximo 5]
- Audiencia objetivo: [REQUIERE: público general / adultos]
- Contenido dirigido a menores: [REQUIERE: sí/no]

## 4. Clasificación de contenido (Content rating)
Completar el cuestionario de clasificación de la IARC en Play Console. Datos relevantes de la app:
- Información administrativa (no contiene violencia, sexualidad, etc.)
- Funciones: autenticación (email), asistente IA, sin compras in-app
- [REQUIERE: revisar y completar cuestionario]

## 5. Declaración de seguridad de datos (Data safety)
Declarar en Play Console:
| Dato | Recopilado | Compartido | Propósito |
|---|---|---|---|
| Email | Sí | No | Funcionalidad del servicio (cuenta) |
| Nombre (si se pide) | [REQUIERE: confirmar] | No | Perfil (opcional) |
| Consultas del asistente | Sí | No | Funcionalidad IA |
| Datos de uso/análisis | [REQUIERE: confirmar] | No | Análisis |
- Cifrado en tránsito: Sí
- **No se recopilan** datos de ubicación, contactos, fotos, etc. → marcar "No"

## 6. Página de datos (Data safety / Ads)
- **Sin publicidad** → marcar en Play Console.
- [REQUIERE: confirmar no ads]

## 7. Requisitos del dispositivo (última versión)
- [REQUIERE: definir mínimo Android]

## 8. Privacidad del usuario (Google Play "User data")
- Enlazar URL de Política de Privacidad: [REQUIERE: URL pública]
- Declarar manejo de datos de usuario según la política.

---

## Orden de ejecución para publicar
1. ~~`npx eas login`~~ / ~~`eas build`~~ — NO necesarios: el AAB local ya está firmado y
   verificado (`jarsigner` PASS, manifest conforme; ver `PLAY_STORE_FINAL_CHECKLIST.md` §6).
   EAS queda como alternativa cloud opcional (EXTERNAL_BLOCKER_EAS_LOGIN si se quisiera usar).
2. Crear app en Play Console (package `es.tramiespana.app`) — requiere cuenta de
   desarrollador (**EXTERNAL_BLOCKER_PLAY_CONSOLE**).
3. Subir el AAB `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
4. Rellenar listing (§1.1 listo), gráficos (`docs/play-assets/` listo), clasificación (IARC),
   data safety (§5) y enlaces legales (pendientes de dominio: EXTERNAL_BLOCKER_DOMAIN).
5. Revisión y publicación.