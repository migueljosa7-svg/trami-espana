import { supabase } from "../supabase";
import { procedureService } from "./procedureService";
import { Procedure } from "../types";

export interface AssistantSource {
  title: string;
  url: string;
}

export interface AssistantChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  referenced_procedures?: Procedure[];
  sources?: AssistantSource[];
  disclaimer?: string;
  is_demo?: boolean;
  // true cuando la respuesta proviene del motor de búsqueda local (fallback)
  // false o ausente cuando proviene de la Edge Function
  is_fallback?: boolean;
  // Calidad del grounding: "no-results" | "partial" | "relevant"
  // Campo compatible añadido en Fase 7 para estados visuales específicos.
  result_type?: "no-results" | "partial" | "relevant";
  created_at: string;
}

export interface AssistantConversationSession {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export class AssistantService {
  /**
   * Crea una nueva conversación para el asistente.
   */
  public async createConversation(
    title?: string,
  ): Promise<{
    data: AssistantConversationSession | null;
    error: Error | null;
  }> {
    const conversationTitle = title || "Consulta sobre trámites";

    // Obtenemos el estado de autenticación UNA sola vez. Si no hay usuario,
    // NUNCA intentamos INSERT/UPDATE en assistant_conversations (evita el 401
    // de RLS para anónimos). El asistente sigue funcionando con una
    // conversación local.
    let user: { id: string } | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user ?? null;
    } catch {
      user = null;
    }

    const localConversation: AssistantConversationSession = {
      id: `local-conv-${Date.now()}`,
      ...(user ? { user_id: user.id } : {}),
      title: conversationTitle,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // USUARIO NO AUTENTICADO → conversación local únicamente, sin peticiones
    // a escritura de BD.
    if (!user) {
      return { data: localConversation, error: null };
    }

    // USUARIO AUTENTICADO → persistir respetando RLS.
    try {
      const { data, error } = await supabase
        .from("assistant_conversations")
        .insert({
          user_id: user.id,
          title: conversationTitle,
        })
        .select()
        .single();

      if (error) {
        // Si RLS/PG falla por cualquier motivo, no propagamos un 401 al UI:
        // devolvemos una conversación local (evita romper la experiencia).
        return { data: localConversation, error: null };
      }

      return { data: data as AssistantConversationSession, error: null };
    } catch {
      return { data: localConversation, error: null };
    }
  }

  /**
   * Obtiene el historial de conversaciones del usuario autenticado.
   */
  public async getConversations(): Promise<{
    data: AssistantConversationSession[];
    error: Error | null;
  }> {
    try {
      const { data: userData } = await supabase.auth.getUser();

      // USUARIO NO AUTENTICADO: no consultamos assistant_conversations (evita
      // el 401 de RLS). El histórico persistido solo aplica a sesión iniciada.
      if (!userData?.user) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from("assistant_conversations")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        return { data: [], error: null };
      }

      return {
        data: (data as AssistantConversationSession[]) || [],
        error: null,
      };
    } catch (error) {
      return { data: [], error: null };
    }
  }

  /**
   * Método principal para consultar al Asistente IA a través de la Edge Function seguro.
   * Si la Edge Function falla o no responde, conmuta de forma transparente al motor de búsqueda local en BD.
   */
  public async ask(
    userQuery: string,
    conversationId: string = `conv-${Date.now()}`,
  ): Promise<{ data: AssistantChatMessage | null; error: Error | null }> {
    if (!userQuery || !userQuery.trim()) {
      return {
        data: null,
        error: new Error("La consulta no puede estar vacía."),
      };
    }

    const trimmed = userQuery.trim();
    if (trimmed.length > 500) {
      return {
        data: null,
        error: new Error(
          "La consulta supera el límite máximo de 500 caracteres.",
        ),
      };
    }

    try {
      // Intentar invocar la Supabase Edge Function 'assistant'
      const { data, error } = await supabase.functions.invoke("assistant", {
        body: { query: trimmed, conversationId },
      });

      if (!error && data && data.answer) {
        let fullProcedures: Procedure[] = [];
        if (data.procedures && Array.isArray(data.procedures)) {
          for (const procRef of data.procedures) {
            try {
              const procData = await procedureService.getProcedureBySlug(
                procRef.slug,
              );
              if (procData) fullProcedures.push(procData);
            } catch (err) {
              // Silencioso
            }
          }
        }

        const responseMsg: AssistantChatMessage = {
          id: `edge-msg-${Date.now()}`,
          conversation_id: conversationId,
          role: "assistant",
          content: data.answer,
          referenced_procedures: fullProcedures,
          sources: data.sources || [],
          disclaimer:
            data.disclaimer || "Trami España es un servicio independiente.",
          is_demo: Boolean(data.is_demo),
          is_fallback: Boolean(data.is_fallback),
          result_type: data.result_type,
          created_at: new Date().toISOString(),
        };

        return { data: responseMsg, error: null };
      }
      // Sin respuesta de la Edge Function → fallback local
      return this.sendMessage(conversationId, trimmed);
    } catch (err) {
      return this.sendMessage(conversationId, trimmed);
    }
  }

