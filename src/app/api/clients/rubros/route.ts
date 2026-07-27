import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Renombra un rubro en todos los contactos. Empareja por el texto "limpio"
// (trim) para agarrar también las variantes con espacios invisibles. Si "hacia"
// coincide con un rubro existente, quedan fusionados.
export async function POST(req: NextRequest) {
  const { desde, hacia } = await req.json()
  const from = (typeof desde === 'string' ? desde : '').trim()
  const to = (typeof hacia === 'string' ? hacia : '').trim()
  if (!from || !to) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const db = await createClient()
  const { data: rows, error: e1 } = await db.from('clients').select('id, rubro')
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const ids = (rows || [])
    .filter(r => ((r.rubro as string) || '').trim() === from)
    .map(r => r.id as string)
  if (ids.length === 0) return NextResponse.json({ updated: 0 })

  // Actualizar en tandas para no armar URLs enormes
  let updated = 0
  for (let i = 0; i < ids.length; i += 100) {
    const lote = ids.slice(i, i + 100)
    const { error } = await db.from('clients').update({ rubro: to }).in('id', lote)
    if (error) return NextResponse.json({ error: error.message, updated }, { status: 500 })
    updated += lote.length
  }
  return NextResponse.json({ updated })
}
