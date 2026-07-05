// Motor de caza de links de invitación.
// Google ya no responde a operadores (site:, comillas) vía Serper, así que:
// 1. Buscamos con queries naturales
// 2. Entramos a cada página resultado y extraemos los links del HTML
//    (los links de grupos viven DENTRO de directorios, posteos e Instagram)

import { getSetting } from '@/lib/settings'

export interface OrganicResult { link?: string; title?: string; snippet?: string }

export const exhaustedKeys = new Set<string>()

export async function getSerperKeys(): Promise<string[]> {
  const [k0, k1, k2, k3] = await Promise.all([
    getSetting('SERPER_API_KEY'), getSetting('SERPER_API_KEY_1'),
    getSetting('SERPER_API_KEY_2'), getSetting('SERPER_API_KEY_3'),
  ])
  return [...new Set([k0, k1, k2, k3].filter(Boolean))] as string[]
}

export async function searchSerper(query: string, apiKey: string): Promise<OrganicResult[]> {
  try {
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
  } catch { return [] }
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const type = res.headers.get('content-type') || ''
    if (!type.includes('html') && !type.includes('json') && !type.includes('text')) return ''
    return (await res.text()).slice(0, 500_000)
  } catch { return '' }
}

export interface HuntResult {
  text: string            // todo el texto donde buscar códigos de invitación
  organics: OrganicResult[]
  serper: { clavesTotal: number; clavesAgotadas: number; sinCreditos: boolean }
}

export async function huntLinks(queries: string[], keys: string[], maxPages = 10): Promise<HuntResult> {
  // 1. Búsquedas en paralelo
  const searches = await Promise.all(
    queries.map((q, i) => searchSerper(q, keys[i % keys.length]))
  )
  const organics = searches.flat()

  // 2. Texto base: links + títulos + snippets de los resultados
  const parts = organics.map(r => `${r.link || ''} ${r.title || ''} ${r.snippet || ''}`)

  // 3. Entrar a las páginas resultado y sumar su HTML
  //    (acá es donde están la mayoría de los links de grupos)
  const pageUrls = [...new Set(
    organics
      .map(r => r.link || '')
      .filter(l => l.startsWith('http'))
      // los links directos de invitación no hace falta abrirlos, ya los tenemos
      .filter(l => !/chat\.whatsapp\.com|discord\.gg/.test(l))
  )].slice(0, maxPages)

  const pages = await Promise.all(pageUrls.map(fetchPage))
  parts.push(...pages)

  return {
    text: parts.join('\n'),
    organics,
    serper: {
      clavesTotal: keys.length,
      clavesAgotadas: keys.filter(k => exhaustedKeys.has(k)).length,
      sinCreditos: keys.length > 0 && keys.every(k => exhaustedKeys.has(k)),
    },
  }
}
