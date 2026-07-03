import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data, error } = await db.from('cotizaciones').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const body = await req.json()
  if (body.items) body.total = body.items.reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0)
  const { data, error } = await db.from('cotizaciones').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  await db.from('cotizaciones').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
