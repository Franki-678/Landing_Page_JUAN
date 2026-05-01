/**
 * sanitizer.ts — Limpieza del output del LLM antes de mostrarlo / mandarlo a WA
 *
 * Plan B: el system prompt prohíbe glyphs raros, pero el LLM a veces los mete
 * igual ("P•ezas:", bullets unicode, etc.). Este sanitizer es la red de
 * seguridad que corre SIEMPRE, independientemente de lo que el modelo decida.
 *
 * Es PURO TS sin dependencias de Node ni del SDK, así que se puede importar
 * tanto desde el server (route.ts, message-parser.ts) como desde el cliente
 * (AIChat.tsx). Sin ramas dinámicas que activen tree-shaking server-only.
 */

// ─────────────────────────────────────────────────────────────
// Mapas de sustitución
// ─────────────────────────────────────────────────────────────

/**
 * Glyphs comunes que el LLM mete por error. Los pasamos a un guión medio ASCII
 * cuando aparecen al inicio de un item de lista, o a "" cuando los detectamos
 * dentro de palabras (ese caso lo manejan los regex específicos más abajo).
 */
const BULLET_GLYPHS = [
  "\u2022", // •
  "\u00B7", // ·
  "\u25AA", // ▪
  "\u25AB", // ▫
  "\u25E6", // ◦
  "\u25BA", // ►
  "\u27A4", // ➤
  "\u2605", // ★
  "\u2606", // ☆
  "\u2014", // — (em dash)
  "\u2013", // – (en dash)
  "\u2500", // ─
  "\u00BB", // »
];

const BULLET_REGEX = new RegExp(`[${BULLET_GLYPHS.join("")}]`, "g");

/**
 * Regex que reemplaza el glitch concreto reportado: "P•ezas:" / "Pieza•" / etc.
 * Se cubren los glyphs más probables que el modelo confunde con la "i" minúscula
 * o la "s" final.
 */
const PIEZAS_GLITCH = /P[\u2022\u00B7\u25AA\u25AB\u25E6]ezas/gi;
const PIEZAS_GLITCH_END = /Pieza[\u2022\u00B7\u25AA\u25AB\u25E6](?=:|\s|$)/gi;

/**
 * Glitch genérico: cualquier letra latina rodeada de glyphs raros donde
 * deberían ir letras latinas (usually por confusión visual del modelo).
 * Lo aplicamos solo en palabras cortas (3-15 chars) para no romper.
 */
// Nota: deliberadamente conservador. Si aparecen otros glitches, los sumamos
// puntualmente, no acá.

// ─────────────────────────────────────────────────────────────
// Sanitizer principal
// ─────────────────────────────────────────────────────────────

/**
 * Limpia un string de salida del LLM para que sea seguro mostrarlo en el
 * chat y / o inyectarlo en un link wa.me.
 *
 * Operaciones (en orden):
 *  1. Arregla glitches específicos conocidos (P•ezas → Piezas).
 *  2. Reemplaza bullets unicode al inicio de líneas por "- ".
 *  3. Elimina cualquier bullet unicode residual dentro de líneas.
 *  4. Colapsa saltos de línea excesivos (3+ → 2).
 *  5. Detecta y elimina duplicación inmediata del texto completo
 *     (a veces el modelo imprime el bloque dos veces seguidas).
 *  6. Trim final.
 */
export function sanitizarTexto(input: string): string {
  if (!input) return "";

  let out = input;

  // 1. Glitches específicos
  out = out.replace(PIEZAS_GLITCH, "Piezas");
  out = out.replace(PIEZAS_GLITCH_END, "Piezas");

  // 2. Bullets unicode al inicio de línea → "- "
  //    (con o sin espacios previos)
  out = out.replace(/^\s*[\u2022\u00B7\u25AA\u25AB\u25E6\u25BA\u27A4\u2605]\s*/gm, "- ");

  // 3. Cualquier bullet residual dentro de líneas → eliminar (espacio).
  //    Excepción: em-dash y en-dash entre palabras suelen ser válidos en
  //    castellano, pero como el prompt los prohíbe, los normalizamos a "-".
  out = out.replace(/[\u2014\u2013]/g, "-");
  out = out.replace(BULLET_REGEX, "");

  // 4. Saltos de línea excesivos
  out = out.replace(/\n{3,}/g, "\n\n");

  // 5. Anti-duplicación: si el texto entero aparece dos veces seguidas
  //    (con o sin separador), nos quedamos con la primera mitad.
  out = removerDuplicacionInmediata(out);

  // 6. Trim
  return out.trim();
}

/**
 * Detecta si el output del modelo es exactamente la concatenación de
 * un bloque consigo mismo (con un separador de blanco entre medio).
 * Si lo es, devuelve solo la primera mitad.
 *
 * Heurística conservadora: solo actúa cuando las dos mitades son IDÉNTICAS
 * después de trim. Esto evita falsos positivos en pedidos legítimos con
 * dos vehículos distintos.
 */
function removerDuplicacionInmediata(input: string): string {
  const trimmed = input.trim();
  const len = trimmed.length;
  if (len < 40) return input; // muy chico, no vale la pena

  // Probamos los puntos de corte más razonables: la mitad exacta y el
  // último separador de párrafo cerca de la mitad.
  const mid = Math.floor(len / 2);

  // Caso 1: split exacto en la mitad
  const a = trimmed.slice(0, mid).trim();
  const b = trimmed.slice(mid).trim();
  if (a.length > 20 && a === b) return a;

  // Caso 2: el modelo metió "\n\n" entre las dos copias. Buscamos el primer
  // \n\n cerca de la mitad y comparamos.
  const sepIdx = trimmed.indexOf("\n\n", Math.max(0, mid - 30));
  if (sepIdx > 0 && sepIdx < len - 20) {
    const left = trimmed.slice(0, sepIdx).trim();
    const right = trimmed.slice(sepIdx).trim();
    if (left.length > 20 && left === right) return left;
  }

  return input;
}
