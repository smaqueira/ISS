import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'
import { ask, parseJSON } from '@/lib/ai/client'
import { verifyWhatsApp, verifyTelegram, verifyDiscord, verifyLink, extractCodes, VerifiedCommunity } from '@/lib/community-verify'

export const runtime = 'nodejs'
export const maxDuration = 60

// Matriz de rastreo: cada ejecución avanza una celda (ciudad × categoría).
// Con 1 corrida diaria cubre toda la matriz en ~3 meses y vuelve a empezar
// (los grupos ya guardados solo se actualizan).
const CIUDADES = [
  'Palermo', 'Recoleta', 'Belgrano', 'Caballito', 'Almagro', 'Villa Crespo', 'Flores', 'Nuñez',
  'San Isidro', 'Vicente Lopez', 'Tigre', 'Pilar', 'Escobar', 'Quilmes', 'Lanus', 'Avellaneda',
  'Moron', 'La Plata', 'Mar del Plata', 'Rosario', 'Cordoba', 'Mendoza', 'Tucuman', 'Salta',
  'Neuquen', 'Bariloche', 'Santa Fe', 'Bahia Blanca', 'Buenos Aires', 'Argentina',
]
const CATEGORIAS = [
  'compra venta', 'vecinos', 'emprendedores', 'gastronomia', 'inmuebles', 'autos',
  'mascotas', 'tecnologia', 'gaming', 'criptomonedas', 'inversiones', 'fitness',
  'educacion', 'empleo', 'delivery comida',
]

async function searchSerper(query: string, apiKey: string) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'ar', hl: 'es', num: 20 }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.organic || []
}

interface Clasificacion {
  link: string
  categoria: string
  provincia: string | null
  ciudad: string | null
  idioma: string
  score: number
}

async function clasificar(items: VerifiedCommunity[]): Promise<Clasificacion[]> {
  if (!items.length) return []
  const lista = items.map(c => `- link: ${c.link}\n  nombre: ${c.title}\n  descripcion: ${c.description || '(sin descripción)'}\n  miembros: ${c.members ?? 'desconocido'}`).join('\n')
  const prompt = `Clasificá estas comunidades online argentinas. Para cada una devolvé:
- categoria: una etiqueta corta en minúsculas (ej: "compra venta", "vecinos", "tecnologia", "gaming", "inmuebles", "mascotas", "cripto", "empleo"...). Creá la categoría que mejor describa, no te limites a una lista.
- provincia: provincia argentina si se puede inferir (ej: "Buenos Aires", "Cordoba", "Santa Fe"), o null
- ciudad: ciudad o barrio si se puede inferir (ej: "Palermo", "Rosario"), o null
- idioma: código de 2 letras (es, en, pt...)
- score: 0-100 estimando calidad para marketing (miembros, especificidad, señales de spam en el nombre)

COMUNIDADES:
${lista}

Respondé SOLO un array JSON: [{"link":"...","categoria":"...","provincia":null,"ciudad":null,"idioma":"es","score":50}]`
  try {
    return parseJSON<Clasificacion[]>(await ask(prompt, 1500))
  } catch {
    return items.map(c => ({ link: c.link, categoria: 'sin clasificar', provincia: null, ciudad: null, idioma: 'es', score: 40 }))
  }
}

