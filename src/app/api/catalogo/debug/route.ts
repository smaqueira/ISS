import { NextResponse } from 'next/server'

const BM_URL  = process.env.BLUEMARKET_SUPABASE_URL
const BM_KEY  = process.env.BLUEMARKET_SUPABASE_ANON_KEY
const BM_SLUG = process.env.BLUEMARKET_TIENDA_SLUG ?? 'vitto-mare'

async function bmFetch(path: string) {
  if (!BM_URL || !BM_KEY) return { error: 'env vars faltantes', BM_URL: !!BM_URL, BM_KEY: !!BM_KEY }
  const res = await fetch(`${BM_URL}/rest/v1/${path}`, {
    headers: { apikey: BM_KEY, Authorization: `Bearer ${BM_KEY}` },
    cache: 'no-store',
  })
  const text = await res.text()
  return { status: res.status, body: text.slice(0, 500) }
}

export async function GET() {
  const tiendas = await bmFetch(`pescaderias?slug=eq.${BM_SLUG}&activa=eq.true&select=id,slug,nombre`)
  const tiendaId = (() => { try { return JSON.parse((tiendas as {body:string}).body)?.[0]?.id } catch { return null } })()

  const productos = tiendaId
    ? await bmFetch(`productos?pescaderia_id=eq.${tiendaId}&disponible=eq.true&select=id,nombre,precio,disponible&limit=5`)
    : null

  const productosLibres = tiendaId
    ? await bmFetch(`productos?pescaderia_id=eq.${tiendaId}&select=id,nombre,precio,disponible&limit=5`)
    : null

  return NextResponse.json({ slug: BM_SLUG, tiendas, tiendaId, productos, productosLibres })
}
