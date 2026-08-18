import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function esAdmin() {
  return (await cookies()).get('iss_session')?.value === 'admin'
}

const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean)
    : typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : []

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = await createClient()
  const { data, error } = await db.from('demand_products').select('*').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  if (!(await esAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  if (!b?.nombre?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const fila = {
    nombre: String(b.nombre).trim(),
    categoria: b.categoria?.trim() || null,
    descripcion: b.descripcion?.trim() || null,
    marcas: lista(b.marcas),
    variantes: lista(b.variantes),
    keywords: lista(b.keywords),
    sinonimos: lista(b.sinonimos),
    precio: b.precio ? Number(String(b.precio).replace(/[^0-9.]/g, '')) || null : null,
    disponible: b.disponible !== false,
    zona: b.zona?.trim() || null,
    activo: b.activo !== false,
    updated_at: new Date().toISOString(),
  }

  const db = await createClient()
  const res = b.id
    ? await db.from('demand_products').update(fila).eq('id', b.id).select().single()
    : await db.from('demand_products').insert(fila).select().single()
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
  return NextResponse.json(res.data)
}

export async function DELETE(req: NextRequest) {
  if (!(await esAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const db = await createClient()
  const { error } = await db.from('demand_products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