async function crawl() {
  const db = await createClient()

  const [k1, k2, k3] = await Promise.all([
    getSetting('SERPER_API_KEY'), getSetting('SERPER_API_KEY_2'), getSetting('SERPER_API_KEY_3'),
  ])
  const keys = [k1, k2, k3].filter(Boolean) as string[]
  if (!keys.length) return { error: 'Sin claves Serper' }

  // Cursor de la matriz guardado en settings
  const cursorRaw = await getSetting('COMMUNITY_CRAWL_CURSOR')
  const cursor = parseInt(cursorRaw, 10) || 0
  const total = CIUDADES.length * CATEGORIAS.length
  const cell = cursor % total
  const ciudad = CIUDADES[cell % CIUDADES.length]
  const categoria = CATEGORIAS[Math.floor(cell / CIUDADES.length) % CATEGORIAS.length]

  // 1. Buscar links en Google para esta celda
  const queries = [
    `site:chat.whatsapp.com "${ciudad}" ${categoria}`,
    `"chat.whatsapp.com" grupo "${ciudad}" ${categoria}`,
    `site:t.me "${ciudad}" ${categoria}`,
    `site:discord.gg OR site:discord.com "${ciudad}" ${categoria}`,
  ]
  const searches = await Promise.all(queries.map((q, i) => searchSerper(q, keys[i % keys.length]).catch(() => [])))
  const allText = searches.flat().map((r: { link?: string; title?: string; snippet?: string }) =>
    `${r.link || ''} ${r.title || ''} ${r.snippet || ''}`).join('\n')

  const { waCodes, tgUsers, dcCodes } = extractCodes(allText)

  // 2. Verificar (solo los que no están ya en la base)
  const candidates = [
    ...waCodes.map(c => `https://chat.whatsapp.com/${c}`),
    ...tgUsers.map(u => `https://t.me/${u}`),
    ...dcCodes.map(c => `https://discord.gg/${c}`),
  ]
  const { data: existing } = await db.from('communities').select('link').in('link', candidates)
  const known = new Set((existing || []).map(r => r.link))

  const [wa, tg, dc] = await Promise.all([
    Promise.all(waCodes.filter(c => !known.has(`https://chat.whatsapp.com/${c}`)).slice(0, 12).map(verifyWhatsApp)),
    Promise.all(tgUsers.filter(u => !known.has(`https://t.me/${u}`)).slice(0, 12).map(verifyTelegram)),
    Promise.all(dcCodes.filter(c => !known.has(`https://discord.gg/${c}`)).slice(0, 10).map(verifyDiscord)),
  ])
  let vivos = [...wa, ...tg, ...dc].filter((c): c is VerifiedCommunity => c !== null)

  // Rastreo en cadena: las descripciones de los grupos vivos suelen mencionar
  // otros grupos ("canal hermano: @..."). Se descubren gratis, sin Serper.
  const chainText = vivos.map(c => c.description).join('\n')
  const chain = extractCodes(chainText)
  const yaVistos = new Set([...vivos.map(v => v.link), ...known])
  const chainCandidates = [
    ...chain.waCodes.map(c => `https://chat.whatsapp.com/${c}`),
    ...chain.tgUsers.map(u => `https://t.me/${u}`),
    ...chain.dcCodes.map(c => `https://discord.gg/${c}`),
  ].filter(l => !yaVistos.has(l))
  if (chainCandidates.length) {
    const { data: chainKnown } = await db.from('communities').select('link').in('link', chainCandidates)
    const chainKnownSet = new Set((chainKnown || []).map(r => r.link))
    const encadenados = await Promise.all(
      chainCandidates.filter(l => !chainKnownSet.has(l)).slice(0, 10).map(verifyLink)
    )
    vivos = [...vivos, ...encadenados.filter((c): c is VerifiedCommunity => c !== null)]
  }

  // 3. Clasificar con IA y guardar
  const clasificaciones = await clasificar(vivos)
  const byLink = new Map(clasificaciones.map(c => [c.link, c]))
  const rows = vivos.map(c => {
    const cl = byLink.get(c.link)
    return {
      title: c.title,
      description: c.description,
      link: c.link,
      platform: c.platform,
      members: c.members,
      categoria: cl?.categoria || 'sin clasificar',
      provincia: cl?.provincia || null,
      ciudad: cl?.ciudad || null,
      idioma: cl?.idioma || 'es',
      score: cl?.score ?? 40,
      status: 'activo',
      source_query: `${ciudad} · ${categoria}`,
    }
  })
  let saved = 0
  if (rows.length) {
    const { data, error } = await db.from('communities').upsert(rows, { onConflict: 'link' }).select()
    if (error) return { error: error.message }
    saved = data?.length || 0
    // Primer snapshot de cada comunidad guardada (histórico de miembros)
    const snaps = (data || [])
      .filter(r => r.members != null)
      .map(r => ({ community_id: r.id, members: r.members, status: 'activo' }))
    if (snaps.length) await db.from('community_snapshots').insert(snaps)
  }

  // 4. Re-verificar los 8 más viejos para detectar caídos
  const { data: stale } = await db.from('communities')
    .select('id, link').eq('status', 'activo')
    .order('last_checked', { ascending: true }).limit(8)
  let caidos = 0
  for (const s of stale || []) {
    const alive = await verifyLink(s.link)
    await db.from('communities').update({
      status: alive ? 'activo' : 'caido',
      last_checked: new Date().toISOString(),
      ...(alive?.members ? { members: alive.members } : {}),
    }).eq('id', s.id)
    // Snapshot de cada chequeo → curva de crecimiento en el tiempo
    await db.from('community_snapshots').insert({
      community_id: s.id,
      members: alive?.members ?? null,
      status: alive ? 'activo' : 'caido',
    })
    if (!alive) caidos++
  }

  // 5. Avanzar cursor
  await db.from('settings').upsert({ key: 'COMMUNITY_CRAWL_CURSOR', value: String(cursor + 1) }, { onConflict: 'key' })

  return { celda: `${ciudad} × ${categoria}`, encontrados: candidates.length, verificados: vivos.length, guardados: saved, caidos }
}

// Cron diario (protegido)
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }
  return NextResponse.json(await crawl())
}

// Ejecución manual desde el panel admin
export async function POST() {
  return NextResponse.json(await crawl())
}
