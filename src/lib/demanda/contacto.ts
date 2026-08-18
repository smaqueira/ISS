// Enriquecimiento de contacto: a partir del nombre del negocio busca teléfono,
// dirección, web, Instagram y email para poder contactar sin buscar a mano.

import { searchPlaces } from '@/lib/prospecting/serper'
import { getSerperKeys, searchSerper, exhaustedKeys } from '@/lib/link-hunt'

/**
 * Busca probando cada key hasta que una responda. Usar keys[0] a secas fallaba
 * siempre cuando la primera estaba sin créditos.
 */
async function buscar(query: string, keys: string[]) {
  const vivas = keys.filter(k => !exhaustedKeys.has(k))
  for (const k of (vivas.length ? vivas : keys)) {
    const r = await searchSerper(query, k)
    if (r.length) return r
  }
  return []
}

export interface Contacto {
  negocio?: string | null
  telefono?: string | null
  direccion?: string | null
  web?: string | null
  instagram?: string | null
  email?: string | null
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const NO_PERFIL = new Set([
  'p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts', 'about',
  'directoalpaladar', 'lanacion', 'clarin', 'infobae', 'tripadvisor',
])

/** Saca el @usuario de una URL o texto de Instagram. */
export function igDeTexto(v?: string | null): string | null {
  if (!v) return null
  const m = v.match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i)
  if (m && !NO_PERFIL.has(m[1].toLowerCase())) return m[1].toLowerCase()
  // @usuario suelto, pero NO la parte de un email (ahí el @ va pegado a texto)
  const arroba = v.match(/(?:^|[\s>("'])@([A-Za-z0-9._]{3,30})/)
  return arroba ? arroba[1].toLowerCase() : null
}

/** Teléfono argentino en cualquier formato habitual. */
const TEL_RE = /(?:\+?54\s*9?\s*)?(?:\(?0?11\)?|\(?0?\d{3,4}\)?)[\s.-]?\d{3,4}[\s.-]?\d{4}/g

function telefonoDe(texto: string): string | null {
  for (const m of texto.matchAll(TEL_RE)) {
    const bruto = m[0].trim()
    const d = bruto.replace(/\D/g, '')
    // Un teléfono AR tiene 10-13 dígitos: así se descartan años, precios y códigos
    if (d.length < 10 || d.length > 13) continue
    return bruto
  }
  return null
}

/** Dirección típica argentina: "Av. Córdoba 1234", "Gorriti 5555". */
function direccionDe(texto: string): string | null {
  const m = texto.match(/(?:Av\.?|Avenida|Calle)?\s*[A-ZÁÉÍÓÚÑ][\wáéíóúñ]{2,}(?:\s+[\wáéíóúñ]{2,}){0,3}\s+\d{2,5}\b/)
  return m ? m[0].trim().replace(/\s+/g, ' ') : null
}

function emailDe(texto: string): string | null {
  const malos = /(sentry|wixpress|example|godaddy|cloudflare|w3\.org|schema\.org|googleapis|gstatic|\.png|\.jpg|\.svg|sentry\.io)/i
  for (const m of texto.matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase()
    if (!malos.test(e) && !/^(no-?reply|noreply|postmaster)@/.test(e)) return e
  }
  return null
}

/** Extrae todo lo que se pueda de un texto (nota de apertura, web, etc.). */
export function contactosDeTexto(texto: string): Contacto {
  return {
    telefono: telefonoDe(texto),
    email: emailDe(texto),
    instagram: igDeTexto(texto),
    direccion: direccionDe(texto),
  }
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

/** Todos los @instagram de un HTML (para elegir el del negocio, no el del medio). */
function todosLosIg(html: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/instagram\.com\/([A-Za-z0-9._]{2,30})/gi)) {
    const h = m[1].toLowerCase()
    if (!NO_PERFIL.has(h) && !out.includes(h)) out.push(h)
  }
  return out
}

/**
 * Busca los datos de contacto de un negocio, en orden de confiabilidad:
 * 0) la nota original (los locales nuevos aún no están en Places)
 * 1) Google Places (teléfono / dirección / web)
 * 2) búsqueda de la web y del Instagram
 * 3) la web del negocio (email)
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

  // 0) LA NOTA ORIGINAL
  if (urlOriginal) {
    const html = await bajarPagina(urlOriginal)
    if (html) {
      const plano = html
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
      out.telefono = telefonoDe(plano)
      out.email = emailDe(html) || emailDe(plano)
      out.direccion = direccionDe(plano)
      // Preferir un IG mencionado en el texto; si no, el último del HTML
      // (los del medio suelen ir primero, en el encabezado)
      const igs = todosLosIg(html)
      out.instagram = igDeTexto(plano) || igs[igs.length - 1] || null
      log(`nota: tel=${!!out.telefono} ig=${!!out.instagram} mail=${!!out.email} dir=${!!out.direccion}`)
    } else log('no se pudo leer la nota original')
  }

  // 1) Google Places (completa lo que falte, no pisa lo de la nota)
  try {
    const lugares = await searchPlaces(nombre, zona || 'Buenos Aires')
    log(`places: ${lugares.length} resultados`)
    const l = lugares[0]
    if (l) {
      out.negocio = l.name || nombre
      out.telefono = out.telefono || l.phone || null
      out.direccion = out.direccion || l.address || null
      const ig = igDeTexto(l.website)
      if (ig) out.instagram = out.instagram || ig
      else out.web = out.web || l.website || null
      log(`places: tel=${!!l.phone} dir=${!!l.address} web=${!!l.website}`)
    }
  } catch (e) { log(`places error: ${String(e).slice(0, 60)}`) }

  if (!out.instagram) out.instagram = igDeTexto(urlOriginal)

  // 2) Buscar web e Instagram en Google
  if (!out.web || !out.instagram) {
    const r = await buscar(`${nombre} ${zona}`, keys)
    log(`búsqueda "${nombre}": ${r.length} resultados`)
    const DIRECTORIOS = /tripadvisor|instagram|facebook|guiaoleo|restaurantguru|thefork|pedidosya|rappi|wikipedia|google\./i
    if (!out.web) {
      const cand = r.find(x => x.link && !DIRECTORIOS.test(x.link))
      if (cand?.link) { out.web = cand.link; log('web encontrada') }
    }
    if (!out.instagram) {
      for (const item of r) { const ig = igDeTexto(item.link); if (ig) { out.instagram = ig; break } }
    }
  }

  // 3) Email desde la web del negocio
  if (out.web && !out.email) {
    const base = out.web.replace(/\/+$/, '')
    const paginas = await Promise.all([
      bajarPagina(base), bajarPagina(`${base}/contacto`),
      bajarPagina(`${base}/contact`), bajarPagina(`${base}/nosotros`),
    ])
    out.email = emailDe(paginas.join('\n'))
    log(out.email ? 'email en la web' : 'la web no publica email')
  }

  // 4) Último intento de Instagram
  if (!out.instagram) {
    const r = await buscar(`${nombre} ${zona} instagram`, keys)
    for (const item of r) { const ig = igDeTexto(item.link); if (ig) { out.instagram = ig; break } }
    log(out.instagram ? 'instagram por búsqueda' : 'instagram no encontrado')
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
