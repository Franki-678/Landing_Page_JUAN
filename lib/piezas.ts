/**
 * piezas.ts — Árbol de decisión para identificación de autopartes
 *
 * Rubro: Chapa y Pintura — Mercado Argentino
 *
 * Cada entrada define:
 *  - Los ATRIBUTOS que distinguen variantes de esa pieza
 *  - Las PREGUNTAS que el agente debe hacerle al taller
 *    (en lenguaje natural coloquial, jerga chapista argentina)
 *  - Los SINÓNIMOS para reconocer la pieza en lenguaje libre
 *
 * Reglas de diseño:
 *  1. El agente YA SABE la marca, modelo, año y versión exacta.
 *     Las preguntas se enfocan SOLO en los atributos de la pieza.
 *  2. Las preguntas van de mayor a menor impacto en la identificación.
 *  3. No preguntar lo que se puede inferir del vehículo ya identificado.
 *  4. Lenguaje: coloquial porteño/argentino, nada de términos muy técnicos
 *     a menos que sean de uso común en talleres (ej: "parktronic", "DRL").
 */

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export type TipoPregunta =
  | { tipo: "booleano" } // Respuesta: SÍ / NO
  | { tipo: "opciones"; valores: string[] } // Respuesta: una de las opciones
  | { tipo: "numero" } // Respuesta: valor numérico
  | { tipo: "texto_libre" }; // Respuesta: descripción libre

export interface Atributo {
  /** Identificador técnico interno (snake_case) */
  id: string;
  /** Pregunta que el agente le hace al taller */
  pregunta: string;
  /** Tipo de respuesta esperada */
  tipo: TipoPregunta;
  /** Si es false, el agente puede omitirla si la conversación ya dio la respuesta */
  obligatorio: boolean;
  /**
   * Aclaración opcional que el agente puede dar si el taller no entiende
   * la pregunta (el agente la usa solo si le piden explicación).
   */
  ayuda?: string;
}

export interface DefinicionPieza {
  /** Nombre canónico de la pieza para mostrar en el pedido */
  nombre: string;
  /**
   * Sinónimos y variantes del nombre que puede usar un chapista/mecánico.
   * El agente los usa para reconocer la pieza en lenguaje libre.
   */
  sinonimos: string[];
  /** Descripción breve — orienta al agente sobre qué es la pieza */
  descripcion: string;
  /** Atributos a confirmar, en orden de prioridad */
  atributos: Atributo[];
  /**
   * Nota interna para el agente con instrucciones especiales.
   * No se le muestra al taller.
   */
  nota_agente?: string;
}

// ─────────────────────────────────────────────────────────────
// Árbol de piezas
// ─────────────────────────────────────────────────────────────

