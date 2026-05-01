/**
 * message-parser.ts — Parser del pedido estructurado
 *
 * Responsabilidades:
 * 1. Detectar si la respuesta del LLM contiene el tag <PEDIDO_LISTO>.
 * 2. Extraer el contenido del pedido estructurado.
 * 3. Limpiar el reply visible al taller (sin el tag técnico).
 * 4. Generar el mensaje de WhatsApp final.
 * 5. Exportar el tipo de respuesta que espera el frontend (AIChat.tsx).
 */

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

/** Lo que el backend devuelve al frontend (contrato con AIChat.tsx) */
export interface ChatApiResponse {
  /** Mensaje visible del agente en la burbuja del chat */
  reply: string;
  /**
   * true cuando el pedido está listo para cerrar por WhatsApp.
   * El frontend muestra el botón verde al recibir esto.
   */
  ready?: boolean;
  /**
   * Texto ya formateado para pre-cargar en el link de WhatsApp.
   * Si viene aquí, el frontend lo usa en lugar del resumen que armaría él.
   */
  summary?: string;
}

/** Estructura interna del pedido parseado */
export interface PedidoParsed {
  /** Contenido crudo extraído del tag <PEDIDO_LISTO> */
  contenidoRaw: string;
  /** Mensaje para WhatsApp (con header de saludo) */
  mensajeWhatsApp: string;
}

// ─────────────────────────────────────────────────────────────
// Tag especial que el LLM incluye cuando el pedido está listo
// ─────────────────────────────────────────────────────────────

const PEDIDO_LISTO_OPEN = "<PEDIDO_LISTO>";
const PEDIDO_LISTO_CLOSE = "</PEDIDO_LISTO>";

// ─────────────────────────────────────────────────────────────
// Parser principal
// ─────────────────────────────────────────────────────────────

/**
 * Procesa la respuesta cruda del LLM y devuelve el objeto
 * `ChatApiResponse` que el frontend de AIChat.tsx espera.
 *
 * Casos:
 *  A) El LLM incluyó <PEDIDO_LISTO>: pedido listo, armar WhatsApp.
 *  B) El LLM no incluyó el tag: conversación en curso, devolver reply normal.
 */
export function parseLLMResponse(rawResponse: string): ChatApiResponse {
  const pedido = extraerPedido(rawResponse);

  if (!pedido) {
    // Caso B: conversación normal
    return {
      reply: limpiarRespuesta(rawResponse),
    };
  }

  // Caso A: pedido listo
  const replyVisible = extraerReplyVisible(rawResponse);
  const mensajeWhatsApp = armarMensajeWhatsApp(pedido.contenidoRaw);

  return {
    reply: replyVisible || "¡Listo! 🎉 Tu pedido está armado. Apretá el botón verde para enviárselo por WhatsApp.",
    ready: true,
    summary: mensajeWhatsApp,
  };
}

// ─────────────────────────────────────────────────────────────
// Funciones internas
// ─────────────────────────────────────────────────────────────

/**
 * Extrae el contenido del tag <PEDIDO_LISTO>...</PEDIDO_LISTO>.
 * Devuelve null si el tag no está presente.
 */
function extraerPedido(raw: string): PedidoParsed | null {
  const start = raw.indexOf(PEDIDO_LISTO_OPEN);
  const end = raw.indexOf(PEDIDO_LISTO_CLOSE);

  if (start === -1 || end === -1 || end <= start) return null;

  const contenidoRaw = raw
    .slice(start + PEDIDO_LISTO_OPEN.length, end)
    .trim();

  return {
    contenidoRaw,
    mensajeWhatsApp: armarMensajeWhatsApp(contenidoRaw),
  };
}

/**
 * Extrae la parte del reply que va ANTES del tag <PEDIDO_LISTO>.
 * Es lo que el agente le dice al taller antes de presentar el pedido.
 */
function extraerReplyVisible(raw: string): string {
  const start = raw.indexOf(PEDIDO_LISTO_OPEN);
  if (start === -1) return raw.trim();
  return raw.slice(0, start).trim();
}

/**
 * Limpia la respuesta del LLM para mostrarla en el chat.
 * Elimina cualquier artefacto técnico que no debería ver el taller.
 */
function limpiarRespuesta(raw: string): string {
  return raw
    .replace(/<PEDIDO_LISTO>[\s\S]*?<\/PEDIDO_LISTO>/g, "")
    .trim();
}

/**
 * Arma el mensaje de WhatsApp a partir del contenido del pedido.
 *
 * El contenido ya viene formateado por el LLM con emojis y markdown de WhatsApp.
 * Solo necesitamos asegurarnos de que sea compatible con el link wa.me.
 */
function armarMensajeWhatsApp(contenidoPedido: string): string {
  // El contenido del pedido ya tiene el formato correcto con emojis
  // y markdown de WhatsApp (*negrita*, etc.).
  // Solo nos aseguramos de que esté limpio.
  return contenidoPedido.trim();
}

// ─────────────────────────────────────────────────────────────
// Utilidades exportadas
// ─────────────────────────────────────────────────────────────

/**
 * Determina si una respuesta contiene un pedido listo.
 * Útil para lógica condicional en route.ts.
 */
export function contieneVedidoListo(raw: string): boolean {
  return (
    raw.includes(PEDIDO_LISTO_OPEN) && raw.includes(PEDIDO_LISTO_CLOSE)
  );
}

/**
 * Valida que el contenido de un pedido parsado tenga los campos mínimos.
 * Heurística básica: debe tener información del vehículo y al menos una pieza.
 * Case-insensitive porque el template puede usar "VEHÍCULO" o "Vehículo".
 */
export function validarPedido(contenido: string): boolean {
  const upper = contenido.toUpperCase();
  const tieneVehiculo = upper.includes("VEHÍCULO") || upper.includes("VEHICULO");
  const tienePiezas = upper.includes("PIEZAS");
  return tieneVehiculo && tienePiezas;
}
