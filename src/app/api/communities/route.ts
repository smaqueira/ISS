import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const platform = searchParams.get('platform')
  const provincia = searchParams.get('provincia')
  const categoria = searchParams.get('categoria')
  const status = searchParams.get('status') || 'activo'
  const minMembers = parseInt(searchParams.get('minMembers') || '0', 10)

  const db = await createClient()
  let query = db.from('communities').select('*', { count: 'exact' })

  if (status !== 'todos') query = query.eq('status', status)
  if (platform) query = query.eq('platform', platform)
  if (provincia) query = query.eq('provincia', provincia)
  if (categoria) query = query.eq('categoria', categoria)
  if (minMembers > 0) query = query.gte('members', minMembers)
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,ciudad.ilike.%${q}%`)

  const { data, count, error } = await query
    .order('score', { ascending: false, nullsFirst: false })
    .order('members', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data || [], total: count || 0 })
}

// Stats para el dashboard
export async function POST() {
  const db = await createClient()
  const { data } = await db.from('communities').select('platform, categoria, provincia, status, members, discovered_at')
  const all = data || []
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const count = (arr: typeof all, key: 'platform' | 'categoria' | 'provincia') => {
    const m: Record<string, number> = {}
    for (const r of arr) { const v = r[key] || 'sin dato'; m[v] = (m[v] || 0) + 1 }
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }
  return NextResponse.json({
    total: all.length,
    activos: all.filter(r => r.status === 'activo').length,
    caidos: all.filter(r => r.status === 'caido').length,
    nuevosHoy: all.filter(r => new Date(r.discovered_at) >= hoy).length,
    alcance: all.reduce((s, r) => s + (r.members || 0), 0),
    porPlataforma: count(all, 'platform'),
    porCategoria: count(all, 'categoria').slice(0, 12),
    porProvincia: count(all, 'provincia').slice(0, 12),
  })
}
