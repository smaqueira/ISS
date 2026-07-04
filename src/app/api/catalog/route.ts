import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBlueMarketProducts } from '@/lib/bluemarket'

// Ruta pública — sin autenticación, para la página de catálogo
export async function GET() {
  const bm = await getBlueMarketProducts()
  if (bm) return NextResponse.json(bm)

  const db = await createClient()
  const { data, error } = await db.from('products').select('*').eq('active', true).order('category').order('name')
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data || [])
}
