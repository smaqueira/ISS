import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { interpretarBusqueda } from '@/lib/demanda/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function esAdmin() {
  return (await cookies()).get('iss_session')?.value === 'admin'
}

// Lista de oportunidades con filtros. ?q= usa lenguaje natural (la IA lo traduce).
export async function GET(req: NextRequest) {
  if (!(await esAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sp = new URL(req.url).searchParams
  const db = await createClient()

  let f = {
    producto: sp.get('producto') || undefined,
    tipo_comprador: sp.get('tipo_comprador') || undefined,
    ubicacion: sp.get('ubicacion') || undefined,
    intencion: sp.get('intencion') || undefined,
    estado: sp.get('estado') || undefined,
    score_min: sp.get('score_min') ? Number(sp.get('score_min')) : undefined,
  }
  let interpretado: unknown = null
  const q = sp.get('q')
  if (q) { const nl = await interpretarBusqueda(q); interpretado = nl; f = { ...f, ...nl } }

  let query = db.from('demand_opportunities').select('*')
  if (f.producto) query = query.ilike('producto_nombre', `%${f.producto}%`)
  if (f.tipo_comprador) query = query.ilike('tipo_comprador', `%${f.tipo_comprador}%`)
  if (f.ubicacion) query = query.ilike('ubicacion', `%${f.ubicacion}%`)
  if (f.intencion) query = query.eq('intencion', f.intencion)
  if (f.estado) query = query.eq('estado', f.estado)
  if (f.score_min) query = query.gte('score', f.score_min)

  const { data, error } = await query.order('score', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Métricas del encabezado
  const hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)
  const [{ count: nuevas }, { count: altaInt }, { count: deHoy }] = await Promise.all([
    db.from('demand_opportunities').select('*', { count: 'exact', head: true }).eq('estado', 'nueva'),
    db.from('demand_opportunities').select('*', { count: 'exact', head: true }).in('intencion', ['alta', 'muy_alta']),
    db.from('demand_opportunities').select('*', { count: 'exact', head: true }).gte('created_at', hoy),
  ])
  const lista = data || []
  const matchProm = lista.length ? Math.round(lista.reduce((s, o) => s + (o.match_pct || 0), 0) / lista.length) : 0

  return NextResponse.json({
    oportunidades: lista,
    metricas: { nuevas: nuevas || 0, alta_intencion: altaInt || 0, match_promedio: matchProm, hoy: deHoy || 0 },
    interpretado,
  })
}
