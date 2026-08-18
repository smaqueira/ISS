// Capa de IA del Buscador de Demanda — desacoplada del proveedor.
// Si mañana se cambia Groq por otro modelo, solo se toca ask() en lib/ai/client.

import { ask, parseJSON } from '@/lib/ai/client'

export type Intencion = 'ninguna' | 'baja' | 'alta' | 'muy_alta'

export interface Producto {
  id: string
  nombre: string
  categoria?: string | null
  keywords?: string[] | null
  sinonimos?: string[] | null
  marcas?: string[] | null
  variantes?: string[] | null
  zona?: string | null
}

export interface Senal {
  titulo: string
  fragmento: string
  url?: string
  fuente?: string
}

export interface Analisis {
  intencion: Intencion
  producto_nombre: string | null
  match_pct: number
  tipo_comprador: string | null
  cantidad: string | null
  unidad: string | null
  ubicacion: string | null
  urgencia: string | null      // alta | media | baja
  presupuesto: string | null
  necesidad: string | null
  explicacion: string
}

const VACIO: Analisis = {
  intencion: 'ninguna', producto_nombre: null, match_pct: 0, tipo_comprador: null,
  cantidad: null, unidad: null, ubicacion: null, urgencia: null, presupuesto: null,
  necesidad: null, explicacion: 'No se pudo analizar',
}

/**
 * detectIntent + extractEntities + classifyBuyer + matchProduct en una sola
 * pasada (1 llamada por señal, para no quemar cuota).
 * NUNCA inventa datos: lo que no está, vuelve null.
 */
