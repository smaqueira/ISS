// Enriquecimiento de contacto: a partir del nombre del negocio busca teléfono,
// dirección, web, Instagram y email para poder contactar sin buscar a mano.

import { searchPlaces } from '@/lib/prospecting/serper'
import { getSerperKeys, searchSerper } from '@/lib/link-hunt'

export interface Contacto {
  negocio?: string | null
  telefono?: string | null
  direccion?: string | null
  web?: string | null
  instagram?: string | null
  email?: string | null
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const NO_PERFIL = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts', 'about'])

/** Saca el @usuario de una URL o texto de Instagram. */
export function igDeTexto(v?: string | null): string | null {
  if (!v) return null
  const m = v.match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i)
  if (m && !NO_PERFIL.has(m[1].toLowerCase())) return m[1].toLowerCase()
  const arroba = v.match(/@([A-Za-z0-9._]{3,30})/)
  return arroba ? arroba[1].toLowerCase() : null
}

function emailDe(texto: string): string | null {
  const malos = /(sentry|wixpress|example|godaddy|cloudflare|w3\.org|schema\.org|googleapis|gstatic|\.png|\.jpg|\.svg)/i
  for (const m of texto.matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase()
    if (!malos.test(e) && !/^(no-?reply|noreply|postmaster)@/.test(e)) return e
  }
  return null
}

async function bajarPagina(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return ''
    const tipo = res.headers.get('content-type') || ''
    if (!tipo.includes('html') && !tipo.includes('text')) return ''
    return (await res.text()).slice(0, 300_000)
  } catch { return '' }
}

/**
 * Busca los datos de contacto de un negocio.
 * 1) Google Places (teléfono/dirección/web oficiales)
 * 2) La web del negocio (email)
 * 3) Búsqueda del Instagram
 */
export async function buscarContacto(
  negocio: string, zona: string, urlOriginal?: string | null,
): Promise<Contacto & { diagnostico: string[] }> {
  const out: Contacto & { diagnostico: string[] } = { negocio, diagnostico: [] }
  const log = (s: string) => out.diagnostico.push(s)
  const nombre = (negocio || '').trim()
  if (!nombre) { log('sin nombre de negocio'); return out }

  const keys = await getSerperKeys()
  if (!keys.length) { log('Serper no configurado'); return out }

  // 1) Google Places: la fuente más confiable de teléfono y dirección
  try {
    const lugares = await searchPlaces(nombre, zona || 'Buenos Aires')
    log(`places: ${lugares.length} resultados`)
    const l = lugares[0]
    if (l) {
      out.negocio = l.name || nombre
      out.telefono = l.phone || null
      out.direccion = l.address || null
      out.web = l.website || null
      const ig = igDeTexto(l.website)
      if (ig) { out.instagram = ig; out.web = null }
      log(`places → tel:${!!l.phone} dir:${!!l.address} web:${!!l.website}`)
    }
  } catch (e) { log(`places error: ${String(e).slice(0, 60)}`) }

  // 2) Instagram desde la URL original de la señal
  if (!out.instagram) out.instagram = igDeTexto(urlOriginal)

  // 3) Si no hay web, buscarla en Google (necesaria para sacar el email)
  if (!out.web) {
    try {
      const r = await searchSerper(`${nombre} ${zona}`, keys[0])
      const DIRECTORIOS = /tripadvisor|instagram|facebook|guiaoleo|restaurantguru|thefork|pedidosya|rappi|wikipedia|google\./i
      const cand = r.find(x => x.link && !DIRECTORIOS.test(x.link))
      if (cand?.link) { out.web = cand.link; log(`web por búsqueda: ${cand.link.slice(0, 40)}`) }
      // De paso, el Instagram si aparece
      if (!out.instagram) {
        for (const item of r) { const ig = igDeTexto(item.link); if (ig) { out.instagram = ig; break } }
      }
    } catch (e) { log(`búsqueda web error: ${String(e).slice(0, 50)}`) }
  }

  // 4) Email: home + páginas típicas de contacto
  if (out.web && !out.email) {
    try {
      const base = out.web.replace(/\/+$/, '')
      const paginas = await Promise.all([
        bajarPagina(base), bajarPagina(`${base}/contacto`),
        bajarPagina(`${base}/contact`), bajarPagina(`${base}/nosotros`),
      ])
      out.email = emailDe(paginas.join('\n'))
      log(out.email ? 'email encontrado en la web' : 'email no está en la web')
    } catch { log('no se pudo leer la web') }
  }

  // 5) Último intento de Instagram por búsqueda directa
  if (!out.instagram) {
    try {
      const r = await searchSerper(`${nombre} ${zona} instagram`, keys[0])
      for (const item of r) { const ig = igDeTexto(item.link); if (ig) { out.instagram = ig; break } }
      log(out.instagram ? 'instagram por búsqueda' : 'instagram no encontrado')
    } catch { /* opcional */ }
  }

  return out
}

/** Link de WhatsApp listo para abrir (si el teléfono sirve). */
export function waLink(tel?: string | null): string | null {
  const d = (tel || '').replace(/\D/g, '')
  if (d.length < 8) return null
  const full = d.startsWith('54') ? d : `54${d.replace(/^0/, '')}`
  return `https://wa.me/${full}`
}
