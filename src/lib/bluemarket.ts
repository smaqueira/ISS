/**
 * Lee productos desde BlueMarket (Supabase externo).
 * Si BlueMarket no responde o está vacío, los callers caen al fallback.
 *
 * Variables de entorno necesarias (mismas que en vitto-de-mare):
 *   BLUEMARKET_SUPABASE_URL
 *   BLUEMARKET_SUPABASE_ANON_KEY
 *   BLUEMARKET_TIENDA_SLUG  (default: "vitto-mare")
 */

const BM_URL = process.env.BLUEMARKET_SUPABASE_URL
const BM_KEY = process.env.BLUEMARKET_SUPABASE_ANON_KEY
const BM_SLUG = process.env.BLUEMARKET_TIENDA_SLUG ?? 'vitto-mare'

export interface BMProduct {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  unidad: string | null
  categoria: string | null
  foto_url: string | null
  destacado: boolean | null
}

/** Producto en formato que usa el ISS (igual al schema de la tabla products) */
export interface ISSProduct {
  id: string
  name: string
  description: string | null
  price: number
  unit: string | null
  category: string | null
  image_url: string | null
  active: boolean
  featured: boolean
}

async function bmFetch<T>(path: string): Promise<T | null> {
  if (!BM_URL || !BM_KEY) return null
  try {
    const res = await fetch(`${BM_URL}/rest/v1/${path}`, {
      headers: { apikey: BM_KEY, Authorization: `Bearer ${BM_KEY}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Devuelve los productos activos de BlueMarket, o null si no disponible. */
export async function getBlueMarketProducts(): Promise<ISSProduct[] | null> {
  const tiendas = await bmFetch<{ id: string }[]>(
    `pescaderias?slug=eq.${BM_SLUG}&activa=eq.true&select=id`
  )
  const tiendaId = tiendas?.[0]?.id
  if (!tiendaId) return null

  const productos = await bmFetch<BMProduct[]>(
    `productos?pescaderia_id=eq.${tiendaId}&disponible=eq.true` +
    `&select=id,nombre,descripcion,precio,unidad,categoria,foto_url,destacado` +
    `&order=destacado.desc,nombre.asc`
  )
  if (!productos || productos.length === 0) return null

  return productos.map((p) => ({
    id: p.id,
    name: p.nombre,
    description: p.descripcion,
    price: p.precio,
    unit: p.unidad,
    category: p.categoria,
    image_url: p.foto_url,
    active: true,
    featured: p.destacado ?? false,
  }))
}
