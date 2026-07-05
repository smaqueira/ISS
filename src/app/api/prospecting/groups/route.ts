import { NextRequest, NextResponse } from 'next/server'
import { huntLinks, getSerperKeys } from '@/lib/link-hunt'
import { verifyWhatsApp, verifyTelegram, extractCodes } from '@/lib/community-verify'

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

export async function POST(req: NextRequest) {
  const { zona, tema, platform } = await req.json()
  if (!zona) return NextResponse.json({ error: 'zona requerida' }, { status: 400 })

  const keys = await getSerperKeys()
  if (!keys.length) return NextResponse.json({ error: 'No hay clave Serper configurada' }, { status: 500 })

  const temaStr = tema || 'vecinos compras'

  // Queries naturales — los operadores site:/"" ya no devuelven resultados.
  // Los links de invitación viven DENTRO de las páginas resultado.
  const queriesByPlatform: Record<string, string[]> = {
    whatsapp: [
      `grupo whatsapp ${zona} ${temaStr} link`,
      `grupos de whatsapp ${zona} unirse link`,
    ],
    telegram: [
      `grupo telegram ${zona} ${temaStr} link`,
      `grupos de telegram ${zona} Argentina`,
    ],
    facebook: [
      `grupo facebook ${zona} ${temaStr}`,
      `grupo facebook vecinos ${zona} Argentina`,
    ],
  }
  const queries = platform ? queriesByPlatform[platform] || [] : Object.values(queriesByPlatform).flat()

  // 1. Buscar y entrar a las páginas resultado a cazar links
  const hunt = await huntLinks(queries, keys, 10)

  // Facebook no se puede verificar sin login — se listan directo del resultado
  const fbResults: GroupResult[] = []
  const seenFb = new Set<string>()
  for (const r of hunt.organics) {
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

  // 2. Extraer códigos de invitación de todo el texto cazado
  const { waCodes, tgUsers } = extractCodes(hunt.text)
  const tgPrivate = [...new Set(
    [...hunt.text.matchAll(/t\.me\/(?:\+|joinchat\/)([A-Za-z0-9_-]{10,})/g)].map(m => m[1])
  )].slice(0, 10)

  // 3. Verificar en paralelo — solo sobreviven los grupos VIVOS
  const [waVerified, tgVerified] = await Promise.all([
    (!platform || platform === 'whatsapp')
      ? Promise.all(waCodes.slice(0, 20).map(verifyWhatsApp)) : Promise.resolve([]),
    (!platform || platform === 'telegram')
      ? Promise.all(tgUsers.slice(0, 20).map(verifyTelegram)) : Promise.resolve([]),
  ])

  const results: GroupResult[] = [
    ...waVerified.filter((g): g is NonNullable<typeof g> => g !== null)
      .map(g => ({ title: g.title, link: g.link, snippet: 'Grupo activo verificado', platform: 'whatsapp' as const, members: g.members, verified: true })),
    ...tgVerified.filter((g): g is NonNullable<typeof g> => g !== null)
      .map(g => ({ title: g.title, link: g.link, snippet: g.description || 'Grupo/canal activo verificado', platform: 'telegram' as const, members: g.members, verified: true })),
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
    serper: hunt.serper,
  })
}
