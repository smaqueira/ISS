import { NextResponse } from 'next/server'

export async function GET() {
  const BM_URL = process.env.BLUEMARKET_SUPABASE_URL
  const BM_KEY = process.env.BLUEMARKET_SUPABASE_ANON_KEY
  const BM_SLUG = process.env.BLUEMARKET_TIENDA_SLUG ?? 'vitto-mare'

  if (!BM_URL || !BM_KEY) {
    return NextResponse.json({ error: 'env vars faltantes', BM_URL: !!BM_URL, BM_KEY: !!BM_KEY })
  }

  try {
    const r1 = await fetch(`${BM_URL}/rest/v1/pescaderias?slug=eq.${BM_SLUG}&activa=eq.true&select=id`, {
      headers: { apikey: BM_KEY, Authorization: `Bearer ${BM_KEY}` },
      cache: 'no-store',
    })
    const tiendas = await r1.json()

    const tiendaId = tiendas?.[0]?.id
    if (!tiendaId) return NextResponse.json({ tiendas, error: 'no tienda' })

    const r2 = await fetch(`${BM_URL}/rest/v1/productos?pescaderia_id=eq.${tiendaId}&disponible=eq.true&select=id,nombre,precio`, {
      headers: { apikey: BM_KEY, Authorization: `Bearer ${BM_KEY}` },
      cache: 'no-store',
    })
    const productos = await r2.json()

    return NextResponse.json({ ok: true, tiendaId, productos })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) })
  }
}
