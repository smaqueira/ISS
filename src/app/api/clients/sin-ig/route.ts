import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lista contactos SIN instagram que matchean el filtro (rubro/zona), para la
// búsqueda de IG en tanda. Devuelve solo id/nombre/ciudad (la búsqueda en Serper
// la hace el cliente uno por uno, con progreso).
export async function POST(req: NextRequest) {
  const { rubro, city, tag, limite } = await req.json()
  const tope = Math.min(Math.max(Number(limite) || 25, 1), 40)
  const db = await createClient()

  let q = db.from('clients').select('id, name, city, score').or('instagram.is.null,instagram.eq.')
  if (typeof rubro === 'string' && rubro.trim()) q = q.ilike('rubro', rubro.trim())
  if (typeof city === 'string' && city.trim()) q = q.ilike('city', `%${city.trim()}%`)
  if (typeof tag === 'string' && tag.trim()) q = q.contains('tags', [tag.trim()])

  const { data, error } = await q.order('score', { ascending: false, nullsFirst: false }).limit(tope)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ contactos: (data || []).map(c => ({ id: c.id, name: c.name, city: c.city })) })
}
