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
  'Estado cambiado':    'estado',
}

// Acciones que cuentan como "trato" con el cliente para el badge de "último
// movimiento" (todo lo que registra el sistema). Etiqueta corta para mostrar.
const ACCION_LABEL: Record<string, string> = {
  'WhatsApp enviado':              'MD WhatsApp',
  'Instagram enviado':             'MD Instagram',
  'Instagram seguido':             'Seguido IG',
  'Instagram like':                'Like IG',
  'Instagram te sigue':            'Te sigue',
  'Instagram salteado':            'Salteado IG',
  'Pedido registrado':             'Pedido',
  'Estado cambiado':               'Cambio de estado',
  'Próximo seguimiento actualizado': 'Seguimiento agendado',
  'Prioridad cambiada':            'Prioridad',
  'Etiquetas actualizadas':        'Etiquetas',
  'Datos actualizados':            'Datos',
}
const ACCIONES = Object.keys(ACCION_LABEL)

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

  for (let offset = 0; ; offset += 1000) {
    const { data } = await db
      .from('client_history')
      .select('client_id, accion, fecha')
      .in('client_id', ids)
      .in('accion', ACCIONES)
      .order('fecha', { ascending: false })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const r of data as { client_id: string; accion: string; fecha: string }[]) {
      if (!r.client_id) continue
      const m = out[r.client_id] || (out[r.client_id] = {})
      // Último movimiento (cualquier acción): la primera que aparece por orden desc
      if (!m.ultimoFecha) { m.ultimoFecha = r.fecha; m.ultimoAccion = ACCION_LABEL[r.accion] || r.accion }
      // Fecha por tipo de acción (para los íconos con fecha)
      const field = ACCION_FIELD[r.accion]
      if (field && !m[field]) m[field] = r.fecha
    }
    if (data.length < 1000) break
  }
  return out
}
