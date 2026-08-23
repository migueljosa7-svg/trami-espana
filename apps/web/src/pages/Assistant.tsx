import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bot,
  Send,
  User,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Loader2,
  FileText,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Database,
  SearchX,
  WifiOff,
} from "lucide-react";
import {
  assistantService,
  AssistantChatMessage,
  analyticsService,
  Procedure,
  ASSISTANT_DISCLAIMER,
} from "@trami-espana/shared";
import { useAuth } from "../contexts/AuthContext";

const QUICK_SUGGESTIONS = [
  "Quiero renovar el DNI",
  "Me he quedado sin trabajo",
  "Necesito empadronarme",
  "Quiero consultar mi vida laboral",
  "Necesito renovar mi NIE",
  "Quiero solicitar el Ingreso Mínimo Vital",
];

const MAX_CHARS = 500;
const SLOW_RESPONSE_THRESHOLD_MS = 6000;

type MessageStatus = "normal" | "partial" | "no-results" | "fallback" | "error";

interface EnhancedChatMessage extends AssistantChatMessage {
  status?: MessageStatus;
  lastQuery?: string;
}

function detectMessageStatus(msg: AssistantChatMessage): MessageStatus {
  if (!msg.content) return "error";
  const content = msg.content.toLowerCase();

  // Fallback local: la Edge Function marca is_fallback=true de forma fiable.
  if (msg.is_fallback === true) {
    return "fallback";
  }

  // Diferenciación de la calidad del grounding (campo compatible de Fase 7).
  if (msg.result_type) {
    if (msg.result_type === "no-results") return "no-results";
    if (msg.result_type === "partial") return "partial";
    // 'relevant' -> normal
    return "normal";
  }

  // Fallbacks heurísticos para respuestas que no incluyen result_type
  // (compatibilidad con respuestas anteriores).
  const noProcedures = msg.referenced_procedures?.length === 0;
  const noSources = !msg.sources || msg.sources.length === 0;

  // Sin resultados
  if (
    noProcedures &&
    noSources &&
    (content.includes("no he encontrado") || content.includes("no puedo confirmarlo"))
  ) {
    return "no-results";
  }
  // Señal secundaria de fallback: sin sources pero con procedimientos.
  if (noSources && msg.referenced_procedures && msg.referenced_procedures.length > 0) {
    return "partial";
  }
  return "normal";
}

