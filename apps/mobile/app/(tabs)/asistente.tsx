import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  useWindowDimensions,
  type ListRenderItemInfo,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authService, assistantService, AssistantChatMessage, ASSISTANT_DISCLAIMER } from "@trami-espana/shared";
import { useTheme, ThemeColors } from "../../constants/theme";

const MAX_CHARS = 1000;
const SLOW_THRESHOLD_MS = 6000;
const MAX_INPUT_HEIGHT = 120;
const MIN_INPUT_HEIGHT = 44;

type MessageStatus = "normal" | "partial" | "no-results" | "fallback" | "error" | "greeting";

interface EnhancedMessage extends AssistantChatMessage {
  status?: MessageStatus;
  lastQuery?: string;
  isGreeting?: boolean;
}

// ============================================================
// FASE 3 — Key extractor a nivel de módulo: identidad fija, no se
// recrea en cada render del padre (requisito del FlatList PureComponent).
// ============================================================
const chatKeyExtractor = (msg: EnhancedMessage): string => msg.id;

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

/**
 * Detecta si el mensaje es un saludo PURO, es decir, sin ninguna petición
 * concreta. Si el usuario escribe "Hola, soy Miguel y quiero renovar el
 * DNI", NO es un saludo puro: es una consulta que debe procesarse de
 * inmediato contra el motor de IA.
 */
function isGreeting(query: string): boolean {
  const greetings = [
    "hola", "buenos dias", "buenas tardes", "buenas noches", "buenas",
    "saludos", "hey", "que tal", "como estas", "hi", "hello",
    "gracias", "gracias por todo", "muchas gracias", "agradecido", "agradecida",
    "gracias por la ayuda", "muchas gracias por la ayuda"
  ];
  const normalized = query.toLowerCase().trim();
  // Elimina la puntuación para no fallar con "Hola!" o "¿Qué tal?".
  const clean = normalized.replace(/[¿?¡!.,;]/g, " ").replace(/\s+/g, " ").trim();
  const isPureGreeting = greetings.some(
    (g) => clean === g || clean.startsWith(`${g} `) || clean.endsWith(` ${g}`),
  );
  // Un saludo acompañado de contenido NO debe tratarse como saludo: si hay
  // más de 3 palabras, hay una consulta real que procesar.
  const wordCount = clean.split(" ").filter(Boolean).length;
  return isPureGreeting && wordCount <= 3;
}

// Generate a friendly greeting response
function getGreetingResponse(query: string): string {
  const normalized = query.toLowerCase().trim();
  
  // Check for gratitude
  if (normalized.includes("gracias") || normalized.includes("agradecid")) {
    return "¡De nada! 😊 Me alegra poder ayudarte. Si tienes alguna consulta sobre trámites administrativos españoles, no dudes en preguntarme. ¿Hay algún trámite específico del que quieras saber más?";
  }
  
  // General greeting



  return "¡Hola! 👋 Gracias por escribirme. Estoy aquí para ayudarte con cualquier consulta sobre trámites administrativos en España. Puedes preguntarme sobre trámites como renovar el DNI, empadronamiento, citas previas, prestaciones, y mucho más. ¿En qué puedo ayudarte hoy?";
}

/**
 * Flujo directo: detecta si el usuario indica su nombre y el trámite que
 * desea gestionar en un único mensaje.
 *
 * Ejemplos que SÍ aplican:
 *   "Hola, me llamo Ana y quiero renovar el DNI"
 *   "Me llamo Luis, necesito cita previa para el paro"
 *   "Soy Marta y quiero saber cómo empadronarme"
 *
 * Devuelve la porción del mensaje relativa al trámite para responder de
 * inmediato con la guía/pasos sin volver a preguntar qué trámite desea.
 */
function extractDirectProcedureQuery(query: string): string | null {
  const normalized = query.trim();
  const match = normalized.match(
    /(?:me llamo|soy|mi nombre es)\s+[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s.]{2,40}?(?:\s+y\s+|\s*[,;:]+\s*|\s+)(?:quiero|necesito|me gustaría|me gustaria|quisiera|me interesa|quería|queria|deseo)\s+([\s\S]+)/i
  );
  if (!match) return null;

  const procedure = match[1]?.trim() || match[match.length - 1]?.trim();
  if (!procedure || procedure.length < 4 || procedure.length > 500) return null;

  // Evita peticiones de cortesía vacías sin un trámite concreto.
  const junk = /^(ayuda|informaci[oó]n|saber|preguntar|hablar|consultar|saber más|más información)\s*[.!?¿?]*$/i;
  if (junk.test(procedure)) return null;

  return procedure;
}

