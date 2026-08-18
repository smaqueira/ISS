// Motor de búsqueda de señales de demanda.
// Fuentes MODULARES: cada conector devuelve Senal[] y se puede activar/desactivar
// sin tocar el resto. Solo fuentes públicas y APIs autorizadas (ver punto 16).

import { getSerperKeys, searchSerper } from '@/lib/link-hunt'
import type { Senal, Producto } from './ai'

export interface SenalCruda extends Senal {
  publicado_en?: string | null
}

/** Frases que delatan intención de compra (se combinan con las keywords del producto). */
const PATRONES_DEMANDA = [
  'busco proveedor de',
  'necesito comprar',
  'alguien vende',
  'donde comprar',
  'quiero comprar',
  'busco quien venda',
]

/** Arma las consultas a partir de las palabras clave del producto. */
export function construirQueries(productos: Producto[], zona: string, maxPorProducto = 3): string[] {
  const out: string[] = []
  for (const p of productos) {
    const terminos = [p.nombre, ...(p.keywords || [])].filter(Boolean).slice(0, 2)
    for (const t of terminos) {
      for (const patron of PATRONES_DEMANDA.slice(0, maxPorProducto)) {
        out.push(`"${patron} ${t}" ${zona}`.trim())
      }
    }
  }
  return [...new Set(out)]
}

// ── CONECTOR: buscador (Serper / Google) ─────────────────────
async function fuenteBuscador(queries: string[]): Promise<SenalCruda[]> {
  const keys = await getSerperKeys()
  if (!keys.length) throw new Error('Serper no está configurado (SERPER_API_KEY_1)')

  const out: SenalCruda[] = []
  for (let i = 0; i < queries.length; i++) {
    const key = keys[i % keys.length]
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
  fuentes?: { buscador?: boolean; rss?: boolean }
  rssUrls?: string[]
  maxQueries?: number
}

/** Ejecuta las fuentes activas y devuelve señales crudas deduplicadas por URL. */
export async function buscarSenales(o: OpcionesScan): Promise<{ senales: SenalCruda[]; queries: string[]; errores: string[] }> {
  const errores: string[] = []
  const usar = { buscador: true, rss: true, ...(o.fuentes || {}) }
  const queries = construirQueries(o.productos, o.zona).slice(0, o.maxQueries ?? 12)
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

/** Hash estable para deduplicar oportunidades ya guardadas. */
export function hashSenal(s: SenalCruda): string {
  const base = (s.url || `${s.titulo}|${s.fragmento}`).toLowerCase().trim()
  let h = 0
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
  return `d${h.toString(36)}`
}
