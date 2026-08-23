import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { authService, assistantService, AssistantChatMessage, ASSISTANT_DISCLAIMER } from "@trami-espana/shared";

const MAX_CHARS = 500;
const SLOW_THRESHOLD_MS = 6000;

type MessageStatus = "normal" | "partial" | "no-results" | "fallback" | "error";

interface EnhancedMessage extends AssistantChatMessage {
  status?: MessageStatus;
  lastQuery?: string;
}

function detectStatus(msg: AssistantChatMessage): MessageStatus {
  if (!msg.content) return "error";
  const c = msg.content.toLowerCase();

  // Fallback local: la Edge Function marca is_fallback=true de forma fiable.
  if (msg.is_fallback === true) {
    return "fallback";
  }

  // Diferenciación de la calidad del grounding (campo compatible de Fase 7).
  if (msg.result_type) {
    if (msg.result_type === "no-results") return "no-results";
    if (msg.result_type === "partial") return "partial";
    return "normal";
  }

  // Fallbacks heurísticos (compatibilidad con respuestas anteriores).
  const noProcedures = (msg.referenced_procedures?.length ?? 0) === 0;
  const noSources = (msg.sources?.length ?? 0) === 0;

  if (
    noProcedures &&
    noSources &&
    (c.includes("no he encontrado") || c.includes("no puedo confirmarlo"))
  ) {
    return "no-results";
  }
  // Señal secundaria: sin sources pero con procedimientos.
  if (noSources && (msg.referenced_procedures?.length ?? 0) > 0) {
    return "partial";
  }
  return "normal";
}