export const PIEZAS: Record<string, DefinicionPieza> = {

  // ╔══════════════════════════════════════════════════════╗
  // ║              PARAGOLPES / BUMPERS                   ║
  // ╚══════════════════════════════════════════════════════╝

  paragolpes_delantero: {
    nombre: "Paragolpes delantero",
    sinonimos: [
      "paragolpe delantero",
      "bumper delantero",
      "paragolpes de adelante",
      "paragolpe de adelante",
      "parachoque delantero",
      "paragolpe front",
    ],
    descripcion:
      "Pieza plástica exterior delantera que absorbe impactos y contiene " +
      "los orificios para luces, sensores y otros accesorios del frente del vehículo.",
    atributos: [
      {
        id: "sensores_estacionamiento",
        pregunta:
          "¿Tiene los agujeros para los sensores de estacionamiento (parktronic/PDC)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda:
          "Son los botoncitos negros que van embutidos en el paragolpes y pitan cuando te acercás a algo.",
      },
      {
        id: "lavafaros",
        pregunta:
          "¿Tiene los caños/toberas para los lavafaros (los que largan agua para limpiar los faros)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda:
          "Son dos o cuatro caños chicos que salen del paragolpes y apuntan a los faros principales.",
      },
      {
        id: "antinieblas",
        pregunta:
          "¿Tiene las luces de neblina (antinieblas)? ¿O tiene los huecos pero sin las luces?",
        tipo: {
          tipo: "opciones",
          valores: [
            "sin huecos (liso)",
            "solo los huecos/rebajes",
            "viene con las luces incluidas",
          ],
        },
        obligatorio: true,
        ayuda:
          "Las luces de neblina van en los costados del paragolpes delantero, son redondas o rectangulares.",
      },
      {
        id: "camara_frontal",
        pregunta:
          "¿Tiene el hueco o soporte para la cámara frontal (la que va en el centro abajo)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
        ayuda: "Algunos autos tienen una cámara apuntando hacia adelante, justo en el centro del paragolpes.",
      },
      {
        id: "terminacion",
        pregunta:
          "¿Lo necesitás para pintar (liso/imprimado) o viene con el texturado negro?",
        tipo: {
          tipo: "opciones",
          valores: ["para pintar", "texturado negro", "con moldura/faldón negro integrado"],
        },
        obligatorio: true,
        ayuda:
          "Los paragolpes 'para pintar' vienen en gris/imprimado y el taller los pinta. " +
          "Los 'texturados' ya vienen con el acabado negro mate que no se pinta.",
      },
      {
        id: "faldon_inferior",
        pregunta:
          "¿Tiene el faldón/espólier inferior integrado (la pieza que va pegada abajo del paragolpes)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "embellecedor_cromado",
        pregunta:
          "¿Tiene alguna moldura o embellecedor cromado integrado en el paragolpes?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
    nota_agente:
      "Si el taller menciona 'paragolpes completo' o 'paragolpes con todo', " +
      "igualmente confirmar los atributos uno a uno para evitar errores.",
  },

  paragolpes_trasero: {
    nombre: "Paragolpes trasero",
    sinonimos: [
      "paragolpe trasero",
      "bumper trasero",
      "paragolpes de atrás",
      "paragolpe de atrás",
      "parachoque trasero",
    ],
    descripcion:
      "Pieza plástica exterior trasera. Puede contener sensores, cámara de reversa, " +
      "salidas de escape y hueco para gancho de remolque.",
    atributos: [
      {
        id: "sensores_estacionamiento",
        pregunta:
          "¿Tiene los agujeros para los sensores de estacionamiento traseros (los botoncitos del parktronic)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
      },
      {
        id: "camara_reversa",
        pregunta:
          "¿Tiene el hueco o soporte para la cámara de reversa (la que te muestra atrás cuando metés reverse)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda: "La cámara de reversa va generalmente en el centro del paragolpes trasero o integrada en el logo/emblema.",
      },
      {
        id: "gancho_remolque",
        pregunta:
          "¿Tiene el hueco/tapita para el gancho de remolque (enganche)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "terminacion",
        pregunta:
          "¿Lo necesitás para pintar o viene texturado negro?",
        tipo: {
          tipo: "opciones",
          valores: ["para pintar", "texturado negro", "con faldón negro integrado"],
        },
        obligatorio: true,
      },
      {
        id: "salida_escape",
        pregunta:
          "¿Cómo son las salidas de escape que van en el paragolpes? ¿Una, dos, o viene sin hueco (tapado)?",
        tipo: {
          tipo: "opciones",
          valores: ["sin salida (tapado)", "una salida centrada", "dos salidas", "dos salidas separadas en los extremos"],
        },
        obligatorio: false,
        ayuda: "Algunos paragolpes traseros tienen las salidas de escape integradas o decorativas.",
      },
      {
        id: "difusor",
        pregunta:
          "¿Tiene difusor/spoiler deportivo integrado en la parte de abajo?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "embellecedor_cromado",
        pregunta:
          "¿Tiene alguna moldura cromada integrada en el paragolpes trasero?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              ÓPTICAS / FAROS DELANTEROS             ║
  // ╚══════════════════════════════════════════════════════╝

  optica_delantera: {
    nombre: "Óptica delantera",
    sinonimos: [
      "faro delantero",
      "óptica",
      "faro principal",
      "faro",
      "farol delantero",
      "linterna delantera",
      "headlight",
      "farola delantera",
      "faro de posicion delantero",
      "optica delantera",
    ],
    descripcion:
      "Faro principal delantero. Es la pieza de mayor variabilidad en el rubro: " +
      "difiere por tecnología de luz, diseño óptico y equipamiento electrónico.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es la óptica del lado izquierdo (conductor) o del lado derecho (acompañante)?",
        tipo: { tipo: "opciones", valores: ["izquierda (conductor)", "derecha (acompañante)"] },
        obligatorio: true,
      },
      {
        id: "tecnologia",
        pregunta:
          "¿Las luces del auto son halógenas, LED o xenón/HID?",
        tipo: {
          tipo: "opciones",
          valores: ["halógena", "LED", "xenón / HID / bixenón"],
        },
        obligatorio: true,
        ayuda:
          "Halógena: filamento naranja/amarillo. Xenón/HID: luz azulada muy brillante con arrancador. " +
          "LED: luces blancas formadas por tiras o puntos.",
      },
      {
        id: "proyector",
        pregunta:
          "¿El faro tiene el proyector/lupa (el lente redondo que concentra la luz) o es reflectivo (en abanico)?",
        tipo: { tipo: "opciones", valores: ["con proyector/lupa", "reflectivo (sin lupa)", "no sé"] },
        obligatorio: true,
        ayuda:
          "El proyector es el lente redondo que proyecta un haz concentrado. " +
          "El reflectivo tiene una cubierta en abanico de cromo/plata detrás del filamento.",
      },
      {
        id: "fondo",
        pregunta:
          "¿El interior del faro es fondo negro o fondo cromo/plateado?",
        tipo: { tipo: "opciones", valores: ["fondo negro", "fondo cromo/plateado"] },
        obligatorio: true,
      },
      {
        id: "drl",
        pregunta:
          "¿Tiene las tiras/barras de luz blanca de día (DRL) integradas en el faro?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
        ayuda: "Los DRL son las luces que se encienden automáticamente de día en muchos autos modernos.",
      },
      {
        id: "luz_giro_integrada",
        pregunta:
          "¿La luz de giro/guiño naranja está integrada dentro del faro principal o es una pieza separada?",
        tipo: {
          tipo: "opciones",
          valores: [
            "integrada dentro del faro",
            "separada (va en el paragolpes o guardabarro)",
            "secuencial/dinámica (va corriendo)",
          ],
        },
        obligatorio: false,
      },
      {
        id: "motor_nivelacion",
        pregunta:
          "¿Los faros tienen motor eléctrico de nivelación (se regulan automáticamente según la carga del auto)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
        ayuda:
          "Se detecta porque el auto tiene una ruedita o selector adentro para regular la altura de los faros, " +
          "o lo hace automáticamente.",
      },
      {
        id: "afs",
        pregunta:
          "¿Los faros se mueven/giran cuando girás el volante (sistema AFS / adaptive headlights)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
    nota_agente:
      "La combinación tecnología + proyector + fondo es lo que más diferencia " +
      "una óptica de otra para el mismo vehículo. Si el taller no sabe, pedirle " +
      "que mire el faro que le quedó y describa lo que ve adentro.",
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              FAROS TRASEROS                         ║
  // ╚══════════════════════════════════════════════════════╝

  faro_trasero: {
    nombre: "Faro trasero",
    sinonimos: [
      "óptica trasera",
      "faro de atrás",
      "faro trasero",
      "calavera",
      "piloto trasero",
      "stop",
      "farol trasero",
      "linterna trasera",
      "conjunto trasero",
    ],
    descripcion:
      "Conjunto de luces traseras. Puede ir en el guardabarro, en el baúl/portón, " +
      "o abarcar ambos en un conjunto de dos piezas.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es el faro trasero del lado izquierdo o del derecho?",
        tipo: { tipo: "opciones", valores: ["izquierdo", "derecho"] },
        obligatorio: true,
      },
      {
        id: "ubicacion_fisica",
        pregunta:
          "¿El faro que necesitás va en la chapa del guardabarro, en el baúl/portón, o es un conjunto que abarca los dos?",
        tipo: {
          tipo: "opciones",
          valores: [
            "solo en el guardabarro",
            "solo en el baúl / portón",
            "conjunto que abarca guardabarro y baúl (dos piezas)",
          ],
        },
        obligatorio: true,
        ayuda:
          "Muchos autos tienen el faro dividido: una parte va en el guardabarro y otra en la tapa del baúl. " +
          "Cada parte es una pieza diferente.",
      },
      {
        id: "tecnologia",
        pregunta:
          "¿Las luces traseras son LED (luz blanca/roja muy nítida) o convencionales (focos de filamento)?",
        tipo: { tipo: "opciones", valores: ["LED", "convencional (filamentos/focos)"] },
        obligatorio: true,
      },
      {
        id: "luz_reversa_integrada",
        pregunta:
          "¿Tiene la luz de marcha atrás (la blanca que se enciende al meter reversa) integrada en este faro?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              ANTINIEBLAS                            ║
  // ╚══════════════════════════════════════════════════════╝

  antiniebla_delantero: {
    nombre: "Antiniebla delantero",
    sinonimos: [
      "neblinero delantero",
      "neblinero",
      "luz de neblina delantera",
      "foglamp delantero",
      "fog delantero",
      "antiniebla de adelante",
    ],
    descripcion:
      "Luz auxiliar delantera, generalmente ubicada en los extremos del paragolpes. " +
      "Se vende como óptica suelta, a veces con el aro/marco.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es el antiniebla izquierdo o derecho?",
        tipo: { tipo: "opciones", valores: ["izquierdo", "derecho"] },
        obligatorio: true,
      },
      {
        id: "tecnologia",
        pregunta: "¿La luz de neblina es LED o halógena?",
        tipo: { tipo: "opciones", valores: ["LED", "halógena"] },
        obligatorio: true,
      },
      {
        id: "con_marco",
        pregunta:
          "¿Necesitás la óptica sola o con el marco/aro que la rodea?",
        tipo: {
          tipo: "opciones",
          valores: ["solo la óptica", "con el marco/aro incluido"],
        },
        obligatorio: true,
      },
    ],
  },

  antiniebla_trasero: {
    nombre: "Antiniebla trasero",
    sinonimos: [
      "neblinero trasero",
      "luz de neblina trasera",
      "foglamp trasero",
      "antiniebla de atrás",
    ],
    descripcion:
      "Luz roja de alta intensidad ubicada en el paragolpes o en el conjunto trasero. " +
      "En Argentina los autos suelen tener uno solo, del lado izquierdo.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Va del lado izquierdo o derecho?",
        tipo: { tipo: "opciones", valores: ["izquierdo", "derecho"] },
        obligatorio: true,
      },
      {
        id: "ubicacion",
        pregunta:
          "¿Está integrado en el paragolpes trasero o es una pieza separada en el conjunto trasero?",
        tipo: {
          tipo: "opciones",
          valores: ["integrado en el paragolpes", "pieza separada en el faro trasero"],
        },
        obligatorio: true,
      },
      {
        id: "tecnologia",
        pregunta: "¿Es LED o convencional (foco)?",
        tipo: { tipo: "opciones", valores: ["LED", "convencional"] },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              ESPEJOS RETROVISORES EXTERIORES        ║
  // ╚══════════════════════════════════════════════════════╝

  espejo_exterior: {
    nombre: "Espejo retrovisor exterior",
    sinonimos: [
      "espejo",
      "retrovisor",
      "espejito",
      "espejo lateral",
      "mirror",
      "retrovisor exterior",
      "espejo externo",
      "espejito lateral",
    ],
    descripcion:
      "Espejo retrovisor exterior. Es uno de los componentes con más variantes " +
      "por las combinaciones de funciones eléctricas disponibles.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es el espejo del lado del conductor (izquierdo) o del acompañante (derecho)?",
        tipo: { tipo: "opciones", valores: ["izquierdo (conductor)", "derecho (acompañante)"] },
        obligatorio: true,
      },
      {
        id: "regulacion",
        pregunta:
          "¿El espejo se regula eléctricamente desde adentro del auto o se ajusta a mano?",
        tipo: { tipo: "opciones", valores: ["eléctrico", "manual"] },
        obligatorio: true,
      },
      {
        id: "plegado",
        pregunta:
          "¿El espejo se pliega (dobla) eléctricamente, a mano, o no se pliega?",
        tipo: {
          tipo: "opciones",
          valores: ["plegado eléctrico", "plegado manual", "no se pliega (fijo)"],
        },
        obligatorio: true,
      },
      {
        id: "luz_giro",
        pregunta:
          "¿El espejo tiene la luz de giro/guiño integrada (la naranjita que se ve de costado)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
      },
      {
        id: "desempañador",
        pregunta:
          "¿El espejo tiene resistencia para desempañarse (calefacción en el vidrio del espejo)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "camara",
        pregunta:
          "¿El espejo tiene cámara integrada (para el sistema de visión 360°)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "terminacion",
        pregunta:
          "¿Cómo necesitás la tapa del espejo: para pintar, negro mate/texturado, o cromada?",
        tipo: {
          tipo: "opciones",
          valores: ["para pintar", "negro mate / texturado", "cromada"],
        },
        obligatorio: true,
      },
    ],
    nota_agente:
      "La combinación regulación + plegado + luz de giro es crítica. " +
      "Muchos espejos 'similares' difieren solo en si el plegado es eléctrico o manual, " +
      "y eso cambia el conector y los pines. Si el taller tiene el espejo roto como referencia, " +
      "pedirle que cuente los cables que salen.",
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              CAPOT                                  ║
  // ╚══════════════════════════════════════════════════════╝

  capot: {
    nombre: "Capot",
    sinonimos: [
      "capo",
      "capó",
      "tapa del motor",
      "hood",
      "bonnet",
    ],
    descripcion:
      "Tapa metálica superior del compartimento del motor. " +
      "La mayoría en Argentina es chapa de acero estampada.",
    atributos: [
      {
        id: "toma_de_aire",
        pregunta:
          "¿El capot tiene la toma de aire (el bulto/scoop que sobresale arriba)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda: "La toma de aire es el elevado que tienen algunos autos deportivos o 4x4 para enfriar el motor.",
      },
      {
        id: "material",
        pregunta:
          "¿El capot original del auto es de chapa de acero, aluminio, o es de fibra de carbono?",
        tipo: {
          tipo: "opciones",
          valores: ["chapa de acero (estándar)", "aluminio", "fibra de carbono"],
        },
        obligatorio: false,
        ayuda: "La mayoría de los autos comunes tienen capot de chapa de acero. Aluminio y fibra son para autos de alta gama o deportivos.",
      },
      {
        id: "con_bisagras",
        pregunta:
          "¿Necesitás también las bisagras del capot o solo el capot?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              GUARDABARROS                           ║
  // ╚══════════════════════════════════════════════════════╝

  guardabarro_delantero: {
    nombre: "Guardabarro delantero",
    sinonimos: [
      "guardabarros delantero",
      "guarda delantera",
      "aleta delantera",
      "fender delantero",
      "mudguard delantero",
    ],
    descripcion:
      "Panel de chapa lateral delantero, encima de la rueda delantera. " +
      "Puede tener o no orificio para la luz repetidora lateral.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es el guardabarro del lado izquierdo (conductor) o derecho (acompañante)?",
        tipo: { tipo: "opciones", valores: ["izquierdo (conductor)", "derecho (acompañante)"] },
        obligatorio: true,
      },
      {
        id: "repetidora_lateral",
        pregunta:
          "¿Tiene el agujero para la luz de giro lateral (la lamparita naranja que va en el guardabarro)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda:
          "Es el orificio en el medio del guardabarro donde va la pequeña luz naranja que parpadea cuando doblás.",
      },
      {
        id: "moldura_ensanche",
        pregunta:
          "¿Tiene moldura o ensanche en el borde inferior/arco de la rueda?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "paso_rueda_integrado",
        pregunta:
          "¿Tiene el pasarruedas (el plástico interior del arco) integrado o es una pieza aparte?",
        tipo: {
          tipo: "opciones",
          valores: ["pasarruedas aparte (no incluido)", "viene con el pasarruedas integrado"],
        },
        obligatorio: false,
      },
    ],
  },

  cuarto_trasero: {
    nombre: "Cuarto trasero",
    sinonimos: [
      "guardabarro trasero",
      "guarda trasera",
      "aleta trasera",
      "fender trasero",
      "cuarto de atrás",
      "panel trasero lateral",
    ],
    descripcion:
      "Panel lateral trasero, encima de la rueda trasera. " +
      "En la mayoría de los autos sedán/hatchback va soldado a la carrocería. " +
      "En algunos SUV y pickups puede ser un panel plástico con clips.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es el cuarto trasero del lado izquierdo o derecho?",
        tipo: { tipo: "opciones", valores: ["izquierdo", "derecho"] },
        obligatorio: true,
      },
      {
        id: "tipo_fijacion",
        pregunta:
          "¿El cuarto trasero del auto va soldado (es chapa parte de la carrocería) o va con clips/tornillos (panel plástico)?",
        tipo: {
          tipo: "opciones",
          valores: [
            "soldado (chapa de carrocería)",
            "panel plástico con clips/tornillos",
          ],
        },
        obligatorio: true,
        ayuda:
          "Los sedán y hatchback comunes tienen el cuarto trasero de chapa soldado. " +
          "Algunos SUV y pickups tienen paneles de plástico que se quitan.",
      },
      {
        id: "moldura_ensanche",
        pregunta:
          "¿Tiene moldura o ensanche en el arco de la rueda trasera?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              PARRILLA DELANTERA                     ║
  // ╚══════════════════════════════════════════════════════╝

  parrilla_delantera: {
    nombre: "Parrilla delantera",
    sinonimos: [
      "grille",
      "rejilla delantera",
      "parrilla",
      "careta",
      "panal",
      "mascara delantera",
      "máscara",
    ],
    descripcion:
      "Parrilla/rejilla frontal del vehículo. Puede ser el conjunto completo " +
      "o componentes individuales (marco, rejilla superior, rejillas inferiores).",
    atributos: [
      {
        id: "alcance",
        pregunta:
          "¿Necesitás la parrilla completa (marco + malla interior) o solo una parte?",
        tipo: {
          tipo: "opciones",
          valores: [
            "parrilla completa",
            "solo el marco exterior",
            "solo la malla/rejilla interior",
            "rejillas inferiores del paragolpes",
          ],
        },
        obligatorio: true,
      },
      {
        id: "marco",
        pregunta:
          "¿El marco de la parrilla es cromado, negro brillante, negro mate, o del color de la carrocería?",
        tipo: {
          tipo: "opciones",
          valores: ["cromado", "negro brillante", "negro mate", "color carrocería (para pintar)"],
        },
        obligatorio: true,
      },
      {
        id: "interior",
        pregunta:
          "¿Cómo es el interior de la parrilla: panal de abeja, listones horizontales, listones verticales, o pleno/liso?",
        tipo: {
          tipo: "opciones",
          valores: [
            "panal de abeja (hexagonos)",
            "listones horizontales",
            "listones verticales",
            "pleno / liso",
          ],
        },
        obligatorio: false,
      },
      {
        id: "emblema",
        pregunta:
          "¿Tiene el emblema/logo de la marca integrado en la parrilla?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "camara_frontal",
        pregunta:
          "¿Tiene el soporte o hueco para la cámara frontal integrado en la parrilla?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              PUERTAS                                ║
  // ╚══════════════════════════════════════════════════════╝

  puerta: {
    nombre: "Puerta",
    sinonimos: [
      "puerta",
      "portezuela",
      "door",
      "puerta delantera",
      "puerta trasera",
    ],
    descripcion:
      "Panel de chapa lateral con marco de ventana. " +
      "Se identifica por posición y si incluye o no accesorios.",
    atributos: [
      {
        id: "posicion",
        pregunta:
          "¿Qué puerta es? ¿Delantera izquierda, delantera derecha, trasera izquierda o trasera derecha?",
        tipo: {
          tipo: "opciones",
          valores: [
            "delantera izquierda (del conductor)",
            "delantera derecha (del acompañante)",
            "trasera izquierda",
            "trasera derecha",
          ],
        },
        obligatorio: true,
      },
      {
        id: "con_moldura",
        pregunta:
          "¿La puerta tiene la moldura/franja lateral integrada (la tira de plástico o cromo en el costado)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "solo_chapa",
        pregunta:
          "¿Necesitás solo la chapa de la puerta (sin vidrio, sin mecanismos, sin tapizado) o la puerta completa con accesorios?",
        tipo: {
          tipo: "opciones",
          valores: [
            "solo la chapa (sin accesorios)",
            "con vidrio y guías incluidas",
            "completa con mecanismos",
          ],
        },
        obligatorio: true,
        ayuda:
          "En el rubro de chapa y pintura, la mayoría de las veces se reemplaza solo la chapa " +
          "y se pasan los mecanismos del auto.",
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              TAPA DE BAÚL / PORTÓN TRASERO          ║
  // ╚══════════════════════════════════════════════════════╝

  tapa_baul: {
    nombre: "Tapa de baúl / Portón trasero",
    sinonimos: [
      "tapa de baúl",
      "baúl",
      "portón",
      "portón trasero",
      "tapa trasera",
      "maletero",
      "trunk",
      "tailgate",
      "compuerta trasera",
      "porton",
    ],
    descripcion:
      "Tapa trasera del vehículo. Puede ser la tapa de baúl de un sedán, " +
      "el portón de un hatchback/SUV, o la compuerta de una pickup.",
    atributos: [
      {
        id: "tipo",
        pregunta:
          "¿Cómo es la tapa trasera del auto: una tapa de baúl (sedán), un portón que sube completo (hatchback/SUV), o una compuerta que baja (pickup)?",
        tipo: {
          tipo: "opciones",
          valores: [
            "tapa de baúl (sedán)",
            "portón trasero completo (hatchback/SUV)",
            "compuerta que baja (pickup)",
          ],
        },
        obligatorio: true,
      },
      {
        id: "con_spoiler",
        pregunta:
          "¿Tiene el spoiler integrado en la tapa/portón?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "con_limpiaparabrisas",
        pregunta:
          "¿Tiene el mecanismo/soporte del limpiaparabrisas trasero integrado?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "apertura_electrica",
        pregunta:
          "¿El baúl/portón tiene apertura eléctrica (abre solo con un botón/sensor)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              VIDRIOS                                ║
  // ╚══════════════════════════════════════════════════════╝

  vidrio_parabrisas: {
    nombre: "Vidrio parabrisas",
    sinonimos: [
      "parabrisas",
      "vidrio delantero",
      "parabrisas delantero",
      "windshield",
      "cristal delantero",
    ],
    descripcion:
      "Vidrio laminado delantero. Sus variantes dependen del equipamiento del vehículo.",
    atributos: [
      {
        id: "sensor_lluvia",
        pregunta:
          "¿El auto tiene sensor de lluvia (limpiaparabrisas automático que se activa solo cuando llueve)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda:
          "Generalmente se detecta porque tiene una lamparita pegada al parabrisas desde adentro, " +
          "donde va el espejo retrovisor.",
      },
      {
        id: "camara_adas",
        pregunta:
          "¿El auto tiene la cámara de asistencia al conductor pegada al parabrisas " +
          "(para el frenado automático, detección de carriles, etc.)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda:
          "La cámara ADAS va pegada al parabrisas desde adentro, cerca del espejo retrovisor. " +
          "La tienen autos con frenado automático de emergencia, control de carriles, etc.",
      },
      {
        id: "calefaccion",
        pregunta:
          "¿El parabrisas tiene calefacción/desempañador (filamentos calefactores en el vidrio)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "hud",
        pregunta:
          "¿El auto tiene HUD (el marcador de velocidad que se proyecta en el parabrisas, como un holograma)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "banda_solar",
        pregunta:
          "¿Necesitás el parabrisas con la banda solar (la franja verde/azul tintada en la parte de arriba)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "antena",
        pregunta:
          "¿El parabrisas tiene antena integrada (la de radio, GPS o de peaje automático)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
    nota_agente:
      "El sensor de lluvia y la cámara ADAS son los atributos que más diferencian " +
      "un parabrisas de otro para el mismo vehículo. Confirmarlos siempre.",
  },

  vidrio_luneta: {
    nombre: "Vidrio luneta",
    sinonimos: [
      "luneta",
      "vidrio trasero",
      "rear window",
      "luneta trasera",
      "cristal trasero",
    ],
    descripcion:
      "Vidrio trasero del vehículo. Puede tener desempañador (el más común en Argentina), " +
      "orificio para limpiaparabrisas y antena integrada.",
    atributos: [
      {
        id: "desempañador",
        pregunta:
          "¿La luneta tiene desempañador (los filamentos que la calientan cuando apretás el botón del atrás)?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
        ayuda: "El desempañador son las líneas horizontales finas de color cobre/naranja que se ven en el vidrio.",
      },
      {
        id: "limpiaparabrisas_trasero",
        pregunta:
          "¿Tiene el agujero/soporte para el limpiaparabrisas trasero?",
        tipo: { tipo: "booleano" },
        obligatorio: true,
      },
      {
        id: "antena",
        pregunta:
          "¿Tiene antena integrada en el vidrio (para radio, GPS o peaje electrónico)?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
      {
        id: "privacidad",
        pregunta:
          "¿La luneta viene oscurecida/de privacidad de fábrica o es transparente?",
        tipo: { tipo: "opciones", valores: ["transparente", "oscurecida/privacidad de fábrica"] },
        obligatorio: false,
      },
    ],
  },

  vidrio_lateral: {
    nombre: "Vidrio lateral",
    sinonimos: [
      "vidrio de puerta",
      "vidrio lateral",
      "cristal lateral",
      "vidrio de ventana",
      "vidrio de puerta delantera",
      "vidrio de puerta trasera",
      "vidrio fijo lateral",
      "cuarterito",
    ],
    descripcion:
      "Vidrio de las puertas o ventanas laterales fijas. " +
      "Especificarlo con la posición exacta es crítico.",
    atributos: [
      {
        id: "posicion",
        pregunta:
          "¿Qué vidrio necesitás? ¿El de qué puerta o ventana exactamente?",
        tipo: {
          tipo: "opciones",
          valores: [
            "puerta delantera izquierda",
            "puerta delantera derecha",
            "puerta trasera izquierda",
            "puerta trasera derecha",
            "ventana fija cuarto trasero izquierdo",
            "ventana fija cuarto trasero derecho",
            "ventanilla fija trasera izquierda (la que no baja)",
            "ventanilla fija trasera derecha (la que no baja)",
          ],
        },
        obligatorio: true,
      },
      {
        id: "tipo",
        pregunta:
          "¿El vidrio sube y baja eléctricamente, a manivela, o es un vidrio fijo que no se mueve?",
        tipo: {
          tipo: "opciones",
          valores: ["eléctrico", "manual (manivela)", "fijo (no se mueve)"],
        },
        obligatorio: true,
      },
      {
        id: "privacidad",
        pregunta:
          "¿El vidrio es transparente o viene oscurecido/tintado de fábrica?",
        tipo: { tipo: "opciones", valores: ["transparente", "tintado/oscurecido"] },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              FRENTES INTERNOS Y SOPORTES            ║
  // ╚══════════════════════════════════════════════════════╝

  alma_paragolpes: {
    nombre: "Alma de paragolpes / Absorbente",
    sinonimos: [
      "alma",
      "absorbente",
      "refuerzo de paragolpes",
      "soporte de paragolpes",
      "traversa paragolpes",
      "travesaño paragolpes",
    ],
    descripcion:
      "Estructura interna detrás del paragolpes exterior que absorbe impactos. " +
      "Puede ser de plástico expandido (telgopor duro), poliuretano o chapa.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es el alma del paragolpes delantero o trasero?",
        tipo: { tipo: "opciones", valores: ["delantero", "trasero"] },
        obligatorio: true,
      },
      {
        id: "material",
        pregunta:
          "¿Sabés de qué material es el alma original: plástico rígido/espuma (telgopor duro), poliuretano, o chapa?",
        tipo: {
          tipo: "opciones",
          valores: ["espuma / telgopor rígido (EPS)", "poliuretano", "chapa de acero", "no sé"],
        },
        obligatorio: false,
        ayuda: "Si no sabe, no hay problema, con marca + modelo + año se puede determinar.",
      },
    ],
  },

  soporte_radiador: {
    nombre: "Soporte de radiador / Frente interno",
    sinonimos: [
      "soporte de radiador",
      "frente de chapa",
      "soporte delantero",
      "nucleo delantero",
      "core support",
      "frente interno",
      "alma delantera",
    ],
    descripcion:
      "Estructura interna delantera que sostiene el radiador, los faros y el paragolpes. " +
      "En algunos autos es de chapa, en otros de plástico reforzado.",
    atributos: [
      {
        id: "material",
        pregunta:
          "¿El soporte de radiador del auto es de chapa de acero o de plástico?",
        tipo: {
          tipo: "opciones",
          valores: ["chapa de acero", "plástico reforzado / composite"],
        },
        obligatorio: true,
      },
      {
        id: "alcance",
        pregunta:
          "¿Necesitás el soporte completo o solo una parte (lateral izquierdo, lateral derecho, travesaño superior)?",
        tipo: {
          tipo: "opciones",
          valores: [
            "completo",
            "lateral izquierdo",
            "lateral derecho",
            "travesaño superior",
            "travesaño inferior",
          ],
        },
        obligatorio: true,
      },
    ],
  },

  radiador: {
    nombre: "Radiador",
    sinonimos: [
      "radiador de agua",
      "radiador de motor",
      "radiador",
      "cooler de agua",
    ],
    descripcion:
      "Intercambiador de calor del sistema de refrigeración del motor.",
    atributos: [
      {
        id: "tipo",
        pregunta:
          "¿Es el radiador de agua del motor, el del aceite, el intercooler (turbo) o el condensador del aire acondicionado?",
        tipo: {
          tipo: "opciones",
          valores: [
            "radiador de agua (motor)",
            "radiador de aceite",
            "intercooler (turbo)",
            "condensador de aire acondicionado",
          ],
        },
        obligatorio: true,
      },
      {
        id: "material",
        pregunta:
          "¿El radiador original es de aluminio o de cobre/bronce?",
        tipo: { tipo: "opciones", valores: ["aluminio", "cobre / bronce"] },
        obligatorio: false,
        ayuda: "Los autos modernos suelen tener aluminio. Los más viejos tienen cobre/bronce.",
      },
      {
        id: "con_condensador_ac",
        pregunta:
          "¿El auto tiene aire acondicionado? ¿El condensador viene pegado/integrado al radiador?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              PASARRUEDAS                            ║
  // ╚══════════════════════════════════════════════════════╝

  pasarruedas: {
    nombre: "Pasarruedas",
    sinonimos: [
      "pasarueda",
      "guardapolvo de rueda",
      "tapizado de arco",
      "tapizado de rueda",
      "wheel arch liner",
      "underseal de rueda",
      "guarda interior de rueda",
    ],
    descripcion:
      "Pieza plástica o de fibra que recubre el interior del arco de la rueda, " +
      "protegiendo la mecánica de barro y piedras.",
    atributos: [
      {
        id: "posicion",
        pregunta:
          "¿Qué pasarruedas necesitás: delantero izquierdo, delantero derecho, trasero izquierdo o trasero derecho?",
        tipo: {
          tipo: "opciones",
          valores: [
            "delantero izquierdo",
            "delantero derecho",
            "trasero izquierdo",
            "trasero derecho",
          ],
        },
        obligatorio: true,
      },
      {
        id: "material",
        pregunta:
          "¿El pasarruedas es de plástico duro, de material tipo alfombra (plástico suave/feltro), o de chapa?",
        tipo: {
          tipo: "opciones",
          valores: ["plástico duro", "alfombrado / feltro", "chapa"],
        },
        obligatorio: false,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              BISAGRAS                               ║
  // ╚══════════════════════════════════════════════════════╝

  bisagra: {
    nombre: "Bisagra",
    sinonimos: ["bisagra", "gozne", "hinge"],
    descripcion:
      "Articulación metálica que conecta puertas, capot o baúl a la carrocería.",
    atributos: [
      {
        id: "tipo",
        pregunta:
          "¿Es bisagra de capot, de puerta o de baúl/portón?",
        tipo: {
          tipo: "opciones",
          valores: ["capot", "puerta delantera", "puerta trasera", "baúl / portón"],
        },
        obligatorio: true,
      },
      {
        id: "posicion",
        pregunta: "¿Es la del lado izquierdo o derecho?",
        tipo: { tipo: "opciones", valores: ["izquierda", "derecha"] },
        obligatorio: true,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              ZÓCALOS Y MOLDURAS LATERALES           ║
  // ╚══════════════════════════════════════════════════════╝

  zocalo_lateral: {
    nombre: "Zócalo lateral / Moldura de puerta",
    sinonimos: [
      "zocalo",
      "zócalo",
      "moldura lateral",
      "moldura de puerta",
      "franja lateral",
      "sill",
      "side skirt",
      "spoiler lateral",
      "estibo",
    ],
    descripcion:
      "Franja o panel en la parte baja de las puertas/carrocería. " +
      "Puede ser una moldura plástica o un faldón deportivo.",
    atributos: [
      {
        id: "posicion",
        pregunta: "¿Es el zócalo del lado izquierdo o del derecho?",
        tipo: { tipo: "opciones", valores: ["izquierdo", "derecho"] },
        obligatorio: true,
      },
      {
        id: "tipo",
        pregunta:
          "¿Es una moldura fina/tira plástica, un zócalo completo que cubre todo el lateral, o un faldón deportivo (side skirt)?",
        tipo: {
          tipo: "opciones",
          valores: ["moldura / tira fina", "zócalo completo", "faldón deportivo / side skirt"],
        },
        obligatorio: true,
      },
      {
        id: "terminacion",
        pregunta:
          "¿Viene para pintar, negro mate, o cromado?",
        tipo: {
          tipo: "opciones",
          valores: ["para pintar", "negro mate / texturado", "cromado"],
        },
        obligatorio: true,
      },
    ],
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║              SPOILER / ALERON                       ║
  // ╚══════════════════════════════════════════════════════╝

  spoiler: {
    nombre: "Spoiler / Alerón",
    sinonimos: [
      "alerón",
      "spoiler",
      "aleron trasero",
      "alerón de baúl",
      "wing",
      "spoiler trasero",
    ],
    descripcion:
      "Alerón trasero que puede ir integrado al baúl/portón o ser una pieza independiente.",
    atributos: [
      {
        id: "posicion",
        pregunta:
          "¿El spoiler va integrado en la tapa del baúl o es un alerón elevado independiente?",
        tipo: {
          tipo: "opciones",
          valores: [
            "integrado / pegado en el baúl o techo",
            "alerón elevado independiente",
          ],
        },
        obligatorio: true,
      },
      {
        id: "terminacion",
        pregunta:
          "¿Viene para pintar (liso/imprimado) o ya viene con terminación?",
        tipo: {
          tipo: "opciones",
          valores: ["para pintar", "negro mate / texturado", "carbono"],
        },
        obligatorio: true,
      },
      {
        id: "con_stop",
        pregunta:
          "¿Tiene la luz de stop / tercera luz de freno integrada?",
        tipo: { tipo: "booleano" },
        obligatorio: false,
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers para el agente
// ─────────────────────────────────────────────────────────────

/**
 * Busca una pieza por nombre o sinónimo (case-insensitive, sin tildes).
 * Devuelve la clave del mapa PIEZAS o null si no se encontró.
 */
export function buscarPieza(query: string): string | null {
  const q = normalizarTexto(query);

  for (const [clave, def] of Object.entries(PIEZAS)) {
    if (
      normalizarTexto(def.nombre).includes(q) ||
      def.sinonimos.some((s) => normalizarTexto(s).includes(q) || q.includes(normalizarTexto(s)))
    ) {
      return clave;
    }
  }
  return null;
}

/**
 * Genera la representación compacta de todas las piezas para
 * incluirla en el system prompt sin desperdiciar tokens.
 *
 * Formato:
 *   [PARAGOLPES_DELANTERO]
 *   Alias: paragolpe delantero, bumper delantero...
 *   Preguntar:
 *   1. ¿Tiene agujeros para sensores? → [SÍ/NO]
 *   ...
 */
export function renderArbolParaPrompt(): string {
  const bloques: string[] = [];

  for (const [clave, def] of Object.entries(PIEZAS)) {
    const lines: string[] = [];
    lines.push(`[${clave.toUpperCase()}] ${def.nombre}`);
    lines.push(`Alias: ${def.sinonimos.slice(0, 5).join(", ")}`);
    lines.push("Confirmar:");

    def.atributos.forEach((attr, i) => {
      let opciones = "";
      if (attr.tipo.tipo === "booleano") {
        opciones = "[SÍ/NO]";
      } else if (attr.tipo.tipo === "opciones") {
        opciones = `[${attr.tipo.valores.join(" / ")}]`;
      } else if (attr.tipo.tipo === "numero") {
        opciones = "[número]";
      }
      const oblig = attr.obligatorio ? "✱" : "○";
      lines.push(`  ${i + 1}. ${oblig} ${attr.pregunta} → ${opciones}`);
    });

    if (def.nota_agente) {
      lines.push(`  ⚠ ${def.nota_agente}`);
    }

    bloques.push(lines.join("\n"));
  }

  return bloques.join("\n\n");
}

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
