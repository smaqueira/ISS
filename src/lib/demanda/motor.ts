// Motor de búsqueda de señales de demanda.
// Fuentes MODULARES: cada conector devuelve Senal[] y se puede activar/desactivar
// sin tocar el resto. Solo fuentes públicas y APIs autorizadas (ver punto 16).

import { getSerperKeys, searchSerper, todasAgotadas, exhaustedKeys } from '@/lib/link-hunt'
import type { Senal, Producto } from './ai'

export interface SenalCruda extends Senal {
  publicado_en?: string | null
}

/**
 * Frases que delatan intención de compra. SIN comillas: la frase exacta casi
 * nunca aparece indexada y mata los resultados. Google entiende la intención.
 */
/**
 * Consultas CORTAS. Aprendido a los golpes: las queries largas (con "site:",
 * zona completa tipo "CABA y GBA", varios modificadores) devuelven CERO
 * resultados. Google necesita frases simples.
 */
/**
 * Frases que escribe un COMPRADOR, no un vendedor. Las genéricas tipo
 * "proveedor de X" están copadas por el SEO de las pescaderías: devuelven
 * competidores. Las de pregunta/recomendación aparecen en foros y grupos.
 */
const PATRONES_DEMANDA = [
  'alguien conoce proveedor',
  'recomiendan proveedor',
  'donde consigo',
]

/** Foros y comunidades donde los compradores preguntan (no venden). */
const SITIOS_PREGUNTA = ['site:reddit.com']

/**
 * COMPRADORES NUEVOS: un local que abre necesita proveedor sí o sí, y esas
 * aperturas SÍ están indexadas (prensa gastronómica, avisos de personal).
 * Rinde mucho más que buscar pedidos de compra, que casi no se publican.
 */
const PATRONES_APERTURA = [
  'nuevo restaurante abrió',
  'nueva apertura gastronómica',
  'abre sus puertas restaurante',
  'restaurante busca cocinero',
  'nuevo local gastronómico',
]

/** Arma consultas simples a partir de las palabras clave del producto. */
export function construirQueries(productos: Producto[], zona: string, clientes: string[] = []): string[] {
  const out: string[] = []
  // Solo el primer token geográfico: "CABA y GBA" → "CABA". Más que eso mata la búsqueda.
  const geo = (zona || 'Buenos Aires').split(/\s*(?:,|\by\b)\s*/)[0].trim() || 'Buenos Aires'
  const cli = clientes.find(c => c !== 'consumidor final')

  // 1) COMPRADORES NUEVOS (lo que más rinde): aperturas en la zona.
  for (const patron of PATRONES_APERTURA) out.push(`${patron} ${geo}`)
  if (cli) out.push(`nuevo ${cli} ${geo} apertura`)

  // 2) PEDIDOS DE COMPRA (menos frecuentes, pero valiosos cuando aparecen)
  for (const p of productos) {
    const terminos = [...new Set([p.nombre, ...(p.keywords || [])].map(t => (t || '').trim()).filter(Boolean))].slice(0, 2)
    for (const t of terminos) {
      for (const patron of PATRONES_DEMANDA) out.push(`${patron} ${t}`)
      for (const sitio of SITIOS_PREGUNTA) out.push(`${sitio} ${t} proveedor`)
    }
  }
  return [...new Set(out)]
}

// ── CONECTOR: buscador (Serper / Google) ─────────────────────
async function fuenteBuscador(queries: string[]): Promise<SenalCruda[]> {
  const keys = await getSerperKeys()
  if (!keys.length) throw new Error('Serper no está configurado (SERPER_API_KEY_1)')

  const out: SenalCruda[] = []
  let turno = 0
  for (let i = 0; i < queries.length; i++) {
    // Usar solo keys vivas: rotar sobre las agotadas desperdicia consultas.
    const vivas = keys.filter(k => !exhaustedKeys.has(k))
    if (!vivas.length) {
      throw new Error('Las API keys de Serper se quedaron sin créditos. Cargá una nueva en Configuración → Serper API Key.')
    }
    const key = vivas[turno++ % vivas.length]
    const organics = await searchSerper(queries[i], key)
    for (const r of organics) {
      if (!r.link || !r.title) continue
      out.push({
        titulo: r.title,
        fragmento: r.snippet || r.title,
        url: r.link,
        fuente: 'google',
      })
    }
    if (todasAgotadas(keys)) {
      throw new Error('Las API keys de Serper se quedaron sin créditos. Renovalas o cargá una nueva en Configuración → Serper API Key.')
    }
  }
  return out
}