export default function AssistantScreen() {
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowResponse, setIsSlowResponse] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState("");
    const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const currentUser = await authService.getCurrentUser();

      // Sin usuario: no crear conversación, no tocar Supabase. Redirigir a login.
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      const { data } =
        await assistantService.createConversation("Asistente Mobile");
      if (data) {
        setConversationId(data.id);
        setMessages([
          {
            id: "welcome-mobile",
            conversation_id: data.id,
            role: "assistant",
            content:
              "¡Hola! Soy tu asistente de orientación de trámites para España. ¿Qué trámite deseas consultar?",
            disclaimer: "Trami España es un servicio independiente no oficial.",
            created_at: new Date().toISOString(),
            status: "normal",
          },
        ]);
      }
    };
    init();
  }, []);

  const handleSend = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? inputQuery).trim();
      if (!text || isLoading) return;

      const userMsg: EnhancedMessage = {
        id: `user-${Date.now()}`,
        conversation_id: conversationId,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textOverride) setInputQuery("");
      setIsLoading(true);
      setIsSlowResponse(false);

      slowTimerRef.current = setTimeout(
        () => setIsSlowResponse(true),
        SLOW_THRESHOLD_MS,
      );

      try {
        const { data, error } = await assistantService.ask(
          text,
          conversationId,
        );
        if (error) {
          setLastFailedQuery(text);
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              conversation_id: conversationId,
              role: "assistant",
              content:
                error.message ||
                "El asistente no está disponible en este momento.",
              created_at: new Date().toISOString(),
              status: "error",
              lastQuery: text,
            },
          ]);
        } else if (data) {
          const status = detectStatus(data);
          setMessages((prev) => [...prev, { ...data, status }]);
          setLastFailedQuery("");
        }
      } catch {
        setLastFailedQuery(text);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            conversation_id: conversationId,
            role: "assistant",
            content:
              "No se ha podido conectar con el asistente. Comprueba tu conexión.",
            created_at: new Date().toISOString(),
            status: "error",
          },
        ]);
      } finally {
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setIsLoading(false);
        setIsSlowResponse(false);
      }
    },
    [inputQuery, conversationId, isLoading],
  );

  const handleRetry = () => {
    if (lastFailedQuery) handleSend(lastFailedQuery);
  };

  const charsLeft = MAX_CHARS - inputQuery.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Asistente IA Grounded</Text>
        <Text style={styles.disclaimerText}>
          {ASSISTANT_DISCLAIMER}
        </Text>
      </View>

      {/* Chat list */}
      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={{ padding: 16 }}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageContainer,
              msg.role === "user"
                ? styles.userContainer
                : styles.assistantContainer,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? styles.userBubble
                  : msg.status === "error"
                    ? styles.errorBubble
                    : msg.status === "no-results"
                      ? styles.noResultsBubble
                      : styles.assistantBubble,
              ]}
            >
              {/* Indicador de estado para error */}
              {msg.role === "assistant" && msg.status === "error" && (
                <Text style={styles.statusLabel}>⚡ Error de conexión</Text>
              )}
              {/* Indicador de sin resultados */}
              {msg.role === "assistant" && msg.status === "no-results" && (
                <Text style={styles.statusLabelNeutral}>
                  🔍 Sin resultados en base de datos
                </Text>
              )}
              {/* Indicador de resultados parciales */}
              {msg.role === "assistant" && msg.status === "partial" && (
                <Text style={styles.statusLabelPartial}>
                  ✨ Resultados parciales (por palabras clave)
                </Text>
              )}

              <Text
                style={[
                  styles.messageText,
                  msg.role === "user" ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>

              {/* Badge Demo / Verified / Fallback */}
              {msg.role === "assistant" && msg.is_demo !== undefined && (
                <Text
                  style={[
                    styles.badge,
                    msg.is_demo ? styles.badgeDemo : styles.badgeVerified,
                  ]}
                >
                  {msg.is_demo
                    ? "⚠️ Contenido Demo / Draft"
                    : "✅ Verificado por Trami"}
                </Text>
              )}
              {msg.role === "assistant" && msg.status === "fallback" && (
                <Text style={styles.badgeFallback}>
                  🗄️ Respuesta desde base de datos local
                </Text>
              )}

              {/* Botón Reintentar si hay error */}
              {msg.role === "assistant" &&
                msg.status === "error" &&
                lastFailedQuery !== "" && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}
                    disabled={isLoading}
                  >
                    <Text style={styles.retryText}>↺ Reintentar</Text>
                  </TouchableOpacity>
                )}

              {/* Referenced Procedures */}
              {msg.referenced_procedures &&
                msg.referenced_procedures.length > 0 && (
                  <View style={styles.proceduresBox}>
                    <Text style={styles.boxTitle}>Trámites relacionados:</Text>
                    {msg.referenced_procedures.map((proc) => (
                      <Link
                        key={proc.id}
                        href={`/procedure/${proc.slug}`}
                        asChild
                      >
                        <TouchableOpacity style={styles.procLink}>
                          <Text style={styles.procTitle}>{proc.title} ↗</Text>
                        </TouchableOpacity>
                      </Link>
                    ))}
                  </View>
                )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <View style={styles.sourcesBox}>
                  <Text style={styles.boxTitle}>Fuentes oficiales:</Text>
                  {msg.sources.map((src, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => Linking.openURL(src.url)}
                    >
                      <Text style={styles.sourceUrl}>{src.title} 🌐</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Disclaimer */}
              {msg.disclaimer && (
                <Text style={styles.disclaimerSubtext}>{msg.disclaimer}</Text>
              )}
            </View>
          </View>
        ))}

        {/* Estado de carga */}
        {isLoading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#2563eb" />
            <View>
              <Text style={styles.loadingText}>
                Consultando base de datos y respondiendo...
              </Text>
              {isSlowResponse && (
                <Text style={styles.loadingSlowText}>
                  El asistente está tardando más de lo esperado...
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputQuery}
            onChangeText={setInputQuery}
            placeholder="Escribe tu consulta sobre un trámite..."
            placeholderTextColor="#94a3b8"
            maxLength={MAX_CHARS}
            accessibilityLabel="Campo de consulta al asistente"
          />
          {inputQuery.length > 0 && (
            <Text
              style={[
                styles.charCounter,
                charsLeft < 50 && styles.charCounterWarning,
              ]}
            >
              {charsLeft}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputQuery.trim() && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!inputQuery.trim() || isLoading}
          accessibilityLabel="Enviar consulta"
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  disclaimerText: { fontSize: 11, color: "#b45309", marginTop: 4, lineHeight: 15 },
  chatArea: { flex: 1 },
  messageContainer: { marginBottom: 12 },
  userContainer: { alignItems: "flex-end" },
  assistantContainer: { alignItems: "flex-start" },
  messageBubble: { maxWidth: "85%", borderRadius: 14, padding: 12 },
  userBubble: { backgroundColor: "#2563eb" },
  assistantBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  errorBubble: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  noResultsBubble: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 6,
  },
  statusLabelNeutral: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 6,
  },
  statusLabelPartial: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#b45309",
    marginBottom: 6,
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: "#ffffff" },
  assistantText: { color: "#1e293b" },
  badge: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeDemo: { backgroundColor: "#fef3c7", color: "#92400e" },
  badgeVerified: { backgroundColor: "#d1fae5", color: "#065f46" },
  badgeFallback: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  retryButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#fee2e2",
    borderRadius: 6,
  },
  retryText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
  proceduresBox: {
    marginTop: 8,
    backgroundColor: "#eff6ff",
    padding: 8,
    borderRadius: 8,
  },
  sourcesBox: {
    marginTop: 6,
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 8,
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 4,
  },
  procLink: { marginVertical: 2 },
  procTitle: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  sourceUrl: {
    fontSize: 12,
    color: "#0284c7",
    textDecorationLine: "underline",
    marginVertical: 2,
  },
  disclaimerSubtext: {
    fontSize: 10,
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: 6,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  loadingText: { fontSize: 12, color: "#64748b" },
  loadingSlowText: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 8,
  },
  inputWrapper: { flex: 1, position: "relative" },
  input: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 36,
    fontSize: 14,
    color: "#0f172a",
  },
  charCounter: {
    position: "absolute",
    right: 8,
    bottom: 6,
    fontSize: 10,
    fontFamily: "monospace",
    color: "#94a3b8",
  },
  charCounterWarning: { color: "#ef4444" },
  sendButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#94a3b8" },
  sendButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
});
