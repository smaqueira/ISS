import { createClient } from '@/lib/supabase/server'
import type { ClientMarcas } from '@/lib/types'

// Acción del historial → campo de la ficha. Cada campo guarda la fecha más
// reciente en que se hizo esa acción sobre el contacto.
const ACCION_FIELD: Record<string, keyof ClientMarcas> = {
  'WhatsApp enviado':   'contacto',
  'Instagram enviado':  'contacto',
  'Instagram seguido':  'seguido',
  'Instagram like':     'like',
  'Instagram te sigue': 'sigue',
  'Pedido registrado':  'pedido',
}

/**
 * Devuelve, por cada client_id, la última fecha de cada acción del día
 * (para mostrar en la preview del contacto qué se le hizo y cuándo).
 * Paginado porque Supabase corta en 1000 filas por consulta.
 */
export async function getMarcas(
  db: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Record<string, ClientMarcas>> {
  const out: Record<string, ClientMarcas> = {}
  if (!ids.length) return out
  const acciones = Object.keys(ACCION_FIELD)

  for (let offset = 0; ; offset += 1000) {
    const { data } = await db
      .from('client_history')
      .select('client_id, accion, fecha')
      .in('client_id', ids)
      .in('accion', acciones)
      .order('fecha', { ascending: false })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const r of data as { client_id: string; accion: string; fecha: string }[]) {
      const field = ACCION_FIELD[r.accion]
      if (!field || !r.client_id) continue
      const m = out[r.client_id] || (out[r.client_id] = {})
      if (!m[field]) m[field] = r.fecha // orden desc → la primera es la más reciente
    }
    if (data.length < 1000) break
  }
  return out
}
