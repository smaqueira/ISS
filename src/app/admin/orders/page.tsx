import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatARS, formatDate } from '@/lib/utils'

const STATUS_STEPS = ['pendiente', 'confirmado', 'preparacion', 'enviado', 'entregado']
const STATUS_COLOR: Record<string, string> = {
  pendiente: '#3b82f6', confirmado: '#eab308', preparacion: '#f97316', enviado: '#a855f7', entregado: '#22c55e',
}

export default async function OrdersPage() {
  const db = await createClient()
  const { data: orders } = await db
    .from('orders')
    .select('*, clients(name, type)')
    .order('created_at', { ascending: false })

  const active = orders?.filter(o => o.status !== 'entregado') || []
  const delivered = orders?.filter(o => o.status === 'entregado') || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Pedidos</h1>
        <Link href="/admin/orders/new" className="btn btn-primary">+ Nuevo pedido</Link>
      </div>

      {active.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, marginBottom: 16 }}>
          No hay pedidos activos.
        </div>
      )}

      {active.map(order => (
        <div key={order.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              {order.clients?.name || '—'}
              <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--accent)18', color: 'var(--accent)', borderRadius: 4, padding: '1px 6px' }}>
                #{order.numero || order.id.slice(0, 6).toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {order.clients?.type?.toUpperCase()} · {formatDate(order.created_at)}
              {order.delivery_date && ` · Entrega: ${formatDate(order.delivery_date)}`}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {STATUS_STEPS.map(s => (
              <div key={s} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: STATUS_STEPS.indexOf(s) <= STATUS_STEPS.indexOf(order.status) ? STATUS_COLOR[order.status] : 'var(--border)',
              }} />
            ))}
          </div>

          <span style={{ color: STATUS_COLOR[order.status], fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>
            {order.status}
          </span>

          <div style={{ fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{formatARS(order.total || 0)}</div>

          <Link href={`/admin/orders/${order.id}`} className="btn btn-ghost" style={{ padding: '6px 10px' }}>→</Link>
        </div>
      ))}

      {delivered.length > 0 && (
        <div style={{ marginTop: 24, color: 'var(--muted)', fontSize: '0.8rem' }}>
          ✅ {delivered.length} pedido{delivered.length > 1 ? 's' : ''} entregado{delivered.length > 1 ? 's' : ''} este mes
          · Total: {formatARS(delivered.reduce((s, o) => s + (o.total || 0), 0))}
        </div>
      )}
    </div>
  )
}
