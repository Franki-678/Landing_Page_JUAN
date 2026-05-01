/**
 * catalogoService.ts — Motor de búsqueda local del catálogo InfoAuto
 *
 * El archivo `infoauto_catalogo_completo.json` (~2.7 MB) está en la raíz del
 * proyecto. Cargarlo en cada request sería suicida (lectura de disco + parse
 * de JSON gigante por cada chat). Por eso este servicio implementa un patrón
 * **Singleton con caché en memoria**:
 *
 *   1. La primera vez que alguien llama `buscarRepuesto()` (o cualquier helper),
 *      se lee el archivo del disco con `fs.readFileSync` y se parsea con
 *      `JSON.parse`. El resultado queda guardado en una variable a nivel de
 *      módulo (`_catalogo`).
 *   2. Todas las llamadas siguientes — desde el mismo proceso de Node —
 *      reutilizan la referencia ya parseada. Cero lecturas de disco extra,
 *      cero parses extra.
 *   3. En Vercel/Next.js cada instancia serverless mantiene este caché tibio
 *      hasta que el contenedor se recicla.
 *
 * Para forzar recarga (tests, hot-reload manual): `invalidarCache()`.
 *
 * IMPORTANTE: este módulo está pensado para ejecutarse SOLO en el servidor.
 * No lo importes desde un Client Component.
 */

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────
// Tipos del catálogo (mismos que en lib/vehiculos.ts)
// ─────────────────────────────────────────────────────────────

export type Versiones = string[];
export type AnoMap = Record<string, Versiones>;
export type ModeloMap = Record<string, AnoMap>;

export interface MarcaEntry {
  descripcion?: string;
  modelos: ModeloMap;
}

export type Catalogo = Record<string, MarcaEntry>;

/**
 * Resultado acotado que devuelve `buscarRepuesto`. Solo incluye marcas/modelos
 * que coincidieron con el filtro, para gastar la mínima cantidad de tokens
 * cuando se le pase a la IA.
 */
export interface ResultadoBusqueda {
  encontrado: boolean;
  /** Mensaje legible para humanos / LLM con un resumen de los resultados. */
  resumen: string;
  /** Cantidad total de versiones devueltas (post-filtro). */
  total: number;
  /** Coincidencias agrupadas por marca/modelo/año. */
  coincidencias: Coincidencia[];
}

export interface Coincidencia {
  marca: string;
  modelo: string;
  anio: string;
  versiones: string[];
}

// ─────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────

/** Nombre del archivo JSON en la raíz del proyecto. */
const CATALOGO_FILENAME = "infoauto_catalogo_completo.json";

/**
 * Tope duro de coincidencias que devolvemos al LLM. Si el filtro es muy
 * laxo (ej: solo `marca="ford"` sin año), evita inundar el contexto.
 */
const MAX_COINCIDENCIAS = 50;

// ─────────────────────────────────────────────────────────────
// Singleton: caché del catálogo parseado
// ─────────────────────────────────────────────────────────────

/**
 * Estado global del módulo. En Node.js los `import` se evalúan una sola vez
 * por proceso, así que esta variable persiste entre requests del mismo
 * worker / lambda / contenedor.
 */
let _catalogo: Catalogo | null = null;
let _ultimoIntentoFallo: string | null = null;

/**
 * Carga el catálogo desde disco si todavía no está en memoria.
 * Se ejecuta de forma síncrona porque Node.js cachea muy bien `readFileSync`
 * y solo corre UNA vez por proceso.
 *
 * Si el archivo no existe o el JSON está corrupto, se guarda el motivo del
 * fallo para que las funciones de búsqueda devuelvan un resultado vacío en
 * lugar de tirar excepciones en cada request.
 */
function getCatalogo(): Catalogo {
  if (_catalogo !== null) return _catalogo;

  // Si ya intentamos antes y falló, no re-leemos disco una y otra vez.
  if (_ultimoIntentoFallo !== null) return {};

  const fullPath = join(process.cwd(), CATALOGO_FILENAME);

  if (!existsSync(fullPath)) {
    _ultimoIntentoFallo = `No se encontró ${CATALOGO_FILENAME} en ${process.cwd()}`;
    console.warn(`[catalogoService] ${_ultimoIntentoFallo}`);
    return {};
  }

  try {
    const t0 = Date.now();
    const raw = readFileSync(fullPath, "utf-8");
    const data = JSON.parse(raw) as Catalogo;
    _catalogo = data;
    const ms = Date.now() - t0;
    const marcas = Object.keys(data).length;
    console.log(
      `[catalogoService] Catálogo cargado en memoria: ${marcas} marcas en ${ms}ms.`
    );
    return _catalogo;
  } catch (err) {
    _ultimoIntentoFallo = `Error parseando ${CATALOGO_FILENAME}: ${(err as Error).message}`;
    console.error(`[catalogoService] ${_ultimoIntentoFallo}`);
    return {};
  }
}

/**
 * Invalida el caché en memoria. Útil en tests o si actualizás el JSON
 * en runtime y querés que el próximo request lo recargue.
 */
export function invalidarCache(): void {
  _catalogo = null;
  _ultimoIntentoFallo = null;
}

/**
 * Fuerza la pre-carga del catálogo. Conviene llamarla una vez al inicializar
 * el route handler para que el primer chat no pague el costo del parse.
 */
