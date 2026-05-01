"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sanitizarTexto } from "@/lib/agent/sanitizer";

/* ============================================================
   AIChat — Componente público (sin login)
   - Conversación con el Agente IA de RC Repuestos
   - Cuando el flujo está listo, renderiza un CTA hacia WhatsApp
     con el pedido estructurado ya redactado.
   ============================================================ */

// Número de WhatsApp del negocio.
// Se configura con la variable de entorno NEXT_PUBLIC_WHATSAPP_NUMBER en .env.local
// Para Argentina: 549 + código de área sin 0 + número sin 15 (ej: 5493511234567)
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "549XXXXXXXXX";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

interface ApiResponse {
  reply: string;
  /** true cuando la IA detecta que el pedido está listo para cerrar por WA */
  ready?: boolean;
  /** resumen ya armado por el backend (opcional, override del cliente) */
  summary?: string;
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy la IA de RC Repuestos 🛠️ Contame qué necesitás: marca, modelo, año del auto y qué pieza buscás. Te armo el pedido en segundos.",
  createdAt: Date.now(),
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Construye el mensaje que se inyecta en el link de WhatsApp.
 *
 * Política (post-bug 2):
 *  - PRIORIDAD 1: si el backend mandó `summary` (típicamente el contenido del
 *    tag <PEDIDO_LISTO> ya formateado), usar ESO. Es lo mejor para el dueño.
 *  - PRIORIDAD 2: tomar el ÚLTIMO mensaje del asistente, donde la IA armó
 *    el resumen confirmando marca/modelo/año/pieza/atributos.
 *  - NUNCA inyectar el historial crudo del usuario ("sii", "nopp", "el negro").
 *    Esos mensajes solo tienen sentido en el contexto de la conversación.
 *
 *  En ambos casos prefijamos un encabezado fijo para que el dueño entienda
 *  de dónde viene el mensaje.
 */
function buildSummary(messages: Message[]): string {
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.id !== "welcome");

  const cuerpo = sanitizarTexto(lastAssistant?.content ?? "(Pedido sin detalle)");

  return [
    "Hola RC Repuestos!",
    "Confirmo este pedido armado por la IA:",
    "",
    cuerpo,
  ].join("\n");
}

/**
 * Opción Nuclear (frontend, último filtro antes de wa.me):
 *
 * Aunque el sanitizer general ya corre del lado del server (parser) y del
 * cliente (en buildSummary), seguimos viendo casos donde el LLM emite
 * codepoints unicode "exóticos" que esquivan los regex específicos. Acá
 * aplicamos comodines duros sobre los labels más afectados (*Piezas:*,
 * *Pieza...:*) y un sweep final de balas perdidas. Es deliberadamente
 * agresivo: preferimos reescribir de más el label antes que dejar pasar
 * una variante rota al payload de WhatsApp.
 *
 * Ojo: estos replace SOLO se aplican al string que termina en wa.me, no
 * al render del chat, así que no afectan la UX en pantalla.
 */
function aplicarOpcionNuclear(input: string): string {
  let out = input;

  // Wildcards sobre el label de Piezas — cualquier cosa entre *P...zas:*
  // o *Pieza...:* se colapsa al label canónico, sin importar qué glyph
  // unicode haya metido el modelo en el medio.
  out = out.replace(/\*P.*?zas:\*/gi, "*Piezas:*");
  out = out.replace(/\*Pieza.*?:\*/gi, "*Piezas:*");

  // Sweep final de balas perdidas que pudieron haberse colado.
  out = out.replace(/[•·▪▫◦►➤★]/g, "");

  return out;
}

