import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function inicioDiaARiso(): string {
  const ar = new Date(Date.now() - 3 * 3600 * 1000)
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate(), 3, 0, 0)).toISOString()
}
function inicioMesARiso(): string {
  const ar = new Date(Date.now() - 3 * 3600 * 1000)
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), 1, 3, 0, 0)).toISOString()
}

interface OrderRow { total: number | null; created_at: string; client_id: string | null; clients: { name: string | null } | null }

export async function GET() {
  const db = await createClient()
  const desde = new Date(Date.now() - 40 * 86400000).toISOString()
  const { data } = await db.from('orders').select('total, created_at, client_id, clients(name)').gte('created_at', desde)
  const rows = (data || []) as unknown as OrderRow[]

  const dia0 = inicioDiaARiso()
  const semana0 = new Date(Date.now() - 7 * 86400000).toISOString()
  const mes0 = inicioMesARiso()

  const suma = (desdeIso: string) => {
    const r = rows.filter(o => o.created_at >= desdeIso)
    return { total: r.reduce((s, o) => s + (Number(o.total) || 0), 0), pedidos: r.length }
  }

  // Top clientes del mes
  const porCliente: Record<string, { nombre: string; total: number; pedidos: number }> = {}
  for (const o of rows) {
    if (o.created_at < mes0 || !o.client_id) continue
    const k = o.client_id
    const acc = porCliente[k] || { nombre: o.clients?.name || 'Cliente', total: 0, pedidos: 0 }
    acc.total += Number(o.total) || 0
    acc.pedidos += 1
    porCliente[k] = acc
  }
  const topClientes = Object.values(porCliente).sort((a, b) => b.total - a.total).slice(0, 8)

  return NextResponse.json({
    hoy: suma(dia0),
    semana: suma(semana0),
    mes: suma(mes0),
    topClientes,
  })
}
