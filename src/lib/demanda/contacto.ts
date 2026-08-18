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
export async function buscarContacto(negocio: string, zona: string, urlOriginal?: string | null): Promise<Contacto> {
  const out: Contacto = { negocio }
  const nombre = (negocio || '').trim()
  if (!nombre) return out

  // 1) Google Places: la fuente más confiable de teléfono y dirección
  try {
    const lugares = await searchPlaces(nombre, zona || 'Buenos Aires')
    const l = lugares[0]
    if (l) {
      out.negocio = l.name || nombre
      out.telefono = l.phone || null
      out.direccion = l.address || null
      out.web = l.website || null
      // Si el "sitio web" es el Instagram, se guarda como tal
      const ig = igDeTexto(l.website)
      if (ig) { out.instagram = ig; out.web = null }
    }
  } catch { /* sin places: seguimos con lo demás */ }

  // 2) Instagram desde la URL original de la señal
  if (!out.instagram) out.instagram = igDeTexto(urlOriginal)

  // 3) Email desde la web del negocio (home + contacto)
  if (out.web && !out.email) {
    const base = out.web.replace(/\/+$/, '')
    const paginas = await Promise.all([bajarPagina(base), bajarPagina(`${base}/contacto`)])
    out.email = emailDe(paginas.join('\n'))
  }

  // 4) Si falta Instagram, buscarlo en Google
  if (!out.instagram) {
    try {
      const keys = await getSerperKeys()
      if (keys.length) {
        const r = await searchSerper(`${nombre} ${zona} instagram`, keys[0])
        for (const item of r) {
          const ig = igDeTexto(item.link)
          if (ig) { out.instagram = ig; break }
        }
      }
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