  /**
   * Responde a una consulta del usuario basándose EXCLUSIVAMENTE en trámites validados de la BD (Fallback local).
   */
  public async sendMessage(
    conversationId: string,
    userQuery: string,
  ): Promise<{ data: AssistantChatMessage | null; error: Error | null }> {
    try {
      let searchResults: Procedure[] = [];
      let searchError: any = null;

      try {
        searchResults = await procedureService.searchProcedures(userQuery);
      } catch (err: any) {
        searchResults = [];
        searchError = err;
      }

      if (searchError) {
        const msg = String(searchError?.message || "");
        const isNetworkFailure =
          /network|fetch|offline|timeout|abort|econnrefused|enotfound|load failed|connection/i.test(msg) ||
          (typeof navigator !== "undefined" && navigator.onLine === false);

        if (isNetworkFailure) {
          return {
            data: null,
            error: new Error(
              "No se ha podido conectar con el servicio de trámites. Comprueba tu conexión a internet e inténtalo de nuevo."
            ),
          };
        }
      }

      let answerContent = "";
      let referencedProcedures: Procedure[] = [];
      let sources: AssistantSource[] = [];
      let isDemo = false;

      if (searchResults && searchResults.length > 0) {
        referencedProcedures = searchResults.slice(0, 3);
        const topProcedure = referencedProcedures[0];

        if (topProcedure.verification_status === "draft") {
          isDemo = true;
        }

        answerContent =
          `Basándome en nuestra base de datos de trámites administrativos oficiales:\n\n` +
          `📌 **${topProcedure.title}**\n` +
          `${topProcedure.short_description}\n\n` +
          `• **Ámbito:** ${topProcedure.scope}${topProcedure.autonomous_community ? ` (${topProcedure.autonomous_community})` : ""}\n` +
          `• **Coste:** ${topProcedure.cost || "Consultar en fuente oficial"}\n` +
          `• **Duración estimada:** ${topProcedure.estimated_duration || "No especificada"}\n\n` +
          `Puedes ver todos los requisitos, documentación necesaria y pasos detallados accediendo a la ficha completa del trámite.`;

        if (referencedProcedures.length > 1) {
          answerContent +=
            `\n\nTambién podrían interesarte los siguientes trámites relacionados:\n` +
            referencedProcedures
              .slice(1)
              .map((p) => `• **${p.title}**`)
              .join("\n");
        }

        if (topProcedure.source_url) {
          sources.push({ title: "Sede Oficial", url: topProcedure.source_url });
        }
      } else {
        answerContent =
          `No he encontrado un trámite exacto en nuestra base de datos para la búsqueda: "${userQuery}".\n\n` +
          `Te sugiero probar a buscar términos como:\n` +
          `• "Renovar DNI"\n` +
          `• "Empadronamiento"\n` +
          `• "Vida Laboral"\n` +
          `• "Cita previa NIE"\n` +
          `• "Prestación por desempleo"`;
      }

      const disclaimerText = isDemo
        ? "Este resultado pertenece actualmente al contenido de demostración de Trami España. Servicio independiente no oficial."
        : "Trami España es un servicio independiente y no está afiliado con ninguna administración pública.";

      // En el fallback local determinamos result_type según los resultados encontrados.
      // El cliente ya usa is_fallback=true como señal fiable; añadimos result_type
      // como campo compatible para estados visuales más precisos.
      const resultType: "no-results" | "partial" | "relevant" =
        referencedProcedures.length === 0
          ? "no-results"
          : sources.length > 0
            ? "relevant"
            : "partial";

      const responseMessage: AssistantChatMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        role: "assistant",
        content: answerContent,
        referenced_procedures: referencedProcedures,
        sources,
        disclaimer: disclaimerText,
        is_demo: isDemo,
        is_fallback: true,
        result_type: resultType,
        created_at: new Date().toISOString(),
      };

      try {
        // Solo persistimos mensajes si hay sesión activa (evita el 401 de RLS
        // para usuarios anónimos). El asistente anónimo funciona localmente.
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await supabase.from("assistant_messages").insert([
            {
              conversation_id: conversationId,
              role: "user",
              content: userQuery,
            },
            {
              conversation_id: conversationId,
              role: "assistant",
              content: answerContent,
            },
          ]);
        }
      } catch (err) {
        // Silencioso
      }

      return { data: responseMessage, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error("Error al procesar la consulta"),
      };
    }
  }
}

export const assistantService = new AssistantService();
