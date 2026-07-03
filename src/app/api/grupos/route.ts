import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const db = await createClient()
    const { data, error } = await db.from('grupos').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { zona, tema, grupos } = body
    if (!grupos || !Array.isArray(grupos) || grupos.length === 0) {
      return NextResponse.json({ saved: 0 })
    }
    const db = await createClient()

    const rows = grupos
      .filter((g: { link?: string }) => !!g.link)
      .map((g: { title?: string; link: string; platform?: string; snippet?: string }) => ({
        zona: zona || '',
        tema: tema || '',
        title: g.title || '',
        link: g.link,
        platform: g.platform || 'otro',
        snippet: g.snippet || '',
      }))

    if (rows.length === 0) return NextResponse.json({ saved: 0 })

    const { data, error } = await db.from('grupos').insert(rows).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ saved: data?.length || 0 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
