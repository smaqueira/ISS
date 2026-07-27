import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Renombra un rubro en todos los contactos. Si "hacia" coincide con un rubro
// existente, quedan fusionados (mismo string).
export async function POST(req: NextRequest) {
  const { desde, hacia } = await req.json()
  const from = typeof desde === 'string' ? desde : ''
  const to = typeof hacia === 'string' ? hacia.trim() : ''
  if (!from || !to) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const db = await createClient()
  const { data, error } = await db.from('clients').update({ rubro: to }).eq('rubro', from).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: data?.length || 0 })
}
