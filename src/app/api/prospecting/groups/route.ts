import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'

interface GroupResult {
  title: string
  link: string
  snippet: string
  platform: 'whatsapp' | 'facebook' | 'telegram' | 'otro'
}

async function searchSerper(query: string, apiKey: string) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'ar', hl: 'es', num: 10 }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.organic || []
}

function detectPlatform(link: string): GroupResult['platform'] {
  if (link.includes('chat.whatsapp.com')) return 'whatsapp'
  if (link.includes('facebook.com/groups') || link.includes('fb.com/groups')) return 'facebook'
  if (link.includes('t.me')) return 'telegram'
  return 'otro'
}

export async function POST(req: NextRequest) {
  const { zona, tema } = await req.json()
  if (!zona) return NextResponse.json({ error: 'zona requerida' }, { status: 400 })

  const [k1, k2, k3] = await Promise.all([
    getSetting('SERPER_API_KEY'), getSetting('SERPER_API_KEY_2'), getSetting('SERPER_API_KEY_3'),
  ])
  const keys = [k1, k2, k3].filter(Boolean) as string[]
  if (!keys.length) return NextResponse.json({ error: 'No hay clave Serper configurada' }, { status: 500 })

  const temaStr = tema || 'vecinos compras'

  const queries = [
    `grupo whatsapp "${zona}" ${temaStr} Argentina link invitación`,
    `site:chat.whatsapp.com "${zona}" Argentina`,
    `grupo facebook "${zona}" ${temaStr} Argentina`,
    `"facebook.com/groups" "${zona}" ${temaStr} Argentina`,
    `site:t.me "${zona}" ${temaStr} Argentina`,
    `grupo telegram "${zona}" ${temaStr} Argentina`,
  ]

  const allResults: GroupResult[] = []
  const seen = new Set<string>()

  for (let i = 0; i < queries.length; i++) {
    const key = keys[i % keys.length]
    try {
      const organic = await searchSerper(queries[i], key)
      for (const r of organic) {
        if (!r.link || seen.has(r.link)) continue
        seen.add(r.link)
        allResults.push({
          title: r.title || '',
          link: r.link,
          snippet: r.snippet || '',
          platform: detectPlatform(r.link),
        })
      }
    } catch { continue }
  }

  // Priorizar WhatsApp y Facebook groups arriba
  allResults.sort((a, b) => {
    const order = { whatsapp: 0, facebook: 1, telegram: 2, otro: 3 }
    return order[a.platform] - order[b.platform]
  })

  return NextResponse.json({ results: allResults, zona, tema: temaStr })
}
