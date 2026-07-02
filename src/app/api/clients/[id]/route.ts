import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  const { data: interactions } = await db.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false })
  const { data: orders } = await db.from('orders').select('*, order_items(*, products(*))').eq('client_id', id).order('created_at', { ascending: false })
  return NextResponse.json({ ...client, interactions, orders })
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const body = await req.json()
  const { data, error } = await db.from('clients').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Registrar cambio
  if (body.status) {
    await db.from('interactions').insert({ client_id: id, channel: 'sistema', type: 'estado', notes: `Estado actualizado a: ${body.status}`, ai_generated: false })
  }
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
