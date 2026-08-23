# Trami España — Checklist de Compliance (FASE 7.1)

> **Estado legal real.** Marcar casillas sólo cuando el requisito esté efectivamente cumplido.
> No marcar nada pendiente de intervención humana.
> Leyenda: • = requiere intervención humana/externa · — = ya implementado en código.

---

## RGPD / LOPDGDD
- [ ] Política de privacidad publicada en URL accesible (`BLOCKED_EXTERNAL`: dominio/URL)
- [ ] Términos y condiciones publicados en URL (`BLOCKED_EXTERNAL`: dominio/URL)
- [x] Página web de privacidad implementada — `apps/web/src/pages/Privacy.tsx` (`VERIFIED`)
- [x] Página web de términos implementada — `apps/web/src/pages/Terms.tsx` (`VERIFIED`)
- [ ] Aviso legal con identificación del responsable (`USER_ACTION_REQUIRED`: NIF/Razón social)
- [x] Cookies policy implementada — `apps/web/src/pages/Cookies.tsx` (sólo técnico, sin cookies de rastreo) (`VERIFIED`)
- [ ] Base legal documentada con decisión del titular (`USER_ACTION_REQUIRED`)
- [x] Canal para ejercer derechos implementado — Perfil (web+móvil): eliminar cuenta, exportar datos (`VERIFIED`)
- [x] Identificar subencargados: Supabase (`VERIFIED`), proveedor LLM (`VERIFIED` en backend)
- [x] Gestión de menores (menores de 14 años) — aviso y restricciones presentes (`VERIFIED`)
- [x] Supresión de cuenta implementada y asegurada (RPC `delete_my_account`, migración `...0009`) (`VERIFIED`)
- [x] Exportación de datos implementada (web) (`VERIFIED`)

## Google Play Console
- [ ] Cuenta de desarrollador de Google creada ($25) • HUMAN_REQUIRED
- [ ] App creada con package `es.tramiespana.app` • HUMAN_REQUIRED
- [ ] AAB de producción generado • **HECHO (FASE 11)**: AAB firmado localmente (28,65 MB, `es.tramiespana.app`, v1/versionCode 1). Pendiente humano: subirlo a Play Console (requiere cuenta de desarrollador).
- [ ] Icono y gráficos definitivos (no placeholders) • HUMAN_REQUIRED
- [ ] Capturas de pantalla (móvil/tablet) • HUMAN_REQUIRED
- [ ] Listing completo (descripción, categoría, tags) • HUMAN_REQUIRED
- [ ] Clasificación de contenido IARC completada • HUMAN_REQUIRED
- [ ] Data safety declarada (sin ads, no compartir datos) • HUMAN_REQUIRED (checklist en `docs/GOOGLE_PLAY_DATA_SAFETY.md`)
- [ ] Política de privacidad y términos enlazados • HUMAN_REQUIRED
- [ ] Detalles de contacto verificados (`contacto@tramiespana.es` / dominio) • HUMAN_REQUIRED

## Cumplido a nivel de código (verificado en FASE 7.1)
- [x] Footer web global con Privacidad, Términos, Cookies, Contacto + disclaimer de independencia
- [x] App móvil: sección "Legal y privacidad" en Perfil con 6 pantallas legales navegables
- [x] Disclaimer de servicio independiente centralizado (`LEGAL_DISCLAIMER`) usado en web, móvil y páginas legales
- [x] Disclaimer del asistente centralizado (`ASSISTANT_DISCLAIMER`) en web y móvil
- [x] Registro con aceptación de Términos y Privacidad (sin consentimientos comerciales inventados)
- [x] Supresión de cuenta real (RPC) con confirmación en web y móvil
- [x] Exportación/portabilidad de datos (web)
- [x] Marcadores `[REQUIERE DATO REAL]` saneados para el usuario final (no se muestran crudos)
- [x] Página de contacto con canal real (mailto) + aviso de email no verificado
- [x] Solo anon key en el frontend (service_role nunca en cliente)
- [x] Edge Function `assistant` desplegada con CORS restringido: `verify_jwt=false` + secret `CORS_ALLOWED_ORIGINS` (orígenes no autorizados → `Access-Control-Allow-Origin: null`; preflight `OPTIONS` 200 con `Access-Control-Allow-Methods: POST, OPTIONS`) `FIXED & VERIFIED` (2026-08-22)
- [x] RLS activa; datos de usuario accesibles solo por `auth.uid()`
- [x] `.env` en `.gitignore`; `.env.example` sin secretos
- [x] Assets PNG válidos (placeholders de color marca, pendiente diseño definitivo) — `docs/ASSETS_STATUS.md`

---

## Documentos de referencia (FASE 7.1)
- `docs/LEGAL_DATA_REQUIRED.md` — datos reales pendientes de aportar
- `docs/GOOGLE_PLAY_DATA_SAFETY.md` — declaración Data Safety del proyecto
- `docs/PLAY_STORE_FINAL_CHECKLIST.md` — checklist de publicación
- `docs/ASSETS_STATUS.md` — estado de los assets