export function precargarCatalogo(): void {
  getCatalogo();
}

// ─────────────────────────────────────────────────────────────
// Búsqueda principal
// ─────────────────────────────────────────────────────────────

/**
 * Busca repuestos en el catálogo, filtrando por marca / modelo / año.
 * Todos los parámetros son opcionales: si no pasás nada, devuelve los
 * primeros N resultados de cualquier marca (poco útil, pero válido).
 *
 * Las búsquedas son tolerantes:
 *  - case-insensitive (volkswagen / VOLKSWAGEN / Volkswagen).
 *  - sin tildes ni puntuación (citroën / citroen).
 *  - parciales: "gol" matchea "GOL", "GOL TREND", "GOL COUNTRY", etc.
 *
 * @returns Un objeto `ResultadoBusqueda` listo para serializar y mandarle al
 *          LLM como `tool_result`.
 */
export function buscarRepuesto(
  marca?: string,
  modelo?: string,
  anio?: string
): ResultadoBusqueda {
  const data = getCatalogo();
  const marcaQ = marca ? normalizar(marca) : "";
  const modeloQ = modelo ? normalizar(modelo) : "";
  const anioQ = anio?.trim() ?? "";

  const coincidencias: Coincidencia[] = [];
  let total = 0;
  let truncado = false;

  outer: for (const [marcaKey, marcaEntry] of Object.entries(data)) {
    if (marcaQ && !normalizar(marcaKey).includes(marcaQ)) continue;

    for (const [modeloKey, anoMap] of Object.entries(marcaEntry.modelos)) {
      if (modeloQ && !normalizar(modeloKey).includes(modeloQ)) continue;

      for (const [anioKey, versiones] of Object.entries(anoMap)) {
        if (anioQ && anioKey !== anioQ) continue;

        if (coincidencias.length >= MAX_COINCIDENCIAS) {
          truncado = true;
          break outer;
        }

        coincidencias.push({
          marca: marcaKey,
          modelo: modeloKey,
          anio: anioKey,
          versiones: [...versiones],
        });
        total += versiones.length;
      }
    }
  }

  const encontrado = coincidencias.length > 0;
  const resumen = construirResumen({
    encontrado,
    coincidencias,
    total,
    truncado,
    marca,
    modelo,
    anio,
  });

  return { encontrado, resumen, total, coincidencias };
}

// ─────────────────────────────────────────────────────────────
// Helpers auxiliares (útiles fuera del Tool Calling)
// ─────────────────────────────────────────────────────────────

/** Devuelve la lista completa de marcas (ordenada). */
export function listarMarcas(): string[] {
  return Object.keys(getCatalogo()).sort();
}

/** Devuelve los modelos disponibles para una marca dada. */
export function listarModelos(marca: string): string[] {
  const data = getCatalogo();
  const marcaQ = normalizar(marca);
  const key = Object.keys(data).find((k) => normalizar(k) === marcaQ);
  if (!key) return [];
  return Object.keys(data[key].modelos).sort();
}

/** Estadísticas del catálogo (para logs / health checks). */
export function statsCatalogo(): {
  marcas: number;
  modelos: number;
  versiones: number;
  cargado: boolean;
} {
  const data = getCatalogo();
  let modelos = 0;
  let versiones = 0;
  for (const marca of Object.values(data)) {
    modelos += Object.keys(marca.modelos).length;
    for (const anoMap of Object.values(marca.modelos)) {
      for (const v of Object.values(anoMap)) versiones += v.length;
    }
  }
  return {
    marcas: Object.keys(data).length,
    modelos,
    versiones,
    cargado: _catalogo !== null,
  };
}

// ─────────────────────────────────────────────────────────────
// Internos
// ─────────────────────────────────────────────────────────────

/** Normaliza un string para comparar: lowercase, sin tildes, sin puntuación. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ResumenInput {
  encontrado: boolean;
  coincidencias: Coincidencia[];
  total: number;
  truncado: boolean;
  marca?: string;
  modelo?: string;
  anio?: string;
}

/** Construye un mensaje legible que el LLM entiende sin esfuerzo. */
function construirResumen(r: ResumenInput): string {
  const filtros = [
    r.marca ? `marca="${r.marca}"` : null,
    r.modelo ? `modelo="${r.modelo}"` : null,
    r.anio ? `anio="${r.anio}"` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (!r.encontrado) {
    return `No se encontraron vehículos en el catálogo InfoAuto para los filtros solicitados (${filtros || "sin filtros"}). Pídele al taller que aclare la marca, modelo o año, o avisale que ese vehículo no está en tu catálogo.`;
  }

  const cabecera = r.truncado
    ? `Se encontraron muchos resultados (mostrando los primeros ${r.coincidencias.length} para ${filtros}). Total de versiones devueltas: ${r.total}.`
    : `Se encontraron ${r.coincidencias.length} coincidencias para ${filtros} (${r.total} versiones en total).`;

  const detalle = r.coincidencias
    .map((c) => {
      const versionesStr =
        c.versiones.length > 8
          ? `${c.versiones.slice(0, 8).join(" | ")} ... (+${c.versiones.length - 8} más)`
          : c.versiones.join(" | ");
      return `- ${c.marca} ${c.modelo} (${c.anio}): ${versionesStr}`;
    })
    .join("\n");

  return `${cabecera}\n${detalle}`;
}
