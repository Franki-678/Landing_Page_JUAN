/**
 * config.ts — Configuración del cliente
 *
 * Este es el ÚNICO archivo que cambia al replicar el agente para un nuevo cliente.
 * Todos los demás archivos son reutilizables sin modificación.
 */

export interface AgentConfig {
  /** Nombre completo del negocio */
  nombre: string;
  /** Nombre corto (para el agente en conversaciones) */
  nombreCorto: string;
  /**
   * Número de WhatsApp del dueño en formato internacional sin '+', sin espacios.
   * Argentina: 549 + código de área sin 0 + número sin 15
   * Ej: cel Córdoba (0351) 123-4567 → "5493511234567"
   */
  whatsapp: string;
  /** Mensaje de bienvenida del agente */
  saludo: string;
  /** Rubro/especialidad — usado en el system prompt para contextualizar al agente */
  rubro: string;
  /** Ciudad o región del negocio */
  region: string;
  /** Nombre con el que se identifica el agente en el chat */
  nombreAgente: string;
}

/**
 * ⚠️  REEMPLAZAR los valores antes de hacer deploy.
 *
 * Checklist:
 *  [ ] whatsapp: número real de Juan (formato 549XXXXXXXXXX)
 *  [ ] nombre: nombre del negocio tal como aparece
 *  [ ] region: ciudad/zona para que el agente tenga contexto local
 */
export const config: AgentConfig = {
  nombre: "RC Repuestos",
  nombreCorto: "RC",
  whatsapp: "549XXXXXXXXX", // ← REEMPLAZAR con número real
  saludo:
    "¡Hola! Soy el asistente de RC Repuestos 🔧\nContame qué auto tiene el cliente y qué pieza necesitás, y yo te armo el pedido listo para mandar.",
  rubro: "autopartes de chapa y pintura",
  region: "Argentina",
  nombreAgente: "Asistente RC",
};
