import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBlueMarketCatalog } from '@/lib/bluemarket'

export async function GET() {
  const bm = await getBlueMarketCatalog()
  if (bm) return NextResponse.json(bm)

  const db = await createClient()
  const { data, error } = await db.from('products').select('*').eq('active', true).order('category')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const body = await req.json()
  const { data, error } = await db.from('products').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
