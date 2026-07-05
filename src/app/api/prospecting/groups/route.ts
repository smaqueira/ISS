import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'

export const runtime = 'nodejs'
export const maxDuration = 60

interface GroupResult {
  title: string
  link: string
  snippet: string
  platform: 'whatsapp' | 'facebook' | 'telegram'
  members: number | null
  verified: boolean
}

// status de créditos por clave: se marca agotada si Serper devuelve 403/429
const exhaustedKeys = new Set<string>()

async function searchSerper(query: string, apiKey: string) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'ar', hl: 'es', num: 20 }),
  })
  if (res.status === 403 || res.status === 429) {
    exhaustedKeys.add(apiKey)
    return []
  }
  if (!res.ok) return []
  const data = await res.json()
  return data.organic || []
}

function getMeta(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i')
  const m = html.match(re) || html.match(re2)
  return m ? m[1] : null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
}

// Verifica un link de invitación de WhatsApp: la página pública muestra
// el nombre real del grupo en og:title si el link sigue activo
async function verifyWhatsApp(code: string): Promise<GroupResult | null> {
  try {
    const res = await fetch(`https://chat.whatsapp.com/${code}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const title = getMeta(html, 'og:title')
    // Link vencido/revocado → og:title genérico o ausente
    if (!title || /whatsapp group invite/i.test(title)) return null
    return {
      title: decodeEntities(title),
      link: `https://chat.whatsapp.com/${code}`,
      snippet: 'Grupo activo verificado',
      platform: 'whatsapp',
      members: null,
      verified: true,
    }
  } catch { return null }
}

