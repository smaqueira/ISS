import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// /api/settings expone TODAS las settings (incluidas API keys) → solo admin.
// Para valores públicos no sensibles existe /api/settings/public.
async function requireAdmin(): Promise<boolean> {
  return (await cookies()).get('iss_session')?.value === 'admin'
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = await createClient()
  const { data, error } = await db.from('settings').select('*').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const updates: { key: string; value: string }[] = await req.json()

  for (const { key, value } of updates) {
    await db.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }

  return NextResponse.json({ ok: true })
}