function buildWhatsAppLink(summary: string): string {
  const finalWAtext = aplicarOpcionNuclear(summary);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(finalWAtext)}`;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [serverSummary, setServerSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(messages.length);

  // Autoscroll al fondo SOLO cuando se agrega un mensaje nuevo.
  // En el mount inicial no hacemos nada: la página tiene que cargar arriba
  // de todo y no robarle el scroll al usuario. Solo disparamos cuando la
  // longitud del array de mensajes crece respecto al render anterior.
  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    const currLen = messages.length;
    prevMessagesLengthRef.current = currLen;

    if (currLen <= prevLen) return; // mount inicial o reset, no scrollear
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const summary = useMemo(
    () => serverSummary ?? buildSummary(messages),
    [serverSummary, messages]
  );

  const whatsappHref = useMemo(() => buildWhatsAppLink(summary), [summary]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ApiResponse;

      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: data.reply,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.ready) setReady(true);
      if (data.summary) setServerSummary(data.summary);
    } catch (err) {
      console.error(err);
      setError(
        "Ups, no pude responder ahora. Probá de nuevo o cerrá el pedido por WhatsApp."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmReady() {
    setReady(true);
  }

  function handleReset() {
    setMessages([INITIAL_MESSAGE]);
    setReady(false);
    setServerSummary(null);
    setError(null);
    setInput("");
  }

  return (
    <div
      id="chat"
      className="relative w-full max-w-3xl mx-auto rounded-3xl glass shadow-[0_30px_80px_-30px_rgba(255,94,44,0.35)] overflow-hidden"
    >
      {/* Header del chat */}
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/60 bg-white/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-accent-400 grid place-items-center text-white text-lg shadow-md">
              🤖
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-mint-500 ring-2 ring-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              IA de RC Repuestos
            </p>
            <p className="text-xs text-foreground/60">
              En línea · Respuesta inmediata
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="text-xs px-3 py-1.5 rounded-full bg-white/70 hover:bg-white border border-white/80 text-foreground/70 hover:text-foreground transition"
        >
          Nuevo pedido
        </button>
      </header>

      {/* Lista de mensajes */}
      <div
        ref={scrollRef}
        className="nice-scroll px-4 sm:px-6 py-6 h-[460px] overflow-y-auto flex flex-col gap-3 bg-gradient-to-b from-white/30 to-white/10"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {loading && <TypingBubble />}

        {error && (
          <div className="self-center text-xs px-3 py-2 rounded-full bg-red-100/80 text-red-700 border border-red-200">
            {error}
          </div>
        )}
      </div>

      {/* CTA WhatsApp + Input */}
      <div className="border-t border-white/60 bg-white/40 px-4 sm:px-6 py-4">
        {ready ? (
          <ReadyToCheckout href={whatsappHref} />
        ) : (
          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: Necesito paragolpes delantero VW Gol Trend 2015..."
              className="flex-1 rounded-2xl bg-white/90 border border-white/90 px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-brand-300/60 focus:border-brand-300 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-2xl px-4 py-3 bg-gradient-to-br from-brand-400 to-brand-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Enviar
            </button>
          </form>
        )}

        {!ready && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-foreground/50">
            <span>
              Sin registro · 100% gratis · Cerrás por WhatsApp con el dueño
            </span>
            <button
              type="button"
              onClick={handleConfirmReady}
              className="underline underline-offset-2 hover:text-foreground/80"
            >
              Ya está listo, ir a WhatsApp {" ->"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Subcomponentes -------------------- */

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-[fadeIn_.25s_ease-out]`}
    >
      <div
        className={[
          "max-w-[82%] sm:max-w-[75%] px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
          isUser
            ? "bg-gradient-to-br from-brand-500 to-brand-400 text-white rounded-3xl rounded-br-md"
            : "bg-white/90 text-foreground rounded-3xl rounded-bl-md border border-white",
        ].join(" ")}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 bg-white/90 rounded-3xl rounded-bl-md border border-white px-4 py-3 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 dot-blink" />
        <span
          className="w-1.5 h-1.5 rounded-full bg-brand-400 dot-blink"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-brand-400 dot-blink"
          style={{ animationDelay: "0.3s" }}
        />
      </div>
    </div>
  );
}

function ReadyToCheckout({ href }: { href: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/80">
        🎉 <strong>¡Tu pedido está listo!</strong> Te llevamos a WhatsApp con el
        resumen ya escrito. Solo apretá <em>enviar</em>.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-center gap-2 w-full rounded-2xl px-5 py-4 bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white font-semibold shadow-lg hover:shadow-xl hover:brightness-105 transition"
      >
        <WhatsAppIcon className="w-5 h-5" />
        Cerrar pedido por WhatsApp
        <span
          className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
          aria-hidden="true"
        >
          {" ->"}
        </span>
      </a>
    </div>
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.81 11.81 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.554-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24z
m6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.515 5.276l-.999 3.648 3.973-1.043z
m11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.301-1.438.263-.355.35-.595.246-.819-.104-.224-.272-.297-.57-.347z"
      />
    </svg>
  );
}
