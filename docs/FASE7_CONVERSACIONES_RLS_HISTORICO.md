> **⚠️ DOCUMENTO HISTÓRICO (Fase 7).** Estado anterior a la migración
> `20240101000008_anonymous_assistant_messages.sql`, que añadió soporte de
> mensajes/membresías anónimas del asistente. Puede contener afirmaciones ya
> superadas (p. ej., la inexistencia de soporte anónimo). El estado vigente de
> RLS está descrito en `docs/FASE11_CIERRE_FINAL.md` y verificado en Fase 11.


# Estado de Conversaciones y RLS — Trami España (Fase 7)

> Documento de estado. Describe **exactamente** lo que existe en el código y en las
> migraciones de Supabase. No afirma nada que no esté implementado.

---

## 1. Tablas involucradas

### `public.assistant_conversations`
Definida en `supabase/migrations/20240101000000_initial_schema.sql`:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` |
| `user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL` |
| `title` | `TEXT` | `NOT NULL` |
| `created_at` | `TIMESTAMPTZ` | default `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | default `NOW()` |

- **Índice:** `idx_assistant_conversations_user_id` (en `user_id`).
- **Trigger:** `set_updated_at_assistant_conversations` actualiza `updated_at` en UPDATE.

**Observación importante:** `user_id` es `NOT NULL`. No existe soporte a nivel de esquema
para conversaciones "anónimas" (sin `user_id`).

### `public.assistant_messages`
Definida en la misma migración:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, default `uuid_generate_v4()` |
| `conversation_id` | `UUID` | `REFERENCES public.assistant_conversations(id) ON DELETE CASCADE NOT NULL` |
| `role` | `TEXT` | `CHECK (role IN ('user', 'assistant'))` |
| `content` | `TEXT` | `NOT NULL` |
| `created_at` | `TIMESTAMPTZ` | default `NOW()` |

- **Índice:** `idx_assistant_messages_conversation_id`.

**Observación:** El `CHECK` de `role` **no incluye** `'system'`, aunque el tipo
TypeScript `AssistantChatMessage.role` sí declara `'user' | 'assistant' | 'system'`.
Insertar un mensaje `'system'` en BD fallaría por la constraint.

---

## 2. Políticas RLS existentes

Definidas en `supabase/migrations/20240101000001_rls_policies.sql`.

### `assistant_conversations` (RLS `ENABLE ROW LEVEL SECURITY`)
- **SELECT** — "Users can view own conversations": `USING (auth.uid() = user_id)`
- **INSERT** — "Users can create conversations": `WITH CHECK (auth.uid() = user_id)`
- **UPDATE** — "Users can update own conversations": `USING (auth.uid() = user_id)`
- **DELETE** — "Users can delete own conversations": `USING (auth.uid() = user_id)`

### `assistant_messages` (RLS `ENABLE ROW LEVEL SECURITY`)
- **SELECT** — "Users can view messages from own conversations":
  `USING (EXISTS (SELECT 1 FROM assistant_conversations WHERE id = assistant_messages.conversation_id AND user_id = auth.uid()))`
- **INSERT** — "Users can create messages in own conversations":
  `WITH CHECK (EXISTS (SELECT 1 FROM assistant_conversations WHERE id = assistant_messages.conversation_id AND user_id = auth.uid()))`
- **NO hay políticas** de UPDATE ni DELETE para `assistant_messages`.

---

## 3. Relación con `auth.uid()`

- Toda política de conversaciones depende de `auth.uid()`, la función de Supabase que
  devuelve el `id` del usuario **autenticado** vía JWT.
- Para **usuarios anónimos** (`auth.uid()` es `NULL`), `auth.uid() = user_id` no se cumple
  (NULL nunca es igual a nada), por lo que **no pueden**: leer, crear, actualizar ni borrar
  conversaciones, ni mensajes.

---

## 4. Qué funciona para usuarios autenticados

1. `assistantService.createConversation(title)`:
   - Si `supabase.auth.getUser()` devuelve usuario, inserta una fila en
     `assistant_conversations` con `user_id = user.id` mediante el cliente con anon key.
   - Si la política RLS la permite (auth.uid() = user_id), se crea la conversación real.
   - Si el insert falla por RLS u otro error, **devuelve un id local** `local-conv-<timestamp>`
     (no persiste en BD).
2. `assistantService.getConversations()`: consulta `assistant_conversations` filtrando por
   `user_id = auth.uid()`.
3. `assistantService.sendMessage(conversationId, query)` (fallback local): tras generar la
   respuesta, intenta insertar en `assistant_messages` un par de filas `role='user'` y
   `role='assistant'`. Si la conversación pertenece al usuario autenticado, la inserción
   funciona; en caso contrario (o si la conversación es local), el insert se **silencia**
   (bloque `catch` vacío).

**Conclusión para autenticados:** la persistencia de conversaciones funciona **solo si** la
conversación se creó realmente en BD (INSERT aceptado por RLS) y el `conversation_id`
usado corresponde a esa fila.

---

## 5. Qué ocurre con usuarios anónimos

- `supabase.auth.getUser()` devuelve `user: null`.
- `createConversation` genera un `id` local `local-conv-<timestamp>` y **no** persiste nada
  en BD (no hay `user_id` válido; además RLS bloquea el INSERT sin `auth.uid()`).
