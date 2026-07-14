import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// URLs SSR confirmadas que contienen grupos en el HTML inicial
// El sitio bloquea /?q=... (carga grupos por JS), pero las páginas de categoría son SSR
const PAGINAS = [
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina', categoria: 'argentina', ciudad: null },
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina/buenos-aires', categoria: 'argentina', ciudad: 'Buenos Aires' },
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina/ciudad-autonoma-de-buenos-aires', categoria: 'argentina', ciudad: 'CABA' },
  { url: 'https://gruposwsp.com/grupos-whatsapp-negocios', categoria: 'negocios', ciudad: null },
  { url: 'https://gruposwsp.com/grupos-whatsapp-emprendedores', categoria: 'emprendedores', ciudad: null },
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina/san-isidro', categoria: 'argentina', ciudad: 'San Isidro' },
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina/pilar', categoria: 'argentina', ciudad: 'Pilar' },
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina/la-plata', categoria: 'argentina', ciudad: 'La Plata' },
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina/mar-del-plata', categoria: 'argentina', ciudad: 'Mar del Plata' },
  { url: 'https://gruposwsp.com/grupos-whatsapp-pais-argentina/mendoza', categoria: 'argentina', ciudad: 'Mendoza' },
]

function slugToNombre(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function extraerGruposDeHTML(html: string, categoria: string, ciudad: string | null) {
  const grupos: { nombre: string; url_interna: string; categoria: string; ciudad: string | null }[] = []
  const vistos = new Set<string>()
  const regex = /href="(\/grupo\/(\d+)-([a-z0-9-]+))"/g
  let m
  while ((m = regex.exec(html)) !== null) {
    const url_interna = m[1]
    if (vistos.has(url_interna)) continue
    vistos.add(url_interna)
    // Buscar texto del link en los 300 chars siguientes
    const ventana = html.substring(m.index, m.index + 300)
    const textoM = ventana.match(/>([^<]{3,80})</)
    const nombre = textoM ? textoM[1].replace(/[^\w\sÀ-ɏáéíóúÁÉÍÓÚñÑüÜ]/g, '').trim() : slugToNombre(m[3])
    if (!nombre || nombre.length < 3) continue
    grupos.push({ nombre, url_interna, categoria, ciudad })
  }
  return grupos
}

async function fetchPagina(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return { html: '', status: res.status }
    return { html: await res.text(), status: res.status }
  } catch (e) {
    return { html: '', status: 0, error: String(e) }
  }
}

async function crawl() {
  const db = await createClient()

  // Cursor para rotar por página (no quemar todas de una)
  const { data: cursorRow } = await db.from('settings').select('value').eq('key', 'GRUPOSWSP_CURSOR').single()
  const cursor = parseInt(cursorRow?.value || '0', 10)
  const pagina = PAGINAS[cursor % PAGINAS.length]

  const { html, status } = await fetchPagina(pagina.url)

  if (!html) {
    await db.from('settings').upsert({ key: 'GRUPOSWSP_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })
    return { pagina: pagina.url, status, error: 'Sin respuesta o bloqueado' }
  }

  const grupos = extraerGruposDeHTML(html, pagina.categoria, pagina.ciudad)

  if (!grupos.length) {
    await db.from('settings').upsert({ key: 'GRUPOSWSP_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })
    return { pagina: pagina.url, status, encontrados: 0, info: 'Sin grupos en el HTML (posible bloqueo o página vacía)', htmlSnippet: html.slice(0, 300) }
  }

  // Filtrar ya guardados
  const links = grupos.map(g => `https://gruposwsp.com${g.url_interna}`)
  const { data: existing } = await db.from('communities').select('link').in('link', links)
  const yaGuardados = new Set((existing || []).map(r => r.link))
  const nuevos = grupos.filter(g => !yaGuardados.has(`https://gruposwsp.com${g.url_interna}`))

  await db.from('settings').upsert({ key: 'GRUPOSWSP_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })

  if (!nuevos.length) {
    return { pagina: pagina.url, encontrados: grupos.length, nuevos: 0, info: 'todos ya guardados' }
  }

  const rows = nuevos.map(g => ({
    title: g.nombre,
    description: '',
    link: `https://gruposwsp.com${g.url_interna}`,
    platform: 'whatsapp',
    members: null,
    categoria: g.categoria,
    provincia: 'Buenos Aires',
    ciudad: g.ciudad,
    idioma: 'es',
    score: 50,
    status: 'activo',
    source_query: `gruposwsp · ${pagina.url.split('/').pop()}`,
  }))

  const { data: saved, error } = await db.from('communities').upsert(rows, { onConflict: 'link' }).select()
  if (error) return { error: error.message, pagina: pagina.url }

  return {
    pagina: pagina.url,
    encontrados: grupos.length,
    nuevos: saved?.length || 0,
    ejemplos: nuevos.slice(0, 5).map(g => g.nombre),
  }
}

export async function GET() {
  return NextResponse.json(await crawl())
}

export async function POST() {
  return NextResponse.json(await crawl())
}
