import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBlueMarketProducts, getBlueMarketCatalog } from '@/lib/bluemarket'

// Ruta pública — sin autenticación, para la página de catálogo.
// ?all=1 → TODOS los productos (incluye sin stock), para configurar precios en el panel.
export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.has('all')
  const bm = all ? await getBlueMarketCatalog() : await getBlueMarketProducts()
  if (bm) return NextResponse.json(bm)

  const db = await createClient()
  const { data, error } = await db.from('products').select('*').eq('active', true).order('category').order('name')
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data || [])
}
