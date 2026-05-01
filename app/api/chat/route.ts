/**
 * route.ts — Endpoint del agente IA con Tool Calling
 *
 * POST /api/chat
 *
 * Flujo:
 *   Browser → este endpoint (servidor Vercel) → Anthropic API
 *                                              ↑
 *                                              └─ tool: consultar_catalogo_infoauto
 *                                                 (ejecutado en este server)
 *
 * La API Key NUNCA llega al browser. Vive solo en las env vars del servidor.
 *
 * Variables de entorno requeridas (.env.local / Vercel Dashboard):
 *   ANTHROPIC_API_KEY  — clave de la API de Anthropic
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { NextResponse } from "next/server";

import { config } from "@/lib/config";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { parseLLMResponse } from "@/lib/agent/message-parser";
import {
  buscarRepuesto,
  precargarCatalogo,
  type ResultadoBusqueda,
} from "@/lib/catalogoService";

// ─────────────────────────────────────────────────────────────
// Runtime y constantes
// ─────────────────────────────────────────────────────────────

export const runtime = "nodejs";

/** Modelo a usar. Haiku es el más rápido y económico de Anthropic. */
const MODEL = "claude-haiku-4-5-20251001";

/**
 * Máximo de mensajes del historial que enviamos al LLM.
 * Controla costos: 30 mensajes ≈ una conversación completa larga.
 */
const MAX_HISTORY_MESSAGES = 30;

/**
 * Tope de iteraciones del loop tool_use → tool_result. En la práctica el
 * agente nunca debería pedir más de 1-2 lookups por turno; este límite es
 * un fusible para evitar bucles infinitos.
 */
const MAX_TOOL_ITERATIONS = 4;

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
}

interface ConsultarCatalogoInput {
  marca?: string;
  modelo?: string;
  anio?: string;
}

// ─────────────────────────────────────────────────────────────
// Definición de la herramienta para Anthropic Tool Calling
// ─────────────────────────────────────────────────────────────

const TOOL_NAME = "consultar_catalogo_infoauto";

const TOOLS: Tool[] = [
  {
    name: TOOL_NAME,
    description:
      "Consulta el catálogo oficial InfoAuto del parque automotor argentino " +
      "para validar si un vehículo (marca, modelo, año) existe y obtener las " +
      "versiones disponibles. Úsala SIEMPRE que el taller mencione un vehículo " +
      "para confirmar que existe antes de seguir armando el pedido. " +
      "Filtros tolerantes: case-insensitive, sin tildes, parciales (ej: 'gol' " +
      "matchea 'GOL TREND'). Devuelve un resumen y las coincidencias acotadas.",
    input_schema: {
      type: "object",
      properties: {
        marca: {
          type: "string",
          description:
            "Marca del vehículo (ej: 'Volkswagen', 'Ford', 'Toyota'). " +
            "Opcional pero MUY recomendado: sin marca el resultado se trunca.",
        },
        modelo: {
          type: "string",
          description:
            "Modelo del vehículo (ej: 'Gol', 'Corolla', 'Hilux'). " +
            "Búsqueda parcial: 'gol' matchea 'GOL TREND', 'GOL COUNTRY', etc.",
        },
        anio: {
          type: "string",
          description:
            "Año del vehículo, formato YYYY (ej: '2015'). Opcional. " +
            "Si se pasa, debe coincidir exactamente.",
        },
      },
      required: [],
    },
  },
];

// ─────────────────────────────────────────────────────────────
// Cliente Anthropic (singleton por módulo en Vercel)
// ─────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY no configurada. Agregala en .env.local (dev) o en Vercel → Settings → Environment Variables (prod)."
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ─────────────────────────────────────────────────────────────
// System prompt (se construye una sola vez y se cachea)
// ─────────────────────────────────────────────────────────────

let _systemPrompt: string | null = null;

function getSystemPrompt(): string {
  if (!_systemPrompt) {
    _systemPrompt = buildSystemPrompt(config);
  }
  return _systemPrompt;
}

// ─────────────────────────────────────────────────────────────
// Ejecutor de la herramienta
// ─────────────────────────────────────────────────────────────

/**
 * Ejecuta `consultar_catalogo_infoauto` con el input que mandó el modelo.
 * Devuelve el JSON serializado que va dentro del `tool_result`.
 *
 * Mantenemos el output compacto (solo `resumen` + `coincidencias` truncadas)
 * para no inflar tokens en la siguiente vuelta del LLM.
 */