// Verifica un username público de Telegram: t.me/<user> muestra
// nombre y cantidad de miembros en los meta tags
async function verifyTelegram(username: string): Promise<GroupResult | null> {
  try {
    const res = await fetch(`https://t.me/${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const title = getMeta(html, 'og:title')
    const desc = getMeta(html, 'og:description') || ''
    if (!title || /^telegram: contact/i.test(title)) return null
    // Solo grupos/canales (tienen "members"/"subscribers"), no perfiles personales
    const m = desc.match(/([\d\s.,]+)\s*(members|subscribers|miembros|suscriptores)/i)
    const extra = html.match(/([\d\s.,]+)\s*(members|subscribers)/i)
    const raw = m?.[1] || extra?.[1]
    const members = raw ? parseInt(raw.replace(/[\s.,]/g, ''), 10) || null : null
    if (!m && !extra && !/tgme_page_extra/.test(html)) return null
    return {
      title: decodeEntities(title),
      link: `https://t.me/${username}`,
      snippet: 'Grupo/canal activo verificado',
      platform: 'telegram',
      members,
      verified: true,
    }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const { zona, tema, platform } = await req.json()
  if (!zona) return NextResponse.json({ error: 'zona requerida' }, { status: 400 })

  const [k1, k2, k3] = await Promise.all([
    getSetting('SERPER_API_KEY'), getSetting('SERPER_API_KEY_2'), getSetting('SERPER_API_KEY_3'),
  ])
  const keys = [k1, k2, k3].filter(Boolean) as string[]
  if (!keys.length) return NextResponse.json({ error: 'No hay clave Serper configurada' }, { status: 500 })

  const temaStr = tema || 'vecinos compras'

  // Queries por plataforma — apuntan a que el link de invitación aparezca en el resultado
  const queriesByPlatform: Record<string, string[]> = {
    whatsapp: [
      `site:chat.whatsapp.com "${zona}"`,
      `"chat.whatsapp.com" grupo "${zona}" Argentina`,
      `"chat.whatsapp.com" "${zona}" ${temaStr}`,
      `grupo whatsapp ${zona} Argentina link unirse "chat.whatsapp.com"`,
    ],
    telegram: [
      `site:t.me "${zona}"`,
      `"t.me/" grupo telegram "${zona}" Argentina`,
      `telegram grupo ${zona} ${temaStr} Argentina "t.me"`,
    ],
    facebook: [
      `site:facebook.com/groups "${zona}" ${temaStr}`,
      `grupo facebook "${zona}" vecinos Argentina`,
    ],
  }
  const queries = platform ? queriesByPlatform[platform] || [] : Object.values(queriesByPlatform).flat()

  // 1. Buscar en Google y juntar TODO el texto (links + snippets contienen invitaciones)
  const rawTexts: string[] = []
  const fbResults: GroupResult[] = []
  const seenFb = new Set<string>()

  const searches = await Promise.all(
    queries.map((q, i) => searchSerper(q, keys[i % keys.length]).catch(() => []))
  )
  for (const organic of searches) {
    for (const r of organic) {
      rawTexts.push(`${r.link || ''} ${r.title || ''} ${r.snippet || ''}`)
      // Facebook no se puede verificar sin login — se listan directo
      const fbMatch = (r.link || '').match(/facebook\.com\/groups\/([^/?#]+)/)
      if (fbMatch && !seenFb.has(fbMatch[1])) {
        seenFb.add(fbMatch[1])
        fbResults.push({
          title: (r.title || '').replace(/\s*\|\s*Facebook.*$/i, ''),
          link: `https://www.facebook.com/groups/${fbMatch[1]}`,
          snippet: r.snippet || '',
          platform: 'facebook',
          members: null,
          verified: false,
        })
      }
    }
  }
  const allText = rawTexts.join('\n')

  // 2. Extraer códigos de invitación de WhatsApp y usernames de Telegram
  const waCodes = [...new Set(
    [...allText.matchAll(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{18,24})/g)].map(m => m[1])
  )].slice(0, 20)

  const tgUsers = [...new Set(
    [...allText.matchAll(/t\.me\/(?:s\/)?([A-Za-z][A-Za-z0-9_]{4,31})(?![A-Za-z0-9_])/g)]
      .map(m => m[1])
      .filter(u => !['share', 'joinchat', 'addstickers', 'proxy', 'socks', 'iv', 'setlanguage'].includes(u.toLowerCase()))
  )].slice(0, 20)

  // Links privados de Telegram (t.me/+hash o joinchat) — no verificables pero valiosos
  const tgPrivate = [...new Set(
    [...allText.matchAll(/t\.me\/(?:\+|joinchat\/)([A-Za-z0-9_-]{10,})/g)].map(m => m[1])
  )].slice(0, 10)

  // 3. Verificar todos en paralelo — solo sobreviven los grupos VIVOS
  const [waVerified, tgVerified] = await Promise.all([
    (!platform || platform === 'whatsapp')
      ? Promise.all(waCodes.map(verifyWhatsApp)) : Promise.resolve([]),
    (!platform || platform === 'telegram')
      ? Promise.all(tgUsers.map(verifyTelegram)) : Promise.resolve([]),
  ])

  const results: GroupResult[] = [
    ...waVerified.filter((g): g is GroupResult => g !== null),
    ...tgVerified.filter((g): g is GroupResult => g !== null),
    ...(!platform || platform === 'telegram'
      ? tgPrivate.map(h => ({
          title: 'Grupo privado de Telegram',
          link: `https://t.me/+${h}`,
          snippet: 'Link de invitación privado — verificalo al abrir',
          platform: 'telegram' as const,
          members: null,
          verified: false,
        }))
      : []),
    ...(!platform || platform === 'facebook' ? fbResults : []),
  ]

  // Verificados y con más miembros primero
  results.sort((a, b) => Number(b.verified) - Number(a.verified) || (b.members || 0) - (a.members || 0))

  return NextResponse.json({
    results,
    zona,
    tema: temaStr,
    stats: {
      linksEncontrados: waCodes.length + tgUsers.length + tgPrivate.length + fbResults.length,
      verificados: results.filter(r => r.verified).length,
    },
    serper: {
      clavesTotal: keys.length,
      clavesAgotadas: keys.filter(k => exhaustedKeys.has(k)).length,
      sinCreditos: keys.every(k => exhaustedKeys.has(k)),
    },
  })
}
