import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Backup de datos (admin-only): descarga un JSON con clientes, settings, pedidos
// e historial. Es la red de seguridad de los datos que NO están en GitHub.
export async function GET() {
  const store = await cookies()
  if (store.get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const db = await createClient()

  // Trae TODOS los registros de una tabla, paginado (sin el tope de 1000)
  async function todo(tabla: string, orderCol = 'id'): Promise<unknown[]> {
    const out: unknown[] = []
    for (let off = 0; ; off += 1000) {
      const { data, error } = await db.from(tabla).select('*').order(orderCol).range(off, off + 999)
      if (error || !data || data.length === 0) break
      out.push(...data)
      if (data.length < 1000) break
    }
    return out
  }

  const [clients, orders, order_items, client_history, interactions] = await Promise.all([
    todo('clients'),
    todo('orders', 'created_at'),
    todo('order_items'),
    todo('client_history', 'fecha'),
    todo('interactions', 'created_at'),
  ])
  const { data: settings } = await db.from('settings').select('*').order('key')

  const backup = {
    app: 'vitto-mare',
    generado: new Date().toISOString(),
    conteos: {
      clients: clients.length,
      orders: orders.length,
      order_items: order_items.length,
      client_history: client_history.length,
      interactions: interactions.length,
      settings: (settings || []).length,
    },
    datos: { clients, orders, order_items, client_history, interactions, settings: settings || [] },
  }

  const fecha = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 16).replace('T', '_').replace(':', '')
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-vittomare-${fecha}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
