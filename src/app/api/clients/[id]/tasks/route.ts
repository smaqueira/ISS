import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data, error } = await db
    .from('client_tasks')
    .select('*')
    .eq('client_id', id)
    .order('completada', { ascending: true })
    .order('fecha_limite', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const body = await req.json()
  if (!body.titulo?.trim()) return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  const { data, error } = await db.from('client_tasks').insert({
    client_id: id,
    titulo: body.titulo.trim(),
    fecha_limite: body.fecha_limite || null,
    prioridad: body.prioridad || 'media',
    completada: false,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
