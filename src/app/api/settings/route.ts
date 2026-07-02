import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()
  const { data, error } = await db.from('settings').select('*').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const updates: { key: string; value: string }[] = await req.json()

  for (const { key, value } of updates) {
    await db.from('settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
  }

  return NextResponse.json({ ok: true })
}
