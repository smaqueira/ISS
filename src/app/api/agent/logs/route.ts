import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()
  const { data } = await db.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(200)
  return NextResponse.json(data || [])
}

export async function DELETE(req: Request) {
  const db = await createClient()
  const { searchParams } = new URL(req.url)
  const soloHoy = searchParams.get('hoy') === '1'

  let query = db.from('agent_logs').delete()
  if (soloHoy) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    query = query.gte('created_at', start.toISOString()) as typeof query
  } else {
    query = query.neq('id', '') as typeof query
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
