import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const db = await createClient()
  const { searchParams } = new URL(req.url)
  let q = db.from('orders').select('*, clients(name, type), order_items(*, products(name, unit))').order('created_at', { ascending: false })
  if (searchParams.get('status')) q = q.eq('status', searchParams.get('status')!)
  if (searchParams.get('type')) q = q.eq('type', searchParams.get('type')!)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const { items, ...order } = await req.json()

  const { data, error } = await db.from('orders').insert(order).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items?.length) {
    await db.from('order_items').insert(items.map((i: { product_id: string; qty: number; unit_price: number }) => ({
      ...i, order_id: data.id, subtotal: i.qty * i.unit_price,
    })))
    const total = items.reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0)
    await db.from('orders').update({ total }).eq('id', data.id)
  }

  await db.from('interactions').insert({ client_id: order.client_id, channel: 'sistema', type: 'pedido', notes: `Pedido creado #${data.id.slice(0, 8)}`, ai_generated: false })

  return NextResponse.json(data, { status: 201 })
}
