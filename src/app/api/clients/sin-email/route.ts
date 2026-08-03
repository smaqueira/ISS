import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lista contactos SIN email para la búsqueda en tanda. Por defecto prioriza los
// que TIENEN web (ahí está la mayor tasa de éxito). La búsqueda real la hace el
// cliente uno por uno, con progreso.
export async function POST(req: NextRequest) {
  const { rubro, city, limite, soloWeb } = await req.json()
  const tope = Math.min(Math.max(Number(limite) || 12, 1), 20)
  const db = await createClient()

  let q = db.from('clients').select('id, name, city, website, score').or('email.is.null,email.eq.')
  if (soloWeb !== false) q = q.not('website', 'is', null).neq('website', '')
  if (typeof rubro === 'string' && rubro.trim()) q = q.ilike('rubro', rubro.trim())
  if (typeof city === 'string' && city.trim()) q = q.ilike('city', `%${city.trim()}%`)

  const { data, error } = await q.order('score', { ascending: false, nullsFirst: false }).limit(tope)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ contactos: (data || []).map(c => ({ id: c.id, name: c.name, city: c.city, website: c.website })) })
}