function ejecutarHerramienta(
  toolName: string,
  rawInput: unknown
): { content: string; isError: boolean } {
  if (toolName !== TOOL_NAME) {
    return {
      content: JSON.stringify({
        error: `Herramienta desconocida: ${toolName}`,
      }),
      isError: true,
    };
  }

  const input = (rawInput ?? {}) as ConsultarCatalogoInput;
  const { marca, modelo, anio } = input;

  try {
    const resultado: ResultadoBusqueda = buscarRepuesto(marca, modelo, anio);
    return {
      content: JSON.stringify({
        encontrado: resultado.encontrado,
        total_versiones: resultado.total,
        resumen: resultado.resumen,
        coincidencias: resultado.coincidencias,
      }),
      isError: false,
    };
  } catch (err) {
    console.error("[/api/chat] Error en ejecutarHerramienta:", err);
    return {
      content: JSON.stringify({
        error: "Error interno consultando el catálogo.",
      }),
      isError: true,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Loop conversacional con Tool Calling
// ─────────────────────────────────────────────────────────────

/**
 * Conversa con el LLM hasta que termine en `end_turn` (texto final) o se agote
 * el tope de iteraciones. Maneja la rueda tool_use → tool_result.
 *
 * Devuelve el texto final que va a la UI.
 */
async function correrConversacion(history: MessageParam[]): Promise<string> {
  const client = getClient();
  const conversation: MessageParam[] = [...history];

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: getSystemPrompt(),
      tools: TOOLS,
      messages: conversation,
    });

    // Caso 1: el modelo terminó normalmente → devolvemos el texto.
    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Respuesta sin contenido de texto del modelo.");
      }
      return textBlock.text;
    }

    // Caso 2: el modelo pidió ejecutar una o más herramientas.
    // Agregamos su mensaje completo al historial...
    conversation.push({
      role: "assistant",
      content: response.content,
    });

    // ...y por cada `tool_use` calculamos el `tool_result`.
    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use"
    );

    const toolResults = toolUseBlocks.map((block) => {
      const { content, isError } = ejecutarHerramienta(block.name, block.input);
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content,
        is_error: isError,
      };
    });

    conversation.push({
      role: "user",
      content: toolResults,
    });
  }

  throw new Error(
    `El agente excedió el tope de ${MAX_TOOL_ITERATIONS} iteraciones de tool_use.`
  );
}

// ─────────────────────────────────────────────────────────────
// POST /api/chat
// ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Pre-carga el catálogo en el primer request del proceso (lazy, una sola vez)
  precargarCatalogo();

  // 1. Parsear el body
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "JSON inválido en el body." },
      { status: 400 }
    );
  }

  // 2. Validar estructura
  if (!body?.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "El campo 'messages' es requerido y debe ser un array." },
      { status: 400 }
    );
  }

  // 3. Filtrar mensajes válidos y truncar historial
  const messages: ChatMessage[] = body.messages
    .filter(
      (m): m is ChatMessage =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_MESSAGES);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "El último mensaje debe ser del usuario." },
      { status: 400 }
    );
  }

  // 4. Convertir a formato de Anthropic y correr la conversación con tools
  const initialHistory: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let rawResponse: string;
  try {
    rawResponse = await correrConversacion(initialHistory);
  } catch (err: unknown) {
    console.error("[/api/chat] Error Anthropic:", err);

    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 500;
      const message =
        status === 401
          ? "API Key inválida o no configurada."
          : status === 429
          ? "Límite de uso alcanzado. Esperá unos segundos e intentá de nuevo."
          : status === 529
          ? "El servicio de IA está sobrecargado. Intentá de nuevo en un momento."
          : `Error de la API (${status}).`;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      {
        reply:
          "Uy, no pude responder en este momento 😕 Probá de nuevo o cerrá el pedido directo por WhatsApp.",
      },
      { status: 200 } // 200 para que el frontend muestre el mensaje de error amigable
    );
  }

  // 5. Parsear y devolver
  const parsed = parseLLMResponse(rawResponse);
  return NextResponse.json(parsed);
}

// ─────────────────────────────────────────────────────────────
// GET /api/chat — Health check
// ─────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: `${config.nombre} · Agente IA`,
    model: MODEL,
    tools: TOOLS.map((t) => t.name),
    timestamp: new Date().toISOString(),
  });
}
