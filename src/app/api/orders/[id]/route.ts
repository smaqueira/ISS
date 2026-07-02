import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

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