export async function analizarSenal(
  senal: Senal,
  productos: Producto[],
  clientesObjetivo: string[],
  zona: string,
): Promise<Analisis> {
  const catalogo = productos.map(p => {
    const alias = [...(p.keywords || []), ...(p.sinonimos || [])].filter(Boolean).join(', ')
    return `- ${p.nombre}${p.categoria ? ` (${p.categoria})` : ''}${alias ? ` — también: ${alias}` : ''}`
  }).join('\n') || '- (sin productos cargados)'

  const prompt = `Sos un analista comercial. Decidís si un texto público representa una OPORTUNIDAD COMERCIAL para un negocio que vende a otros negocios.

QUÉ VENDE EL NEGOCIO:
${catalogo}

CLIENTES OBJETIVO: ${clientesObjetivo.join(', ') || 'cualquiera'}
ZONA COMERCIAL: ${zona || 'no definida'}

HAY DOS TIPOS DE OPORTUNIDAD:

A) PEDIDO DE COMPRA — alguien busca comprar o busca proveedor.
B) COMPRADOR NUEVO — un negocio del rubro objetivo que ABRIÓ hace poco, está por abrir,
   se está expandiendo (nueva sucursal), o está armando equipo de cocina.
   Un local nuevo necesita proveedores sí o sí: ES una oportunidad aunque no pida nada.

NIVELES DE INTENCIÓN (elegí uno):
- "ninguna": receta, opinión, noticia sin negocio concreto, Wikipedia, o un VENDEDOR
  promocionando (pescadería, distribuidora, tienda). También un directorio o listado genérico.
- "baja": negocio del rubro objetivo mencionado, pero sin señal de novedad ni de pedido.
- "alta": pedido de proveedor explícito, O un negocio del rubro que abrió / está por abrir /
  suma sucursal / busca personal de cocina.
- "muy_alta": pedido con cantidad, plazo o urgencia, O apertura inminente/reciente
  con nombre y ubicación concretos.

REGLA CRÍTICA: si es alguien que VENDE lo mismo que nosotros (competidor), es "ninguna".
SOBRE LOS LISTADOS:
- "Los 10 MEJORES restaurantes de siempre" → "ninguna" (ranking, no dice nada nuevo).
- "Las 10 APERTURAS del mes" / "nuevos locales que abrieron" → "alta": cada uno es un
  comprador nuevo. En ese caso poné en "necesidad": "negocio nuevo: aperturas recientes"
  y en "producto_nombre" el producto nuestro que le serviría.
REGLA CRÍTICA: NO inventes datos. Si un dato no está en el texto, poné null.
En "necesidad" indicá cuál de los dos tipos es: "pedido: ..." o "negocio nuevo: ...".

Respondé SOLO JSON sin markdown:
{"intencion":"ninguna|baja|alta|muy_alta",
 "producto_nombre":"nombre EXACTO de la lista de arriba o null",
 "match_pct":0-100,
 "tipo_comprador":"restaurante|hotel|distribuidor|consumidor final|supermercado|comercio|empresa|null",
 "cantidad":"solo el número si aparece, o null",
 "unidad":"kg|cajas|unidades|null",
 "ubicacion":"lugar mencionado o null",
 "urgencia":"alta|media|baja|null",
 "presupuesto":"si aparece, o null",
 "necesidad":"resumen en 10 palabras de lo que necesita",
 "explicacion":"1 oración: por qué es (o no) una oportunidad"}

TEXTO A ANALIZAR:
Título: ${senal.titulo}
Contenido: ${senal.fragmento.slice(0, 1200)}`

  try {
    const raw = await ask(prompt, 400)
    const r = parseJSON<Partial<Analisis>>(raw)
    const inten = (['ninguna', 'baja', 'alta', 'muy_alta'] as const).includes(r.intencion as Intencion)
      ? (r.intencion as Intencion) : 'ninguna'
    return {
      intencion: inten,
      producto_nombre: r.producto_nombre || null,
      match_pct: Math.max(0, Math.min(100, Number(r.match_pct) || 0)),
      tipo_comprador: r.tipo_comprador || null,
      cantidad: r.cantidad || null,
      unidad: r.unidad || null,
      ubicacion: r.ubicacion || null,
      urgencia: r.urgencia || null,
      presupuesto: r.presupuesto || null,
      necesidad: r.necesidad || null,
      explicacion: r.explicacion || '',
    }
  } catch (e) {
    // Importante: dejar visible POR QUÉ falló. Si se traga el error, una señal
    // buena termina contada como "ruido" y parece que no hay demanda.
    return { ...VACIO, explicacion: `ERROR IA: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200) }
  }
}

// ─────────────────────────────────────────────────────────────
// SCORE: determinístico y explicable (no lo decide la IA).
// ─────────────────────────────────────────────────────────────
export interface ScoreDetalle { label: string; puntos: number }
export interface ScoreResult { score: number; detalle: ScoreDetalle[]; resumen: string }

export function calcularScore(a: Analisis, opts: {
  clientesObjetivo: string[]
  zona: string
  publicadoEn?: Date | null
  ajusteAprendizaje?: number   // -15..+15 según feedback histórico
}): ScoreResult {
  const d: ScoreDetalle[] = []

  // Intención de compra (lo que más pesa)
  const porIntencion: Record<Intencion, number> = { ninguna: 0, baja: 12, alta: 25, muy_alta: 30 }
  d.push({ label: 'Intención de compra', puntos: porIntencion[a.intencion] })

  // Coincidencia con mi producto
  d.push({ label: 'Coincidencia producto', puntos: Math.round((a.match_pct / 100) * 25) })

  // Cliente objetivo
  const comprador = (a.tipo_comprador || '').toLowerCase()
  const esObjetivo = opts.clientesObjetivo.some(c => comprador.includes(c.toLowerCase()) || c.toLowerCase().includes(comprador))
  d.push({ label: 'Cliente objetivo', puntos: comprador ? (esObjetivo ? 15 : 4) : 0 })

  // Ubicación compatible
  const ub = (a.ubicacion || '').toLowerCase()
  const zonaTokens = (opts.zona || '').toLowerCase().split(/[\s,]+/).filter(t => t.length > 3)
  const zonaOk = ub && zonaTokens.some(t => ub.includes(t))
  d.push({ label: 'Ubicación compatible', puntos: zonaOk ? 10 : (ub ? 3 : 0) })

  // Urgencia
  const urg = (a.urgencia || '').toLowerCase()
  d.push({ label: 'Urgencia', puntos: urg === 'alta' ? 10 : urg === 'media' ? 5 : 0 })

  // Cantidad concreta = comprador serio
  d.push({ label: 'Cantidad concreta', puntos: a.cantidad ? 6 : 0 })

  // Comprador nuevo (apertura/expansión): necesita proveedor sí o sí
  if (/negocio nuevo|apertura|abri[oó]|inaugur|nueva sucursal/i.test(a.necesidad || '')) {
    d.push({ label: 'Negocio nuevo (necesita proveedor)', puntos: 12 })
  }

  // Publicación reciente
  if (opts.publicadoEn) {
    const dias = (Date.now() - opts.publicadoEn.getTime()) / 86400000
    d.push({ label: 'Publicación reciente', puntos: dias <= 3 ? 4 : dias <= 14 ? 2 : 0 })
  }

  // Ajuste por aprendizaje (feedback del usuario)
  if (opts.ajusteAprendizaje) {
    d.push({ label: 'Aprendizaje (tu feedback)', puntos: opts.ajusteAprendizaje })
  }

  const total = Math.max(0, Math.min(100, d.reduce((s, x) => s + x.puntos, 0)))

  const esNuevo = /negocio nuevo|apertura|abri[oó]|inaugur|nueva sucursal/i.test(a.necesidad || '')
  const partes: string[] = []
  if (esNuevo) partes.push('es un negocio nuevo que va a necesitar proveedor')
  else if (a.intencion === 'muy_alta') partes.push('busca proveedor con una necesidad concreta')
  else if (a.intencion === 'alta') partes.push('busca proveedor explícitamente')
  else if (a.intencion === 'baja') partes.push('hace una consulta general')
  if (a.cantidad) partes.push(`menciona ${a.cantidad}${a.unidad ? ' ' + a.unidad : ''}`)
  if (urg === 'alta') partes.push('lo necesita con urgencia')
  if (zonaOk) partes.push('está dentro de tu zona comercial')
  if (esObjetivo && comprador) partes.push(`es ${a.tipo_comprador}, tu cliente objetivo`)

  const nivel = total >= 80 ? 'prioritaria' : total >= 60 ? 'alta' : total >= 40 ? 'media' : 'baja'
  const resumen = partes.length
    ? `La oportunidad tiene prioridad ${nivel} porque ${partes.join(', ')}.`
    : `Prioridad ${nivel}: la señal no muestra intención de compra clara.`

  return { score: total, detalle: d, resumen }
}

// ─────────────────────────────────────────────────────────────
export async function generarMensajeVenta(params: {
  negocio: string
  descripcionNegocio: string
  producto: string
  tipoComprador: string | null
  necesidad: string | null
  ubicacion: string | null
  zona: string
}): Promise<string> {
  const esNuevo = /negocio nuevo|apertura|abri[oó]|inaugur|nueva sucursal/i.test(params.necesidad || '')

  const prompt = `Escribí un primer mensaje comercial breve.

MI NEGOCIO: ${params.negocio} — ${params.descripcionNegocio}
ZONA DE COBERTURA: ${params.zona}
PRODUCTO: ${params.producto}
A QUIÉN ESCRIBO: ${params.tipoComprador || 'no identificado'}
CONTEXTO: ${params.necesidad || 'no identificado'}
UBICACIÓN: ${params.ubicacion || 'no identificada'}

${esNuevo
  ? 'SITUACIÓN: es un negocio que abrió hace poco o está por abrir. NO pidió nada: lo contactamos nosotros. Felicitalo brevemente por la apertura y ofrecete como proveedor.'
  : 'SITUACIÓN: publicó que busca comprar o busca proveedor. Mencioná que viste su búsqueda, sin sonar invasivo.'}

REGLAS:
- Máximo 45 palabras. Español rioplatense, tuteo, cordial y directo.
- Ofrecé disponibilidad/precios y cerrá con una pregunta simple.
- Nada de precios inventados ni promesas que no pueda garantizar.
- PROHIBIDO usar las palabras "fresco", "frescos", "fresca" o "frescura": el producto
  no se vende como fresco. Usá "de calidad", "seleccionados" o "cadena de frío".
- Máximo 1 emoji. Sin links.

Respondé SOLO el texto del mensaje.`
  try {
    return sinFresco((await ask(prompt, 200)).trim())
  } catch {
    return sinFresco(`Hola, vi que estás buscando ${params.producto}. Trabajamos ${params.descripcionNegocio} con entrega en ${params.zona}. ¿Querés que te pase disponibilidad y precios?`)
  }
}

/**
 * Red de seguridad: el producto NO se vende como fresco. Si la IA (o la
 * descripción del negocio) mete "fresco/frescura", se reemplaza por un claim real.
 */
export function sinFresco(texto: string): string {
  return texto
    .replace(/\bfrescos\b/gi, 'de calidad')
    .replace(/\bfrescas\b/gi, 'de calidad')
    .replace(/\bfresco\b/gi, 'de calidad')
    .replace(/\bfresca\b/gi, 'de calidad')
    .replace(/\bfrescura\b/gi, 'calidad')
}

// ─────────────────────────────────────────────────────────────
export async function resumirDemanda(datos: {
  producto: string
  oportunidades: number
  porComprador: Record<string, number>
  variacionPct: number | null
}): Promise<string> {
  const detalle = Object.entries(datos.porComprador).map(([k, v]) => `${v} ${k}`).join(', ')
  const prompt = `En 1 oración (máximo 30 palabras), explicá esta tendencia de demanda para un vendedor. Español rioplatense, directo, sin floritura.

Producto: ${datos.producto}
Oportunidades detectadas: ${datos.oportunidades} (${detalle})
Variación vs 7 días: ${datos.variacionPct === null ? 'sin datos' : datos.variacionPct + '%'}

Respondé SOLO la oración.`
  try {
    return (await ask(prompt, 120)).trim()
  } catch {
    return `Se detectaron ${datos.oportunidades} oportunidades de ${datos.producto}.`
  }
}

// ─────────────────────────────────────────────────────────────
// Interpreta una búsqueda en lenguaje natural y la convierte en filtros.
export interface FiltrosNL {
  producto?: string; tipo_comprador?: string; ubicacion?: string
  score_min?: number; intencion?: string; estado?: string
}
export async function interpretarBusqueda(q: string): Promise<FiltrosNL> {
  const prompt = `Convertí esta búsqueda en filtros JSON. Si algo no se menciona, omitilo.
Campos posibles: producto, tipo_comprador, ubicacion, score_min (número), intencion (baja|alta|muy_alta), estado.

Búsqueda: "${q}"

Respondé SOLO JSON sin markdown.`
  try {
    return parseJSON<FiltrosNL>(await ask(prompt, 150))
  } catch {
    return {}
  }
}