export default function Assistant() {
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowResponse, setIsSlowResponse] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/asistente" } } });
      return;
    }

    analyticsService.trackPageView("/asistente", "Asistente de Trámites IA");

    const initConv = async () => {
      const { data } = await assistantService.createConversation("Asistente Virtual");
      if (data) {
        setConversationId(data.id);
        // Solo mostrar el saludo si aún no hay mensajes. Evita que la
        // inicialización asíncrona (o el doble montaje de React StrictMode)
        // sobrescriba el historial que el usuario ya haya empezado.
        setMessages((prev) =>
          prev.length === 0
            ? [
                {
                  id: "welcome-msg",
                  conversation_id: data.id,
                  role: "assistant",
                  content:
                    "¡Hola! Soy tu asistente de orientación administrativa para España.\n\n¿En qué trámite necesitas ayuda hoy? Puedes hacerme cualquier pregunta o seleccionar una de las sugerencias rápidas.",
                  disclaimer:
                    "Trami España es un servicio independiente y no está afiliado con ninguna administración pública.",
                  created_at: new Date().toISOString(),
                  status: "normal" as const,
                },
              ]
            : prev
        );
      }
    };
            initConv();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || inputQuery).trim();
      if (!query || isLoading) return;

      analyticsService.trackAssistantQuery(query);

      const userMsg: EnhancedChatMessage = {
        id: `user-${Date.now()}`,
        conversation_id: conversationId,
        role: "user",
        content: query,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputQuery("");
      setIsLoading(true);
      setIsSlowResponse(false);

      // Activar indicador de respuesta lenta
      slowTimerRef.current = setTimeout(() => {
        setIsSlowResponse(true);
      }, SLOW_RESPONSE_THRESHOLD_MS);

      try {
        const { data, error } = await assistantService.ask(query, conversationId);

        if (error) {
          setLastFailedQuery(query);
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              conversation_id: conversationId,
              role: "assistant",
              content: error.message || "El asistente no está disponible en este momento.",
              created_at: new Date().toISOString(),
              status: "error",
              lastQuery: query,
            },
          ]);
        } else if (data) {
          const status = detectMessageStatus(data);
          setMessages((prev) => [...prev, { ...data, status }]);
          setLastFailedQuery("");
        }
      } catch {
        setLastFailedQuery(query);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            conversation_id: conversationId,
            role: "assistant",
            content:
              "No se ha podido conectar con el asistente. Comprueba tu conexión e inténtalo de nuevo.",
            created_at: new Date().toISOString(),
            status: "error",
            lastQuery: query,
          },
        ]);
      } finally {
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setIsLoading(false);
        setIsSlowResponse(false);
      }
    },
    [inputQuery, conversationId, isLoading]
  );

  const handleRetry = () => {
    if (lastFailedQuery) {
      handleSendMessage(lastFailedQuery);
    }
  };

  const charsLeft = MAX_CHARS - inputQuery.length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col">
        {/* Header Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Asistente de Trámites Administrativos (IA)
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Grounded IA
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Respuestas fundamentadas exclusivamente en información oficial almacenada en nuestra
                base de datos.
              </p>
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="whitespace-pre-line">
              <strong>Nota legal importante:</strong> {ASSISTANT_DISCLAIMER}
            </span>
          </div>
        </div>

        {/* Quick suggestions */}
        {messages.length <= 1 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Consultas frecuentes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  id={`suggestion-${suggestion.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => handleSendMessage(suggestion)}
                  className="text-left px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm text-sm text-slate-700 hover:text-blue-700 transition flex items-center justify-between group"
                  disabled={isLoading}
                >
                  <span>{suggestion}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-[420px] overflow-hidden mb-6">
          <div className="flex-1 p-6 overflow-y-auto space-y-6 max-h-[520px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                  }`}
                  aria-hidden="true"
                >
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className="max-w-[85%] sm:max-w-[75%] space-y-3">
                  {/* Burbuja principal */}
                  <div
                    className={`rounded-2xl p-4 text-sm whitespace-pre-line leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : msg.status === "error"
                          ? "bg-red-50 text-red-800 rounded-tl-none border border-red-200"
                          : msg.status === "no-results"
                            ? "bg-slate-50 text-slate-700 rounded-tl-none border border-slate-200"
                            : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                    }`}
                    role={msg.role === "assistant" ? "status" : undefined}
                  >
                    {/* Icono de estado especial para error y sin resultados */}
                    {msg.role === "assistant" && msg.status === "error" && (
                      <div className="flex items-center gap-2 mb-2 text-red-700 font-medium">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">Error de conexión</span>
                      </div>
                    )}
                    {msg.role === "assistant" && msg.status === "no-results" && (
                      <div className="flex items-center gap-2 mb-2 text-slate-500 font-medium">
                        <SearchX className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">
                          Sin resultados en base de datos
                        </span>
                      </div>
                    )}
                    {msg.role === "assistant" && msg.status === "partial" && (
                      <div className="flex items-center gap-2 mb-2 text-amber-600 font-medium">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">
                          Resultados parciales (por palabras clave)
                        </span>
                      </div>
                    )}
                    {msg.content}
                  </div>

                  {/* Badge de estado: Demo / Verified / Fallback */}
                  {msg.role === "assistant" && msg.is_demo !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs font-medium flex-wrap">
                      {msg.is_demo ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-300 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Contenido de
                          Demostración (Draft)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Información
                          Verificada por Trami
                        </span>
                      )}
                      {msg.status === "fallback" && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-300 flex items-center gap-1">
                          <Database className="w-3 h-3" /> Respuesta desde base de datos local
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botón Reintentar si hubo error */}
                  {msg.role === "assistant" && msg.status === "error" && lastFailedQuery && (
                    <button
                      id="btn-retry-assistant"
                      onClick={handleRetry}
                      disabled={isLoading}
                      aria-label="Reintentar consulta al asistente"
                      className="flex items-center gap-1.5 text-xs text-red-700 hover:text-red-900 font-medium transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reintentar consulta
                    </button>
                  )}

                  {/* Tarjetas de trámites referenciados */}
                  {msg.referenced_procedures && msg.referenced_procedures.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Trámites sugeridos en Trami:
                      </p>
                      {msg.referenced_procedures.map((proc: Procedure) => (
                        <Link
                          key={proc.id}
                          to={`/tramites/${proc.slug}`}
                          className="block p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-700">
                                {proc.title}
                              </h4>
                            </div>
                            <ExternalLink className="w-4 h-4 text-blue-500" />
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {proc.short_description}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Fuentes oficiales */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Fuentes Oficiales:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-blue-600 hover:underline"
                          >
                            <span>{src.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {msg.disclaimer && (
                    <p className="text-[11px] text-slate-500 italic mt-1">{msg.disclaimer}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Estado de carga */}
            {isLoading && (
              <div
                className="flex gap-3 items-start text-slate-500 text-sm"
                role="status"
                aria-live="polite"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-slate-100 rounded-2xl px-4 py-3 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Consultando base de datos oficial y procesando respuesta...</span>
                  </div>
                  {isSlowResponse && (
                    <p className="text-xs text-slate-400 pl-6">
                      El asistente está tardando más de lo esperado. Por favor, espera un momento...
                    </p>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <div className="flex-1 relative">
                <input
                  id="assistant-input"
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Escribe tu duda administrativa (ej. Renovación de DNI, empadronamiento)..."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  maxLength={MAX_CHARS}
                  aria-label="Consulta al asistente de trámites"
                />
                {/* Contador de caracteres */}
                {inputQuery.length > 0 && (
                  <span
                    className={`absolute right-3 bottom-2 text-[10px] font-mono ${
                      charsLeft < 50 ? "text-red-500" : "text-slate-400"
                    }`}
                    aria-live="polite"
                  >
                    {charsLeft}
                  </span>
                )}
              </div>
              <button
                id="btn-send-assistant"
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="px-5 py-3 bg-blue-600 text-white font-medium rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                aria-label="Enviar consulta"
              >
                <span>Enviar</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
