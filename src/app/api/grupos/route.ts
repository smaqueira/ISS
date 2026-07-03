import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()
  const { data } = await db.from('grupos').select('*').order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { zona, tema, grupos } = body

  if (!grupos || !Array.isArray(grupos) || grupos.length === 0) {
    return NextResponse.json({ saved: 0, error: 'sin grupos' })
  }

  const db = await createClient()

  const { data: existing } = await db.from('grupos').select('link')
  const existingLinks = new Set((existing || []).map((g: { link: string }) => g.link))

  const nuevos = grupos
    .filter((g: { link: string }) => g.link && !existingLinks.has(g.link))
    .map((g: { title: string; link: string; platform: string; snippet: string }) => ({
      zona: zona || '',
      tema: tema || '',
      title: g.title || '',
      link: g.link,
      platform: g.platform || 'otro',
      snippet: g.snippet || '',
    }))

  if (nuevos.length === 0) return NextResponse.json({ saved: 0 })

  const { error } = await db.from('grupos').insert(nuevos)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ saved: nuevos.length })
}
