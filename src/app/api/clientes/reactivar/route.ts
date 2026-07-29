import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DIAS_MIN = 15 // desde acá se considera "hay que reactivar"

interface Cli { id: string; name: string | null; rubro: string | null; city: string | null; phone: string | null; instagram: string | null; last_contact: string | null; next_followup: string | null }

export async function GET() {
  const db = await createClient()
  const hoy = new Date().toISOString().split('T')[0]

  const { data: clientes } = await db.from('clients')
    .select('id, name, rubro, city, phone, instagram, last_contact, next_followup')
    .in('status', ['cliente', 'cliente_recurrente'])
    .limit(500)

  // Último pedido por cliente (los más recientes primero)
  const { data: orders } = await db.from('orders').select('client_id, created_at').order('created_at', { ascending: false }).limit(1000)
  const ultimoPedido = new Map<string, string>()
  for (const o of orders || []) {
    if (o.client_id && !ultimoPedido.has(o.client_id)) ultimoPedido.set(o.client_id, o.created_at)
  }

  const items = (clientes as Cli[] || [])
    .filter(c => !c.next_followup || c.next_followup <= hoy) // respeta el "posponer"
    .map(c => {
      const ref = ultimoPedido.get(c.id) || c.last_contact
      const dias = ref ? Math.floor((Date.now() - new Date(ref).getTime()) / 86400000) : 999
      return { id: c.id, name: c.name, rubro: c.rubro, city: c.city, phone: c.phone, instagram: c.instagram, dias }
    })
    .filter(c => c.dias >= DIAS_MIN)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 40)

  return NextResponse.json({ clientes: items })
}
