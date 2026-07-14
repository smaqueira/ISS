import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSerperKeys, searchSerper } from '@/lib/link-hunt'

export const runtime = 'nodejs'
export const maxDuration = 60

const TERMINOS = [
  'ventas', 'negocios', 'emprendedores', 'gastronomia', 'delivery',
  'compras', 'mayorista', 'distribuidores', 'restaurantes', 'almacen',
  'supermercado', 'carniceria', 'pescados', 'mariscos', 'dietetica',
  'foodie', 'cocina', 'catering', 'fiambres', 'gourmet',
]

function slugToNombre(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Extrae /grupo/ID-slug de una URL o snippet de Google
function extraerSlugDeUrl(url: string): { id: string; slug: string } | null {
  const m = url.match(/\/grupo\/(\d+)-([a-z0-9-]+)/)
  return m ? { id: m[1], slug: m[2] } : null
}

async function crawl() {
  const db = await createClient()

  const keys = await getSerperKeys()
  if (!keys.length) return { error: 'Sin claves Serper configuradas' }
  const key = keys[0]

  // Cursor para rotar por términos
  const { data: cursorRow } = await db.from('settings').select('value').eq('key', 'GRUPOSWSP_CURSOR').single()
  const cursor = parseInt(cursorRow?.value || '0', 10)
  const termino = TERMINOS[cursor % TERMINOS.length]

  // Buscar en Google con Serper — buscamos páginas que MENCIONAN/LINKEAN a gruposwsp
  // (site: no funciona porque Google no indexa bien gruposwsp.com)
  const queries = [
    `"gruposwsp.com/grupo" ${termino} argentina`,
    `gruposwsp.com grupo whatsapp ${termino} argentina link unirse`,
  ]

  const vistos = new Set<string>()
  const grupos: { nombre: string; url_interna: string; termino: string }[] = []

  for (const q of queries) {
    const results = await searchSerper(q, key)
    for (const r of results) {
      const url = r.link || ''
      const parsed = extraerSlugDeUrl(url)
      if (!parsed) continue
      const url_interna = `/grupo/${parsed.id}-${parsed.slug}`
      if (vistos.has(url_interna)) continue
      vistos.add(url_interna)
      // Nombre desde título del resultado, o derivado del slug
      const nombre = r.title
        ? r.title.replace(/\s*[-|].*$/, '').trim()
        : slugToNombre(parsed.slug)
      if (nombre.length < 3) continue
      grupos.push({ nombre, url_interna, termino })
    }
  }

  if (!grupos.length) {
    await db.from('settings').upsert({ key: 'GRUPOSWSP_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })
    return { termino, encontrados: 0, nuevos: 0, info: 'Google no devolvió resultados de gruposwsp' }
  }

  // Filtrar ya guardados
  const links = grupos.map(g => `https://gruposwsp.com${g.url_interna}`)
  const { data: existing } = await db.from('communities').select('link').in('link', links)
  const yaGuardados = new Set((existing || []).map(r => r.link))
  const nuevos = grupos.filter(g => !yaGuardados.has(`https://gruposwsp.com${g.url_interna}`))

  if (!nuevos.length) {
    await db.from('settings').upsert({ key: 'GRUPOSWSP_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })
    return { termino, encontrados: grupos.length, nuevos: 0, info: 'todos ya guardados' }
  }

  const rows = nuevos.map(g => ({
    title: g.nombre,
    description: '',
    link: `https://gruposwsp.com${g.url_interna}`,
    platform: 'whatsapp',
    members: null,
    categoria: g.termino,
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

export async function GET() {
  return NextResponse.json(await crawl())
}

export async function POST() {
  return NextResponse.json(await crawl())
}
