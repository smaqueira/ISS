import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type Cli = { id: string; name: string | null; city: string | null; rubro: string | null }
const nc = (r: Cli) => `${(r.name || '').trim().toLowerCase()}||${(r.city || '').trim().toLowerCase()}`

// Renombra un rubro (empareja por texto "limpio", pagina la lectura). Si "hacia"
// coincide con otro rubro, se fusionan. Los que chocan con la unicidad
// (mismo negocio ya cargado con ese rubro) se saltean y se devuelven como
// "duplicados" con los datos de ambas fichas para que el usuario elija cuál borrar.
export async function POST(req: NextRequest) {
  const { desde, hacia } = await req.json()
  const from = (typeof desde === 'string' ? desde : '').trim()
  const to = (typeof hacia === 'string' ? hacia : '').trim()
  if (!from || !to) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const db = await createClient()

  // Traer todos los clientes en tandas de 1000 (Supabase corta ahí por consulta)
  const rows: Cli[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('clients').select('id, name, city, rubro').order('id').range(offset, offset + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    rows.push(...(data as Cli[]))
    if (data.length < 1000) break
  }
  const byId = new Map(rows.map(r => [r.id, r]))

  const objetivo = rows.filter(r => (r.rubro || '').trim() === from)
  if (objetivo.length === 0) return NextResponse.json({ updated: 0, duplicados: [] })

  let updated = 0
  const duplicados: { mover: Cli; existente: Cli | null }[] = []

  async function mover(id: string) {
    const { error } = await db.from('clients').update({ rubro: to }).eq('id', id)
    if (!error) { updated++; return }
    if (error.code !== '23505') throw new Error(error.message)
    const m = byId.get(id)!
    const existente = rows.find(r => r.id !== id && nc(r) === nc(m) && (r.rubro || '').trim() === to) || null
    duplicados.push({ mover: { ...m, rubro: from }, existente })
  }

  try {
    // Intento por lote; si el lote choca, voy uno por uno
    const ids = objetivo.map(r => r.id)
    for (let i = 0; i < ids.length; i += 100) {
      const lote = ids.slice(i, i + 100)
      const { error } = await db.from('clients').update({ rubro: to }).in('id', lote)
      if (!error) { updated += lote.length; continue }
      if (error.code !== '23505') throw new Error(error.message)
      for (const id of lote) await mover(id)
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), updated, duplicados }, { status: 500 })
  }

  return NextResponse.json({ updated, duplicados })
}
