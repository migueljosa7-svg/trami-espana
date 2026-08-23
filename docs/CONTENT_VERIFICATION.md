# Trami España — Verificación de Contenido

Este documento define la política y criterios para marcar trámites como verificados.

---

## 1. Estados posibles

| Estado | Significado |
|---|---|
| `draft` | Contenido en desarrollo o demostración. No puede publicarse como oficial. |
| `verified` | Contenido comprobado contra fuente oficial y apto para publicación. |
| `needs_review` | Contenido obsoleto o con dudas; requiere revisión humana. |
| `archived` | Contenido fuera de servicio o retirado. |

---

## 2. Criterios para `verified`

Para marcar un trámite como `verified` se requiere:

1. **Fuente oficial**: el trámite debe estar documentado en una fuente oficial verificable (administracion.gob.es, sede.policia.gob.es, dgt.es, etc.).
2. **Datos exactos**: requisitos, documentos, pasos, plazos y costes deben coincidir con la fuente oficial.
3. **Trazabilidad**:
   - `source`: nombre del organismo o portal oficial.
   - `source_url`: URL estable a la fuente oficial.
   - `last_verified_at`: fecha de la verificación.
   - `verified_by`: identificador del verificador (admin).

---

## 3. Reglas estrictas

- **No inventes datos administrativos.** Si no puedes verificar un trámite desde una fuente oficial, déjalo como `draft` o no lo crees.
- **No marques DEMO como `verified`.** Los datos de `seed.sql` son demostración.
- **No fingir verificación.** `last_verified_at` debe reflejar una verificación real.
- **Publicación segura**: solo se muestra al público `is_published = true AND verification_status = 'verified'`.

---

## 4. Flujo recomendado

1. Un admin crea/edita el trámite con estado `draft`.
2. Un verificador compara con la fuente oficial.
3. Si es correcto, marca `verification_status = 'verified'`, actualiza `last_verified_at` y `verified_by`.
4. Si requiere cambios, deja comentarios internos y mantiene `draft`.

---

## 5. Contenido de producción

Los trámites oficiales deben cargarse desde un script separado (`supabase/seed_production.sql`).
No se carga contenido inventado: si no hay fuente oficial suficiente, el trámite queda excluido hasta que pueda verificarse.
