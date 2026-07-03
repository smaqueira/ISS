import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()
  const { data, error } = await db.from('cotizaciones').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const body = await req.json()
  const total = (body.items || []).reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0)
  const { data, error } = await db.from('cotizaciones').insert({ ...body, total }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
