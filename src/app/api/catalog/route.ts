import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBlueMarketProducts, getBlueMarketAll } from '@/lib/bluemarket'

// Ruta pública — sin autenticación, para la página de catálogo.
// ?all=1 → TODOS los productos (ignora stock y disponibilidad), para el panel de precios.
export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.has('all')
  const bm = all ? await getBlueMarketAll() : await getBlueMarketProducts()
  if (bm) return NextResponse.json(bm)

  const db = await createClient()
  const { data, error } = await db.from('products').select('*').eq('active', true).order('category').order('name')
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data || [])
}
