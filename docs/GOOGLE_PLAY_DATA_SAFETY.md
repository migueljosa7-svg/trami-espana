# Trami España — Google Play Data Safety (FASE 7.1)

> Declaración de seguridad de datos **basada EXCLUSIVAMENTE en lo que la aplicación hace realmente**.
> No marcar categorías que la app no usa. No inventar respuestas para Play Console.
> Revisar el código antes de rellenar el formulario de Play Console y mantenerlo en síncrono con
> `docs/LEGAL_DATA_REQUIRED.md` y `packages/shared/src/legal.ts`.
>
> Fuentes: `packages/shared/src/services/*`, `supabase/functions/assistant/index.ts`,
> `apps/mobile/app.json`, sesión de Supabase Auth y almacenamiento local.

---

## Resumen ejecutivo

- **Sin publicidad.**
- **Sin SDKs de terceros de tracking/analytics.** El único "analytics" del proyecto
  (`analyticsService`) mantiene eventos **en memoria** y NO los envía a ningún servidor
  de terceros. Por tanto **no** se declara recopilación de datos de análisis.
- **Sin** ubicación, contactos, fotos, cámara, micrófono, archivos, historial de compras,
  datos de salud/fitness, datos financieros, o números de teléfono.
- Los únicos datos personales son los asociados a la **cuenta y al uso del servicio**.

---

## Datos recopilados

| Categoría (Play Console) | ¿Se recopila? | Tipo | ¿Se comparte? | Propósito |
|---|---|---|---|---|
| **Email** | Sí | Personal | No | Creación de cuenta y autenticación (Supabase Auth) |
| **Nombre** (opcional) | Sí | Personal | No | Perfil del usuario (optional `full_name`) |
| **User ID** | Sí | ID de usuario | No | Identificar la cuenta en Supabase |
| **Mensajes del usuario** (consultas al asistente) | Sí | Contenido del usuario | No | Funcionalidad del asistente de IA |
| **Favoritos** | Sí | Actividad en la app | No | Funcionalidad (guardar trámites) |
| **Recordatorios** | Sí | Actividad en la app | No | Funcionalidad (avisos) |
| **Conversaciones del asistente** | Sí | Contenido del usuario | No | Funcionalidad |
| **Datos de diagnóstico** | No | — | — | — |

### Datos que la app NO recopila (marcar "No"/inapplicable en Play Console)
- Ubicación aproximada / precisa ❌
- Contactos ❌
- Fotos/videos ❌
- Audio ❌
- Archivos y documentos ❌
- Registro de calendario ❌
- Identificadores de publicidad / del dispositivo ❌
- Historial de compras ❌
- Datos de salud y estado físico ❌
- Datos financieros / tarjeta ❌
- Teléfono ❌

---

## Seguridad de los datos

- **Cifrado en tránsito:** Sí (HTTPS/TLS hacia Supabase).
- **Cifrado en reposo:** Sí (Supabase/PostgreSQL).
- **Eliminación por el usuario:** Sí. El usuario puede **eliminar su cuenta** desde
  Perfil → Ajustes → Eliminar cuenta (RPC `delete_my_account`), o solicitarlo por correo
  (`contacto@tramiespana.es` provisional — pendiente de verificación).
- **Exportación/portabilidad:** Sí (web: "Exportar mis datos"; móvil: solicitud manual).

---

## Declaraciones clave para Play Console

1. **Ads:** No.
2. **Se comparten datos?** No (autenticación de cuenta sólo para el propio usuario).
3. **Eliminación de datos:** El usuario puede solicitar la eliminación dentro de la app
   y contactando por email.
4. **Categorías de datos:** sólo `Email`, `Name`, `User IDs`, `App activity` (favoritos,
   recordatorios, consultas al asistente) y contenido del usuario (mensajes/conversaciones).

---

## Notas

- **Proveedor LLM del asistente** (Edge Function `supabase/functions/assistant/index.ts`):
  la función usa, según la variable secreta `LLM_PROVIDER`, **OpenAI** (por defecto, modelo `gpt-3.5-turbo`)
  o **Google Gemini** (`gemini-pro`), con la clave `LLM_API_KEY` guardada **solo en el servidor**
  (Supabase Secrets). Esto significa que **las consultas del usuario pueden enviarse a OpenAI o a
  Google** para generar la respuesta. Declarar en la Data Safety de Play Console que las consultas
  del asistente se comparten con el proveedor LLM configurado, y confirmar en la política de privacidad
  (§ "Datos enviados a servicios externos" y § "Proveedor de IA/LLM") el proveedor realmente desplegado
  en producción. Ver `docs/LEGAL_DATA_REQUIRED.md`.
- Pendiente de aportar por el responsable: URL pública de política de privacidad, correo verificado, dominio.
