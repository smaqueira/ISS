import { NextRequest, NextResponse } from 'next/server'
import { getSerperKeys, searchSerper } from '@/lib/link-hunt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Rutas de instagram.com que NO son perfiles
const NO_PERFIL = new Set([
  'p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts', 'about',
  'directory', 'web', 'privacy', 'legal', 'developer', 'business', 'help', 'press',
])

function extraerHandle(url: string): string | null {
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i)
  if (!m) return null
  const h = m[1].toLowerCase().replace(/\.$/, '')
  if (NO_PERFIL.has(h)) return null
  return h
}

export async function POST(req: NextRequest) {
  const { name, city } = await req.json()
  const nombre = (typeof name === 'string' ? name : '').trim()
  if (!nombre) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 })

  const keys = await getSerperKeys()
  if (!keys.length) return NextResponse.json({ error: 'Serper no está configurado (SERPER_API_KEY)' }, { status: 400 })

  const query = `${nombre} ${(city || '').trim()} instagram`.trim()

  let organics: { link?: string; title?: string; snippet?: string }[] = []
  for (const key of keys) {
    organics = await searchSerper(query, key)
    if (organics.length) break
  }

  const candidatos: string[] = []
  for (const r of organics) {
    const h = r.link ? extraerHandle(r.link) : null
    if (h && !candidatos.includes(h)) candidatos.push(h)
  }

  return NextResponse.json({ handle: candidatos[0] ?? null, candidatos: candidatos.slice(0, 5) })
}
