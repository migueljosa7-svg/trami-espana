-- FASE 5.9 — FIX: allow anonymous assistant messages
-- Correction only for assistant_messages SELECT/INSERT policies.
-- assistant_conversations already allows anonymous conversations since migration 0005.
-- This migration aligns assistant_messages to support:
--   - anonymous users (auth.uid() IS NULL) when conversation.user_id IS NULL
--   - authenticated users when conversation.user_id = auth.uid()
--
-- NO MODIFICA:
--   - procedures
--   - procedure_categories
--   - procedure_requirements
--   - procedure_documents
--   - procedure_steps
--   - procedure_links
--   - user_roles
--   - profiles
--   - favorites
--   - reminders
--   - assistant_conversations
--   - AuthContext
--   - seed.sql
--   - datos existentes

BEGIN;

-- assistant_messages: SELECT
DROP POLICY IF EXISTS "Users can view messages from own conversations"
  ON public.assistant_messages;

CREATE POLICY "Users can view messages from own conversations"
  ON public.assistant_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.assistant_conversations
      WHERE assistant_conversations.id = assistant_messages.conversation_id
        AND (
          (auth.uid() IS NULL AND assistant_conversations.user_id IS NULL)
          OR assistant_conversations.user_id = auth.uid()
        )
    )
  );

-- assistant_messages: INSERT
DROP POLICY IF EXISTS "Users can create messages in own conversations"
  ON public.assistant_messages;

CREATE POLICY "Users can create messages in own conversations"
  ON public.assistant_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assistant_conversations
      WHERE assistant_conversations.id = assistant_messages.conversation_id
        AND (
          (auth.uid() IS NULL AND assistant_conversations.user_id IS NULL)
          OR assistant_conversations.user_id = auth.uid()
        )
    )
  );

COMMIT;
