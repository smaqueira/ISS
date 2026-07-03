import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()
  const { data } = await db.from('grupos').select('*').order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const { zona, tema, grupos } = await req.json()
  const db = await createClient()

  // Traer links ya guardados para evitar duplicados
  const { data: existing } = await db.from('grupos').select('link')
  const existingLinks = new Set((existing || []).map((g: { link: string }) => g.link))

  const nuevos = (grupos as { title: string; link: string; platform: string; snippet: string }[])
    .filter(g => !existingLinks.has(g.link))
    .map(g => ({ zona, tema, title: g.title, link: g.link, platform: g.platform, snippet: g.snippet || '' }))

  if (nuevos.length > 0) {
    await db.from('grupos').insert(nuevos)
  }

  return NextResponse.json({ saved: nuevos.length })
}
