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
    let saved = 0
    for (const g of grupos) {
      if (!g.link) continue
      const { error } = await db.from('grupos').upsert({
        zona: zona || '',
        tema: tema || '',
        title: g.title || '',
        link: g.link,
        platform: g.platform || 'otro',
        snippet: g.snippet || '',
      }, { onConflict: 'link', ignoreDuplicates: true })
      if (!error) saved++
    }
    return NextResponse.json({ saved })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