- `getConversations` devuelve `data: []` (no puede leer nada).
- El flujo de chat funciona completamente en **memoria/sesión** usando el `local-conv-*`.
- `sendMessage` intenta insertar mensajes en `assistant_messages` con ese id local; el INSERT
  falla (no existe la conversación y RLS lo bloquea) y el error se silencia.
- **Impacto:** un usuario anónimo puede *chatear* en la sesión actual, pero **no** se guarda
  ningún historial persistente entre sesiones ni se persisten mensajes.

---

## 6. Cómo se genera el `conversationId`

1. En las pantallas (web `Assistant.tsx` y mobile `asistente.tsx`), al montar el componente se
   llama a `assistantService.createConversation(...)`.
   - Autenticado → id UUID real de BD (o `local-conv-*` si el insert falla).
   - Anónimo → `local-conv-<timestamp>`.
2. En `assistantService.ask(query, conversationId)`: si no se pasa `conversationId`, el
   parámetro por defecto es `conv-${Date.now()}`.
3. La Edge Function `assistant` recibe `{ query, conversationId }` pero **no** la persiste ni
   la usa para inferir contexto; es un mero identificador de la UI.

---

## 7. Qué queda pendiente para una integración completa de conversaciones persistentes

- **Conversaciones anónimas persistentes:** el esquema exige `user_id NOT NULL`. Habría que
  permitir `user_id` nullable o introducir un concepto de sesión/anónimo.
- **`sendMessage` con contexto:** el fallback local inserta mensajes pero la Edge Function no
  recibe el historial previo; no hay memoria conversacional real más allá de un único turno.
- **Persistencia real del historial:** los mensajes solo se guardan si la conversación existe
  en BD y pertenece al usuario autenticado. El fallback local silencia los errores de INSERT,
  por lo que no hay señal de que la persistencia haya fallado.
- **Política de DELETE/UPDATE en `assistant_messages`:** no existen; no se puede editar ni
  borrar mensajes.
- **Soporte `role='system'`:** el CHECK de la BD no lo permite aunque el tipo TS lo declare.
- **Idempotencia / reintentos de la Edge Function:** no se implementa deduplicación de
  mensajes si un `invoke` se reintenta.
- **Carga de historial en la UI:** `getConversations` existe en el servicio pero las pantallas
  de asistente actuales **no** cargan historial previo; cada sesión comienza de cero.

---

## 8. Diferencia entre fallback local y conversación persistente

| Aspecto | Fallback local (`sendMessage`) | Conversación persistente |
|---|---|---|
| Origen de la respuesta | Motor de búsqueda local en BD (`procedureService.searchProcedures`) | Edge Function `assistant` con grounding multi-keyword |
| `is_fallback` | `true` | `false` |
| `result_type` | Calculado en cliente: `no-results` / `partial` / `relevant` según resultados | Fijado por la Edge Function según la 1ª/2ª pasada de búsqueda |
| Persistencia en `assistant_messages` | Intenta insertar; se silencia si falla | Depende de la UI/Edge (hoy no se persiste desde la Edge Function) |
| Requiere `auth.uid()` | No (el chat en memoria funciona) | Sí, para persistir en `assistant_conversations`/`assistant_messages` |
| Disponible para anónimos | Sí (en sesión) | Solo lectura/creación si estuviera implementado el anclaje |

### Campo `result_type` (Fase 7)

Se añadió un campo compatible `result_type` al contrato `AssistantChatMessage` para
diferenciar de forma fiable la calidad del grounding sin romper respuestas existentes:

- `"no-results"` → no se encontraron trámites (ni por texto ni por keywords).
- `"partial"` → se encontraron resultados por la 2ª pasada multi-keyword, pero sin
  fuentes oficiales (`procedure_links`).
- `"relevant"` → coincidencia directa de la 1ª pasada con posibles fuentes oficiales.

En la Edge Function lo calcula `searchProcedures` según la pasada que devuelve datos.
En el fallback local lo calcula `sendMessage` según si hay procedimientos y/o sources.
Es un campo opcional: si una respuesta antigua no lo incluye, los clientes usan
heurísticos de compatibilidad (basados en `is_fallback` y en la presencia de
procedimientos/sources).

---

## 9. Limitaciones a resolver antes de producción

1. **Persistencia de anónimos:** decidir si se permite `user_id` null o se exige login.
2. **Memoria conversacional:** la Edge Function no recibe historial; sin esto no hay contexto
   de varios turnos.
3. **Persistencia real de mensajes desde la Edge Function:** hoy los mensajes se intentan
   insertar solo en el fallback local cliente; la respuesta de la Edge Function no se guarda
   en BD.
4. **`role='system'`:** alinear el `CHECK` de BD con el tipo TypeScript si se quiere usar.
5. **Políticas de UPDATE/DELETE en mensajes:** definir si son necesarias.
6. **Carga de historial en UI:** integrar `getConversations`/mensajes en las pantallas.
7. **Manejo de errores de persistencia:** no silenciar ciegamente los errores de INSERT si se
   quiere auditar o notificar al usuario.
