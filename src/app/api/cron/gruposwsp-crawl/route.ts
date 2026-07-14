import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Términos de búsqueda relevantes para Vitto Mare (gastronomía, ventas, negocios)
const TERMINOS = [
  'ventas', 'negocios', 'emprendedores', 'gastronomia', 'delivery',
  'compras', 'mayorista', 'distribuidores', 'restaurantes', 'almacen',
  'supermercado', 'carniceria', 'pescados', 'mariscos', 'dietetica',
  'foodie', 'cocina', 'catering', 'fiambres', 'gourmet',
]

// Categorías del sitio con rutas conocidas
const CATEGORIAS_URL = [
  'compra-y-venta',
  'emprendedores-y-negocios',
  'gastronomia',
  'ventas',
]

interface GrupoExtraido {
  nombre: string
  slug: string
  url_interna: string
  categoria_sitio: string
  publico: boolean
  termino: string
}

function slugToNombre(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function extraerGrupos(html: string, termino: string): GrupoExtraido[] {
  const grupos: GrupoExtraido[] = []
  const vistos = new Set<string>()

  // Extraer todos los /grupo/ID-slug del HTML — funciona con cualquier estructura
  const regex = /\/grupo\/(\d+)-([a-z0-9\-]+)/g
  let match
  while ((match = regex.exec(html)) !== null) {
    const url_interna = `/grupo/${match[1]}-${match[2]}`
    if (vistos.has(url_interna)) continue
    vistos.add(url_interna)

    // Buscar el nombre real cerca del link en el HTML (ventana de 300 chars)
    const pos = match.index
    const ventana = html.substring(pos, pos + 400)
    // Intentar extraer texto entre tags después del href
    const textoMatch = ventana.match(/>([^<]{3,80})</)
    const nombre = textoMatch
      ? textoMatch[1].replace(/[^\w\sÀ-ɏ🇦🇷🤝💬🔒🌐]/g, '').trim()
      : slugToNombre(match[2])

    if (!nombre || nombre.length < 3) continue

    grupos.push({
      nombre: nombre || slugToNombre(match[2]),
      slug: match[2],
      url_interna,
      categoria_sitio: termino,
      publico: !ventana.includes('🔒') && !ventana.includes('Privado'),
      termino,
    })
  }

  return grupos
}

async function fetchGrupos(url: string, termino: string): Promise<GrupoExtraido[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const html = await res.text()

    // Verificar rate limit
    if (html.includes("session limit") || html.includes("Too Many Requests")) {
      console.warn(`Rate limit en ${url}`)
      return []
    }

    return extraerGrupos(html, termino)
  } catch (e) {
    console.error(`Error fetching ${url}:`, e)
    return []
  }
}

async function crawl() {
  const db = await createClient()

  // Cursor para rotar por términos (no gastar todos de una)
  const { data: cursorRow } = await db.from('settings').select('value').eq('key', 'GRUPOSWSP_CURSOR').single()
  const cursor = parseInt(cursorRow?.value || '0', 10)
  const termino = TERMINOS[cursor % TERMINOS.length]

  const urls = [
    `https://gruposwsp.com/?q=${encodeURIComponent(termino)}&pais=AR`,
    `https://gruposwsp.com/?q=${encodeURIComponent(termino + ' argentina')}&pais=AR`,
  ]

  // Esperar entre requests para no quemar rate limit
  const grupos: GrupoExtraido[] = []
  for (const url of urls) {
    const found = await fetchGrupos(url, termino)
    grupos.push(...found)
    await new Promise(r => setTimeout(r, 2000))
  }

  // Deduplicar por url_interna
  const vistos = new Set<string>()
  const unicos = grupos.filter(g => {
    if (vistos.has(g.url_interna)) return false
    vistos.add(g.url_interna)
    return true
  })

  // Verificar cuáles ya están guardados
  const links = unicos.map(g => `https://gruposwsp.com${g.url_interna}`)
  const { data: existing } = await db.from('communities').select('link').in('link', links)
  const yaGuardados = new Set((existing || []).map(r => r.link))

  const nuevos = unicos.filter(g => !yaGuardados.has(`https://gruposwsp.com${g.url_interna}`))

  if (!nuevos.length) {
    await db.from('settings').upsert({ key: 'GRUPOSWSP_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })
    return { termino, encontrados: grupos.length, nuevos: 0, info: 'todos ya guardados' }
  }

  // Guardar en communities — el link es la URL de gruposwsp que hace redirect a WA
  const rows = nuevos.map(g => ({
    title: g.nombre,
    description: '',
    link: `https://gruposwsp.com${g.url_interna}`,
    platform: 'whatsapp',
    members: null,
    categoria: g.categoria_sitio,
    provincia: 'Buenos Aires',
    ciudad: null,
    idioma: 'es',
    score: 50,
    status: 'activo',
    source_query: `gruposwsp · ${g.termino}`,
  }))

  const { data: saved, error } = await db.from('communities').upsert(rows, { onConflict: 'link' }).select()
  if (error) return { error: error.message, termino }

  await db.from('settings').upsert({ key: 'GRUPOSWSP_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })

  return {
    termino,
    encontrados: grupos.length,
    nuevos: saved?.length || 0,
    ejemplos: nuevos.slice(0, 5).map(g => g.nombre),
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }
  return NextResponse.json(await crawl())
}

export async function POST() {
  return NextResponse.json(await crawl())
}
