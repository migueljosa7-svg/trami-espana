# Trami España — Datos Legales Realmente Requeridos (FASE 7.1)

> Documento operativo que centraliza TODOS los datos reales que el responsable de Trami España
> debe proporcionar (o verificar) antes de considerar el servicio preparado para publicación.
> **Nada de este documento debe copiarse sin verificación.** No inventar datos.
>
> Estado: recopilación automática a partir del código (`packages/shared/src/legal.ts`)
> + revisión manual. Revisar antes de publicar.

---

## 1. Datos que debe proporcionar el responsable

| # | Dato requerido | Dónde se usa | Marcador en código |
|---|---|---|---|
| 1 | **Nombre legal del responsable** (persona física o razón social) | Política de privacidad, Aviso legal | `[REQUIERE DATO REAL: ...]` |
| 2 | **Domicilio fiscal / postal** (si aplica) | Política de privacidad § Responsable | — |
| 3 | **Dominio web definitivo** | Todos los documentos legales, contactos, footers | `LEGAL_DOMAIN_DEFINITIVE` |
| 4 | **Correo de contacto verificado** (`contacto@tramiespana.es` provisional) | Contacto, derechos ARCO, privacidad | `LEGAL_EMAIL_UNVERIFIED_NOTICE` |
| 5 | **Proveedor LLM exacto desplegado** (la Edge Function `assistant/index.ts` usa **OpenAI** por defecto o **Google Gemini** según `LLM_PROVIDER`; confirmar el que esté configurado con `LLM_API_KEY` en Supabase Secrets) | Privacidad § Proveedor IA/LLM y § Datos enviados a terceros | `[REQUIERE DATO REAL: ...]` |
| 6 | **Plazos de conservación** concretos | Privacidad § Conservación | `[REQUIERE DATO REAL: ...]` |
| 7 | **Base jurídica concreta definitiva** (decisión de asesor jurídico) | Privacidad § Bases jurídicas | `[REQUIERE DATO REAL: ...]` |
| 8 | **Garantías de transferencia internacional** (proveedor/infraestructura) | Privacidad § Transferencias internacionales | `[REQUIERE DATO REAL: ...]` |
| 9 | **Política de menores definitiva** / edad mínima confirmada | Privacidad § Menores, Términos | `[REQUIERE DATO REAL: ...]` |
| 10 | **Jurisdicción competente definitiva** | Términos § Legislación aplicable | `[REQUIERE DATO REAL: ...]` |
| 11 | **Mecanismo de notificación de cambios** definitivo | Términos/Privacidad §§ Modificaciones | — |

---

## 2. Datos pendientes de VERIFICACIÓN (existen provisionales)

| Dato | Valor provisional | Acción requerida |
|---|---|---|
| Email de contacto | `contacto@tramiespana.es` | **Verificar que la cuenta existe y está operativa** antes de publicar. |
| Dominio | `tramiespana.es` (referido en README) | **Verificar titularidad y funcionalidad.** Usar en URL de política de privacidad del Play Console. |
| Assets (icono/splash/favicon) | PNG placeholders de color marca | **Diseño definitivo requerido** (ver `docs/ASSETS_NOTAS.md` si existe; si no, ver README). |

---

## 3. Decisiones que requieren intervención humana

- **Decisión de asesor jurídico** sobre base legal (consentimiento vs. interés legítimo) y cláusulas de exclusión.
- **Verificación del proveedor de infraestructura** y del subencargado (Supabase) + si aplica el procesador LLM.
- **Redacción final** de los textos que hoy contienen `[Dato pendiente de confirmación]` tras obtener los datos reales.
- **Aplicar la migración** `supabase/migrations/20240101000009_account_deletion.sql` en los entornos reales (local y cloud) y probar el RPC `delete_my_account`. ✅ **YA APLICADA** (2026-08, verificado: 13/13 migraciones local=remoto, incluida `20240101000012_least_privilege_grants`; RPC presente, SECURITY DEFINER y probado E2E).
- **Publicar la política de privacidad y términos en URLs públicas** y enlazarlas en Play Console.

---

## 4. Proceso de verificación

1. Sustituir cada `[REQUIERE DATO REAL: ...]` y cada `[Dato pendiente de confirmación]` del código
   (`packages/shared/src/legal.ts`) por el dato real.
2. Ejecutar `npm run typecheck --workspace=packages/shared` para revalidar.
3. Actualizar Play Console (privacy policy URL, contacto, Data Safety) con los datos verificados.
4. Revisión jurídica final obligatoria (esta auditoría técnica NO sustituye asesoramiento jurídico).
