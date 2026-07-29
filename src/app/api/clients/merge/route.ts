import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Campos que se completan en la ficha que se conserva si están vacíos
const RELLENAR = ['phone', 'email', 'instagram', 'website', 'rubro', 'city', 'notes', 'observaciones', 'contacto_nombre', 'contacto_cargo', 'proveedor_actual'] as const

export async function POST(req: NextRequest) {
  const store = await cookies()
  if (store.get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado (solo admin)' }, { status: 403 })
  }

  const { keepId, dropIds } = await req.json()
  if (!keepId || !Array.isArray(dropIds) || !dropIds.length) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const db = await createClient()
  const ids = [keepId, ...dropIds]
  const { data: fichas, error } = await db.from('clients').select('*').in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const keep = (fichas || []).find(f => f.id === keepId)
  const drops = (fichas || []).filter(f => dropIds.includes(f.id))
  if (!keep) return NextResponse.json({ error: 'No se encontró la ficha a conservar' }, { status: 404 })

  // Completar campos vacíos de "keep" con el primer valor disponible de los demás
  const patch: Record<string, unknown> = {}
  for (const campo of RELLENAR) {
    if (keep[campo]) continue
    const valor = drops.map(d => d[campo]).find(v => v != null && String(v).trim() !== '')
    if (valor != null) patch[campo] = valor
  }
  // Unir tags
  const tagsUnidos = [...new Set([...(keep.tags || []), ...drops.flatMap(d => d.tags || [])])]
  if (tagsUnidos.length !== (keep.tags || []).length) patch.tags = tagsUnidos

  if (Object.keys(patch).length > 0) {
    const { error: e2 } = await db.from('clients').update(patch).eq('id', keepId)
    if (e2) return NextResponse.json({ error: `No se pudo fusionar: ${e2.message}` }, { status: 500 })
  }

  // Borrar las fichas duplicadas
  const { error: e3 } = await db.from('clients').delete().in('id', dropIds)
  if (e3) return NextResponse.json({ error: `Se completaron datos pero no se pudieron borrar los duplicados: ${e3.message}` }, { status: 500 })

  return NextResponse.json({ ok: true, deleted: dropIds.length })
}
