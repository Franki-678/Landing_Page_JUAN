/**
 * vehiculos.ts — Catálogo del parque automotor argentino
 *
 * Fuente principal: JSON generado por el scraper de InfoAuto
 *   Jerarquía: Marca → Modelo → Año → [Versiones]
 *
 * Este archivo expone:
 *  - Los tipos TypeScript del catálogo
 *  - El objeto `catalogo` con los datos reales
 *  - Helpers de búsqueda y validación para el agente
 */

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

/** Array de versiones para un año específico */
export type Versiones = string[];

/** Mapa de año (string "YYYY") → versiones disponibles */
export type AnoMap = Record<string, Versiones>;

/** Mapa de modelo → años disponibles */
export type ModeloMap = Record<string, AnoMap>;

/** Estructura de una entrada de marca en el catálogo */
export interface MarcaEntry {
  descripcion?: string; // descripción de la marca (InfoAuto la incluye en algunas)
  modelos: ModeloMap;
}

/** Estructura completa del catálogo */
export type Catalogo = Record<string, MarcaEntry>;

// ─────────────────────────────────────────────────────────────
// Resultado normalizado de una búsqueda de vehículo
// ─────────────────────────────────────────────────────────────

export interface VehiculoIdentificado {
  marca: string;
  modelo: string;
  anio: string;
  version: string;
}

// ─────────────────────────────────────────────────────────────
// Catálogo de datos
//
// ⚠️  PENDIENTE: pegar aquí el JSON resultante del scraper de InfoAuto
//     cuando termine de correr. La estructura esperada es:
//
//     {
//       "VOLKSWAGEN": {
//         "descripcion": "...",
//         "modelos": {
//           "GOL": {
//             "2015": ["GOL TREND 1.6 SM", "GOL TREND 1.6 AT", ...],
//             "2016": [...]
//           }
//         }
//       }
//     }
//
// Por ahora se usa un catálogo vacío que no rompe ningún helper.
// El agente seguirá funcionando — simplemente no podrá validar vehículos
// hasta que se cargue el JSON real.
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _catalogoData: Catalogo = {};

/**
 * Carga el catálogo desde el JSON de InfoAuto.
 * Llamar una sola vez desde route.ts al iniciar el servidor.
 *
 * Uso:
 *   import infoAutoJson from "@/data/infoauto.json";
 *   cargarCatalogo(infoAutoJson);
 */
export function cargarCatalogo(data: Catalogo): void {
  _catalogoData = data;
}

// ─────────────────────────────────────────────────────────────
// Helpers de consulta
// ─────────────────────────────────────────────────────────────

/** Devuelve la lista de marcas disponibles, ordenadas alfabéticamente */
export function getMarcas(): string[] {
  return Object.keys(_catalogoData).sort();
}

/**
 * Devuelve los modelos disponibles para una marca.
 * La búsqueda es case-insensitive y con normalización básica.
 */
export function getModelos(marca: string): string[] {
  const entry = buscarMarca(marca);
  if (!entry) return [];
  return Object.keys(entry.modelos).sort();
}

/**
 * Devuelve los años disponibles para un modelo de una marca,
 * ordenados de más reciente a más antiguo.
 */
export function getAnos(marca: string, modelo: string): string[] {
  const entry = buscarMarca(marca);
  if (!entry) return [];
  const modeloEntry = buscarModelo(entry, modelo);
  if (!modeloEntry) return [];
  return Object.keys(modeloEntry).sort((a, b) => Number(b) - Number(a));
}

/**
 * Devuelve las versiones disponibles para marca + modelo + año.
 */
export function getVersiones(
  marca: string,
  modelo: string,
  anio: string
): string[] {
  const entry = buscarMarca(marca);
  if (!entry) return [];
  const modeloEntry = buscarModelo(entry, modelo);
  if (!modeloEntry) return [];
  return modeloEntry[anio] ?? [];
}

/**
 * Verifica si un vehículo (marca + modelo + año + versión) existe en el catálogo.
 * Útil para que el agente no confirme vehículos inventados.
 */
export function vehiculoExiste(v: Partial<VehiculoIdentificado>): boolean {
  if (!v.marca) return false;
  const entry = buscarMarca(v.marca);
  if (!entry) return false;
  if (!v.modelo) return true; // la marca existe

  const modeloEntry = buscarModelo(entry, v.modelo);
  if (!modeloEntry) return false;
  if (!v.anio) return true; // marca + modelo existen

  const versiones = modeloEntry[v.anio];
  if (!versiones) return false;
  if (!v.version) return true; // marca + modelo + año existen

  // versión: búsqueda flexible (contiene la cadena)
  const vNorm = normalizar(v.version);
  return versiones.some((ver) => normalizar(ver).includes(vNorm));
}

/**
 * Busca vehículos por texto libre. Devuelve las primeras N coincidencias.
 * Útil cuando el taller escribe algo ambiguo como "gol trend 2015".
 */
export function buscarVehiculoPorTexto(
  query: string,
  limite = 5
): VehiculoIdentificado[] {
  const q = normalizar(query);
  const resultados: VehiculoIdentificado[] = [];

  for (const [marca, marcaEntry] of Object.entries(_catalogoData)) {
    if (resultados.length >= limite) break;
    for (const [modelo, anoMap] of Object.entries(marcaEntry.modelos)) {
      if (resultados.length >= limite) break;
      const coincideMarcaModelo =
        normalizar(marca).includes(q) ||
        normalizar(modelo).includes(q) ||
        q.includes(normalizar(marca)) ||
        q.includes(normalizar(modelo));

      if (!coincideMarcaModelo) continue;

      for (const [anio, versiones] of Object.entries(anoMap)) {
        if (resultados.length >= limite) break;
        for (const version of versiones) {
          if (resultados.length >= limite) break;
          resultados.push({ marca, modelo, anio, version });
        }
      }
    }
  }

  return resultados;
}

/**
 * Genera un resumen compacto del catálogo para incluir en el system prompt.
 * No se incluye el catálogo completo (demasiados tokens); solo las marcas
 * y la cantidad de modelos, para que el agente sepa qué puede validar.
 */
export function generarResumenCatalogo(): string {
  const marcas = getMarcas();
  if (marcas.length === 0) {
    return "(Catálogo de vehículos aún no cargado — validación deshabilitada)";
  }
  const totalModelos = marcas.reduce(
    (acc, m) => acc + getModelos(m).length,
    0
  );
  return (
    `Catálogo disponible: ${marcas.length} marcas, ~${totalModelos} modelos.\n` +
    `Marcas: ${marcas.slice(0, 30).join(", ")}${marcas.length > 30 ? ` ... y ${marcas.length - 30} más` : ""}.`
  );
}

// ─────────────────────────────────────────────────────────────
// Internos
// ─────────────────────────────────────────────────────────────

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar tildes
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buscarMarca(marca: string): MarcaEntry | undefined {
  // Búsqueda exacta primero
  if (_catalogoData[marca]) return _catalogoData[marca];
  // Búsqueda case-insensitive
  const marcaNorm = normalizar(marca);
  const key = Object.keys(_catalogoData).find(
    (k) => normalizar(k) === marcaNorm
  );
  return key ? _catalogoData[key] : undefined;
}

function buscarModelo(
  entry: MarcaEntry,
  modelo: string
): AnoMap | undefined {
  if (entry.modelos[modelo]) return entry.modelos[modelo];
  const modeloNorm = normalizar(modelo);
  const key = Object.keys(entry.modelos).find(
    (k) => normalizar(k) === modeloNorm
  );
  return key ? entry.modelos[key] : undefined;
}