// ── CONECTOR: RSS (feeds que carga el usuario) ───────────────
async function fuenteRSS(urls: string[]): Promise<SenalCruda[]> {
  const out: SenalCruda[] = []
  for (const u of urls) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const xml = (await res.text()).slice(0, 300_000)
      const items = xml.split(/<item[\s>]/i).slice(1, 21)
      for (const it of items) {
        const tag = (t: string) => {
          const m = it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))
          return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : ''
        }
        const titulo = tag('title')
        if (!titulo) continue
        out.push({
          titulo,
          fragmento: tag('description') || titulo,
          url: tag('link'),
          fuente: 'rss',
          publicado_en: tag('pubDate') || null,
        })
      }
    } catch { /* feed caído: seguir */ }
  }
  return out
}

export interface OpcionesScan {
  productos: Producto[]
  zona: string
  clientes?: string[]
  fuentes?: { buscador?: boolean; rss?: boolean }
  rssUrls?: string[]
  maxQueries?: number
}

/** Ejecuta las fuentes activas y devuelve señales crudas deduplicadas por URL. */
export async function buscarSenales(o: OpcionesScan): Promise<{ senales: SenalCruda[]; queries: string[]; errores: string[] }> {
  const errores: string[] = []
  const usar = { buscador: true, rss: true, ...(o.fuentes || {}) }
  const queries = construirQueries(o.productos, o.zona, o.clientes).slice(0, o.maxQueries ?? 12)
  let senales: SenalCruda[] = []

  if (usar.buscador && queries.length) {
    try { senales = senales.concat(await fuenteBuscador(queries)) }
    catch (e) { errores.push(`buscador: ${e instanceof Error ? e.message : String(e)}`) }
  }
  if (usar.rss && o.rssUrls?.length) {
    try { senales = senales.concat(await fuenteRSS(o.rssUrls)) }
    catch (e) { errores.push(`rss: ${String(e)}`) }
  }

  // Dedup por URL (o por título si no hay URL)
  const vistos = new Set<string>()
  const unicas = senales.filter(s => {
    const k = (s.url || s.titulo).toLowerCase().trim()
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })

  return { senales: unicas, queries, errores }
}

/**
 * Descarta ruido evidente ANTES de gastar una llamada de IA: recetas, wikipedia,
 * videos, y tiendas online (son competidores vendiendo, no compradores).
 */
const DOMINIOS_RUIDO = /youtube\.com|youtu\.be|wikipedia\.org|tiktok\.com|pinterest\.|cookpad|recetas?|paulinacocina|directoalpaladar/i
const TITULO_RUIDO = /receta|recipe|c[oó]mo (hacer|preparar|cocinar)|paso a paso|ingredientes|beneficios|propiedades/i

/** Páginas de VENTA (competidores). Son la mayoría de lo que devuelve Google. */
const ES_VENDEDOR = /venta al por mayor|tienda online|comprar online|nuestros productos|precios? y ofertas|distribuidora|pescader[ií]a|frigor[ií]fico|mayorista de|env[ií]os? a domicilio|agregar al carrito|\$\s?\d/i
const URL_TIENDA = /\/(tienda|shop|productos?|catalogo|store|comprar)\b/i

/** Señales de negocio NUEVO (apertura, expansión, armado de equipo). */
const ES_NEGOCIO_NUEVO = /abri[oó]|abre sus puertas|nueva? (apertura|sucursal|local)|inaugur|reci[eé]n abierto|pr[oó]xima apertura|busca cocinero|suma[n]? equipo/i

export function esRuidoObvio(s: SenalCruda): boolean {
  const url = s.url || ''
  const txt = `${s.titulo} ${s.fragmento || ''}`
  if (DOMINIOS_RUIDO.test(url) || TITULO_RUIDO.test(txt)) return true
  // No descartar si es comprador preguntando O un negocio nuevo (apertura)
  const vale = /busco|necesito|alguien (sabe|conoce|tiene)|recomiend|d[oó]nde consigo|me pasan/i.test(txt)
    || ES_NEGOCIO_NUEVO.test(txt)
  return (ES_VENDEDOR.test(txt) || URL_TIENDA.test(url)) && !vale
}

/** Hash estable para deduplicar oportunidades ya guardadas. */
export function hashSenal(s: SenalCruda): string {
  const base = (s.url || `${s.titulo}|${s.fragmento}`).toLowerCase().trim()
  let h = 0
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
  return `d${h.toString(36)}`
}