// ============================================================
// FASE 3 — Burbuja de chat memoizada (React.memo).
// Cada mensaje es un componente independiente: mientras el usuario
// escribe en el input, las burbujas ya montadas NO se repintan
// (sus props —msg, styles, isLoading, lastFailedQuery, onRetry—
// mantienen identidad estable gracias a useMemo/useCallback en el
// padre). Solo se redibuja la celda a la que llega un mensaje nuevo.
// ============================================================
interface ChatBubbleProps {
  msg: EnhancedMessage;
  styles: ReturnType<typeof getStyles>;
  isLoading: boolean;
  lastFailedQuery: string;
  onRetry: () => void;
}

const ChatBubble = memo(function ChatBubble({
  msg,
  styles,
  isLoading,
  lastFailedQuery,
  onRetry,
}: ChatBubbleProps) {
  return (
    <View
      style={[
        styles.messageContainer,
        msg.role === "user" ? styles.userContainer : styles.assistantContainer,
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
              onPress={onRetry}
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
                <Link key={proc.id} href={`/procedure/${proc.slug}`} asChild>
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
  );
});

export default function AssistantScreen() {
  const { colors, isDark } = useTheme();
  // FASE 3 — estilos memoizados: identidad estable para que los hijos
  // envueltos en React.memo no se repinten sin cambios reales.
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  // ============================================================
  // FASE 1 — Edge-to-edge. `useSafeAreaInsets()` sustituye a los
  // valores fijos (48/28/12 px) que antes chocaban con la muesca de
  // cámara y con la barra de gestos en Android 14/15 y HyperOS.
  // `useWindowDimensions()` es reactivo: al plegar/desplegar el
  // teclado o rotar, el límite de altura del input se recalcula sin
  // dejar un `Dimensions.get('window')` congelado en el montaje.
  // ============================================================
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowResponse, setIsSlowResponse] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<FlatList<EnhancedMessage>>(null);
  const router = useRouter();

  const init = useCallback(async () => {
    let currentUser = null;
    let isNetworkIssue = false;

    try {
      currentUser = await authService.getCurrentUser();
    } catch (err) {
      // Si falla por red, comprobamos la sesión local en caché
      try {
        const session = await authService.getSession();
        currentUser = session?.user ?? null;
      } catch {
        currentUser = null;
      }
      const errMsg = err instanceof Error ? err.message : "";
      isNetworkIssue = /network|offline|failed to fetch|timeout|connection/i.test(
        errMsg,
      );
    }

    if (!currentUser && !isNetworkIssue) {
      router.replace("/login");
      return;
    }

    if (isNetworkIssue) {
      setIsOffline(true);
    }

    try {
      const { data } =
        await assistantService.createConversation("Asistente Mobile");
      const convId = data?.id || `conv-local-${Date.now()}`;
      setConversationId(convId);
      
      // Set initial greeting message
      setMessages([
        {
          id: "welcome-mobile",
          conversation_id: convId,
          role: "assistant",
          content: "¡Hola! Soy el Asistente IA de Trami España. ¿En qué trámite administrativo necesitas ayuda hoy?",
          created_at: new Date().toISOString(),
          isGreeting: true,
          status: "greeting",
        },
      ]);
    } catch {
      setIsOffline(true);
      const convId = `conv-local-${Date.now()}`;
      setConversationId(convId);
      setMessages([
        {
          id: "welcome-mobile",
          conversation_id: convId,
          role: "assistant",
          content: "¡Hola! Soy el Asistente IA de Trami España. ¿En qué trámite administrativo necesitas ayuda hoy?",
          created_at: new Date().toISOString(),
          isGreeting: true,
          status: "greeting",
        },
      ]);
    }
  }, [router]);

  useEffect(() => {
    init();
  }, [init]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const scrollTimer = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      return () => clearTimeout(scrollTimer);
    }
  }, [messages]);

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

      // Flujo directo v1.3.1: si el PRIMER mensaje ya es una consulta con
      // contenido real (p. ej. "Hola, soy Miguel y quiero renovar el DNI"),
      // se descarta el saludo precargado y se responde de inmediato con la
      // guía. Antes había que repetir el mensaje porque el bot saludaba.
      const isFirstRealQuery = !messages.some((m) => m.role === "user");
      const directQuery = extractDirectProcedureQuery(text);
      // `shouldDropWelcome` solo cuando el mensaje NO es un saludo puro:
      // si el usuario escribe "hola" sí queremos conservar el saludo.
      const shouldDropWelcome = isFirstRealQuery && !isGreeting(text);

      setMessages((prev) => {
        const base = shouldDropWelcome
          ? prev.filter((m) => !m.isGreeting)
          : prev;
        return [...base, userMsg];
      });

      if (!textOverride) setInputQuery("");
      setIsLoading(true);
      setIsSlowResponse(false);

      slowTimerRef.current = setTimeout(
        () => setIsSlowResponse(true),
        SLOW_THRESHOLD_MS,
      );

      try {
        let response;

        // Handle greetings gracefully without triggering error
        if (directQuery) {
          // La consulta ya incluye el trámite concreto: devolver la guía directa.
          response = await assistantService.ask(directQuery, conversationId);
        } else if (isGreeting(text)) {
          const greetingContent = getGreetingResponse(text);
          response = {
            data: {
              id: `msg-${Date.now()}`,
              conversation_id: conversationId,
              role: "assistant" as const,
              content: greetingContent,
              created_at: new Date().toISOString(),
              is_fallback: true,
              result_type: "relevant" as const,
            } as AssistantChatMessage,
            error: null,
          };
        } else {
          response = await assistantService.ask(text, conversationId);
        }
        
        if (response.error) {
          const isNet =
            /conexión|internet|network|offline|failed to fetch|connection/i.test(
              response.error.message,
            );
          if (isNet) setIsOffline(true);
          setLastFailedQuery(text);
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              conversation_id: conversationId,
              role: "assistant",
              content:
                response.error?.message ||
                "No se ha podido conectar con el asistente. Comprueba tu conexión a internet.",
              created_at: new Date().toISOString(),
              status: "error",
              lastQuery: text,
            },
          ]);
        } else if (response.data) {
          setIsOffline(false);
          const isGreetingResponse = isGreeting(text);
          const status = isGreetingResponse ? "greeting" : detectStatus(response.data);
          const enhancedMsg: EnhancedMessage = { ...response.data, status, isGreeting: isGreetingResponse };
          setMessages((prev) => [...prev, enhancedMsg]);
          setLastFailedQuery("");
        }
      } catch {
        setIsOffline(true);
        setLastFailedQuery(text);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            conversation_id: conversationId,
            role: "assistant",
            content:
              "No se ha podido conectar con el asistente. Comprueba tu conexión a internet e inténtalo de nuevo.",
            created_at: new Date().toISOString(),
            status: "error",
            lastQuery: text,
          },
        ]);
      } finally {
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setIsLoading(false);
        setIsSlowResponse(false);
      }
    },
    [inputQuery, conversationId, isLoading, messages],
  );

  const handleRetry = useCallback(() => {
    setIsOffline(false);
    if (lastFailedQuery) {
      handleSend(lastFailedQuery);
    } else {
      init();
    }
  }, [handleSend, lastFailedQuery, init]);

  // FASE 3 — callback de reintento con identidad ESTABLE: `handleRetry`
  // cambia en cada pulsación de tecla (depende de `handleSend`, y esa
  // depende de `inputQuery`), lo que re-renderizaría todas las burbujas
  // memoizadas. Este envoltorio delega vía ref y solo se crea una vez.
  const handleRetryRef = useRef(handleRetry);
  handleRetryRef.current = handleRetry;
  const handleRetryStable = useCallback(() => handleRetryRef.current(), []);

  const charsLeft = MAX_CHARS - inputQuery.length;

  // ============================================================
  // FASE 1 — Techo adaptativo del campo multilínea. Nunca puede
  // superar MAX_INPUT_HEIGHT (120 px) ni el 22 % de la ventana: en
  // horizontal o en un móvil de 5", el input no debe tapar el chat.
  // ============================================================
  const maxInputHeight = Math.min(MAX_INPUT_HEIGHT, windowHeight * 0.22);

  // ============================================================
  // FASE 3 — Virtualización agresiva del chat.
  // `renderMessage` solo cambia de identidad cuando cambian las props
  // reales de las burbujas; combinado con React.memo en ChatBubble,
  // escribir en el input NO repinta el historial: solo se redibuja la
  // celda que recibe el mensaje nuevo. `onContentSizeChange` y el
  // footer de carga también van memoizados para que el FlatList
  // (PureComponent) no se re-renderice en cada pulsación de tecla.
  // ============================================================
  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<EnhancedMessage>) => (
      <ChatBubble
        msg={item}
        styles={styles}
        isLoading={isLoading}
        lastFailedQuery={lastFailedQuery}
        onRetry={handleRetryStable}
      />
    ),
    [styles, isLoading, lastFailedQuery, handleRetryStable],
  );

  const handleChatContentSizeChange = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const chatListFooter = useMemo(
    () =>
      isLoading ? (
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
      ) : null,
    [isLoading, isSlowResponse, styles],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      // ============================================================
      // v1.4.1 — CORRECCION DEL TECLADO EN ANDROID
      // El manifiesto ya declara android:windowSoftInputMode="adjustResize",
      // asi que Android YA encoge la ventana cuando aparece el teclado. Aplicar
      // aqui behavior="height" resta la altura del teclado una SEGUNDA vez y, como
      // KeyboardAvoidingView.read _relativeKeyboardHeight() vuelve a sumar
      // this.state.bottom en cada onLayout, el contenedor oscila hacia abajo
      // hasta aplastar la barra de escritura (medido: 14 px en vez de ~187 px)
      // y a ocultarla bajo la barra de pestanas opaca.
      //
      // En Android no hay que compensar nada (lo hace adjustResize), asi que
      // `behavior` queda en `undefined` y el componente es un <View> normal.
      // En iOS el teclado flota sobre la app y si hace falta `padding`.
      // Es el mismo patron que ya usan login/registro/recuperar-contrasena.
      //
      // `keyboardVerticalOffset` es 0 porque `tabBarHideOnKeyboard` (ver
      // app/(tabs)/_layout.tsx) oculta la barra de pestanas al escribir, de
      // modo que ya no hay altura de tab bar que compensar.
      // ============================================================
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header — `paddingTop` inyectado desde `insets.top` para no
          solaparse con la muesca de cámara ni con la barra de estado
          en dispositivos con Punch-hole / Dynamic Island. */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={24} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Asistente IA</Text>
            <Text style={styles.headerSubtitle}>Trami España</Text>
          </View>
        </View>
        <Text style={styles.disclaimerText}>
          {ASSISTANT_DISCLAIMER}
        </Text>
      </View>

      {/* Offline Warning Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#92400e" />
          <View style={styles.offlineTextContainer}>
            <Text style={styles.offlineTitle}>Problemas de conexión a internet</Text>
            <Text style={styles.offlineSubtitle}>
              Las respuestas y búsquedas de trámites requieren conexión activa.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.offlineRetryBtn}
            onPress={handleRetry}
            disabled={isLoading}
          >
            <Text style={styles.offlineRetryText}>Reconectar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================
          FASE 3 — Chat list virtualizado con FlatList.
          · removeClippedSubviews (solo Android): descarga de memoria
            las celdas fuera de pantalla (limpieza en tiempo real).
          · initialNumToRender=10 / maxToRenderPerBatch=5: renderiza
            por lotes pequeños para no saturar el hilo de UI en
            dispositivos con poca RAM.
          · renderItem/keyExtractor/onContentSizeChange memoizados:
            el PureComponent del FlatList no se re-renderiza mientras
            el usuario teclea en el input.
          ============================================================ */}
      <FlatList
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        data={messages}
        keyExtractor={chatKeyExtractor}
        renderItem={renderMessage}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={handleChatContentSizeChange}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        ListFooterComponent={chatListFooter}
      />

      {/* Input Bar — `paddingBottom: Math.max(insets.bottom, 12)` mantiene
          el campo por encima de la barra de gestos (Android 14/15, HyperOS)
          y añade 12 px de aire en dispositivos sin barra inferior. */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                {
                  // El tope se relativiza a la ventana en vez de fijar 120 px:
                  // en un móvil pequeño o en horizontal el input no debe
                  // comerse el chat. `useWindowDimensions` mantiene el valor
                  // sincronizado con rotación y teclado.
                  height: Math.min(
                    Math.max(MIN_INPUT_HEIGHT, inputHeight),
                    Math.max(MIN_INPUT_HEIGHT, maxInputHeight),
                  ),
                },
              ]}
              value={inputQuery}
              onChangeText={setInputQuery}
              onContentSizeChange={(e) => {
                setInputHeight(e.nativeEvent.contentSize.height);
              }}
              placeholder="Escribe..."
              placeholderTextColor="#94a3b8"
              maxLength={MAX_CHARS}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
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
              (!inputQuery.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputQuery.trim() || isLoading}
            accessibilityLabel="Enviar consulta"
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="send" size={22} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  header: {
    // `paddingTop` NO va aquí: se inyecta desde `insets.top` en el JSX
    // (un 48 px fijo se solapaba con la muesca en pantallas de 2340 px).
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  disclaimerText: { fontSize: 11, color: colors.warningText, marginTop: 4, lineHeight: 15 },
  // ============================================================
  // FASE 1 — El contenedor del chat debe poder ENCOGER. Sin
  // `minHeight: 0` + `flexShrink: 1`, el `flex: 1` de Yoga calcula la
  // altura a partir del contenido y la lista no cede espacio
  // cuando el teclado se despliega: en pantallas AMOLED de 120/144 Hz
  // el layout vibra y la barra de escritura se aplasta.
  // ============================================================
  chatArea: { flex: 1, minHeight: 0, flexShrink: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },
  messageContainer: { marginBottom: 12 },
  userContainer: { alignItems: "flex-end" },
  assistantContainer: { alignItems: "flex-start" },
  messageBubble: { maxWidth: "88%", borderRadius: 16, padding: 14 },
  userBubble: { backgroundColor: colors.primary },
  assistantBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBubble: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  noResultsBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.danger,
    marginBottom: 6,
  },
  statusLabelNeutral: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statusLabelPartial: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.warningText,
    marginBottom: 6,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#ffffff" },
  assistantText: { color: colors.text },
  badge: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeDemo: { backgroundColor: colors.warningBackground, color: colors.warningText },
  badgeVerified: { backgroundColor: colors.successBackground, color: colors.successText },
  badgeFallback: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.chip,
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
  },
  retryText: { fontSize: 13, fontWeight: "600", color: colors.danger },
  proceduresBox: {
    marginTop: 10,
    backgroundColor: colors.primarySoft,
    padding: 10,
    borderRadius: 10,
  },
  sourcesBox: {
    marginTop: 8,
    backgroundColor: colors.chip,
    padding: 10,
    borderRadius: 10,
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  procLink: { marginVertical: 3 },
  procTitle: { fontSize: 13, fontWeight: "600", color: colors.primary },
  sourceUrl: {
    fontSize: 13,
    color: colors.primary,
    textDecorationLine: "underline",
    marginVertical: 2,
  },
  disclaimerSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 8,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: { fontSize: 13, color: colors.textSecondary },
  loadingSlowText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  inputContainer: {
    flexDirection: "row",
    // La barra de escritura NUNCA debe comprimirse: si el contenedor padre
    // encoge (teclado, barra de pestanas, orientacion), el flexShrink por
    // defecto de Yoga aplasta este View y el campo de texto queda tapado.
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    // `paddingBottom` se inyecta desde `Math.max(insets.bottom, 12)` en el
    // JSX: aquí solo queda el valor de respaldo para el primer render.
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
    alignItems: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  inputWrapper: { flex: 1, position: "relative" },
  input: {
    backgroundColor: colors.chip,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 50,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    textAlignVertical: "center",
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  charCounter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    fontSize: 11,
    fontFamily: "monospace",
    color: colors.textMuted,
  },
  charCounterWarning: { color: colors.danger },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: { backgroundColor: colors.textMuted, shadowOpacity: 0 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.warningBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  offlineIcon: {
    fontSize: 20,
  },
  offlineTextContainer: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.warningText,
  },
  offlineSubtitle: {
    fontSize: 11,
    color: colors.warningText,
    marginTop: 2,
  },
  offlineRetryBtn: {
    backgroundColor: colors.warningBackground,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  offlineRetryText: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.warningText,
  },
  // Avatar styles
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarGreeting: {
    backgroundColor: "#7c3aed",
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  // Greeting bubble
  greetingBubble: {
    backgroundColor: isDark ? "#1e1b4b" : "#f5f3ff",
    borderWidth: 1,
    borderColor: isDark ? "#3730a3" : "#ddd6fe",
  },
  greetingText: {
    color: isDark ? "#a78bfa" : "#4c1d95",
    fontStyle: "italic",
  },
});
