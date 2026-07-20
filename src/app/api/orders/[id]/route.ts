import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data, error } = await db.from('orders')
    .select('*, clients(id, name, type, phone), order_items(id, qty, unit_price, subtotal, products(name, unit))')
    .eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const body = await req.json()
  const { data, error } = await db.from('orders').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status) {
    await db.from('interactions').insert({ client_id: data.client_id, channel: 'sistema', type: 'pedido', notes: `Pedido actualizado a: ${body.status}`, ai_generated: false })
  }
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  await db.from('order_items').delete().eq('order_id', id)
  const { error } = await db.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
