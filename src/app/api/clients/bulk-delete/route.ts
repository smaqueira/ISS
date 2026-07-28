import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Borra contactos en masa: por lista de ids, o por rubro entero (empareja por
// texto "limpio" y pagina la lectura). Solo admin.
export async function POST(req: NextRequest) {
  const store = await cookies()
  if (store.get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado (solo admin)' }, { status: 403 })
  }

  const { ids, rubro } = await req.json()
  const db = await createClient()

  let objetivo: string[] = []

  if (Array.isArray(ids) && ids.length) {
    objetivo = ids.filter((x: unknown): x is string => typeof x === 'string')
  } else if (typeof rubro === 'string' && rubro.trim()) {
    const from = rubro.trim()
    const rows: { id: string; rubro: string | null }[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from('clients').select('id, rubro').order('id').range(offset, offset + 999)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) break
      rows.push(...(data as { id: string; rubro: string | null }[]))
      if (data.length < 1000) break
    }
    objetivo = rows.filter(r => (r.rubro || '').trim() === from).map(r => r.id)
  } else {
    return NextResponse.json({ error: 'Faltan datos (ids o rubro)' }, { status: 400 })
  }

  if (objetivo.length === 0) return NextResponse.json({ deleted: 0 })

  let deleted = 0
  for (let i = 0; i < objetivo.length; i += 100) {
    const lote = objetivo.slice(i, i + 100)
    const { error } = await db.from('clients').delete().in('id', lote)
    if (error) return NextResponse.json({ error: error.message, deleted }, { status: 500 })
    deleted += lote.length
  }
  return NextResponse.json({ deleted })
}
