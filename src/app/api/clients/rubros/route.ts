import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Renombra un rubro en todos los contactos. Empareja por texto "limpio" (trim)
// para agarrar variantes con espacios invisibles, y pagina la lectura para no
// quedarse con las primeras 1000 filas. Si "hacia" coincide con un rubro
// existente, quedan fusionados.
export async function POST(req: NextRequest) {
  const { desde, hacia } = await req.json()
  const from = (typeof desde === 'string' ? desde : '').trim()
  const to = (typeof hacia === 'string' ? hacia : '').trim()
  if (!from || !to) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const db = await createClient()

  // Traer todos los clientes en tandas de 1000 (Supabase corta ahí por consulta)
  const rows: { id: string; rubro: string | null }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('clients').select('id, rubro').order('id').range(offset, offset + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    rows.push(...(data as { id: string; rubro: string | null }[]))
    if (data.length < 1000) break
  }

  const ids = rows.filter(r => (r.rubro || '').trim() === from).map(r => r.id)
  if (ids.length === 0) return NextResponse.json({ updated: 0 })

  let updated = 0
  for (let i = 0; i < ids.length; i += 100) {
    const lote = ids.slice(i, i + 100)
    const { error } = await db.from('clients').update({ rubro: to }).in('id', lote)
    if (error) return NextResponse.json({ error: error.message, updated }, { status: 500 })
    updated += lote.length
  }
  return NextResponse.json({ updated })
}
