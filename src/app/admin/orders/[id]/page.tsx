'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id: string
  numero?: number
  status: string
  total: number
  delivery_date?: string
  notes?: string
  created_at: string
  clients?: { id: string; name: string; type: string; phone?: string }
  order_items?: { id: string; qty: number; unit_price: number; subtotal: number; products?: { name: string; unit?: string } }[]
}

const STATUS_STEPS = ['pendiente', 'confirmado', 'preparacion', 'enviado', 'entregado']
const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', preparacion: 'En preparación',
  enviado: 'Enviado', entregado: 'Entregado',
}
const STATUS_COLOR: Record<string, string> = {
  pendiente: '#3b82f6', confirmado: '#eab308', preparacion: '#f97316',
  enviado: '#a855f7', entregado: '#22c55e',
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`)
    const data = await res.json()
    setOrder(data?.id ? data : null)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    setUpdatingStatus(false)
  }

  async function deleteOrder() {
    if (!confirm('¿Eliminar este pedido?')) return
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    router.push('/admin/orders')
  }

  function whatsappMsg() {
    if (!order?.clients?.phone) return
    const items = order.order_items?.map(i => `• ${i.products?.name} x${i.qty} ${i.products?.unit || 'kg'} — ${formatARS(i.subtotal)}`).join('\n') || ''
    const nro = order.numero ?? order.id.slice(0, 6).toUpperCase()
    const msg = `Hola ${order.clients.name}! 👋\n\nTu pedido *#${nro}* está *${STATUS_LABELS[order.status]}*:\n\n${items}\n\n*Total: ${formatARS(order.total)}*${order.delivery_date ? `\n📅 Entrega: ${formatDate(order.delivery_date)}` : ''}\n\n¿Alguna consulta? Estamos para ayudarte 🐟`
    window.open(`https://wa.me/${order.clients.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Cargando...</div>
  if (!order) return <div style={{ color: 'var(--muted)', padding: 40 }}>Pedido no encontrado.</div>

  const currentStep = STATUS_STEPS.indexOf(order.status)
  const color = STATUS_COLOR[order.status] || '#6366f1'

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link href="/admin/orders" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem' }}>← Pedidos</Link>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, flex: 1 }}>
          Pedido #{order.numero ?? order.id.slice(0, 6).toUpperCase()}
        </h1>
        <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Progreso */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
          {STATUS_STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {i > 0 && <div style={{ flex: 1, height: 2, background: i <= currentStep ? color : 'var(--border)', transition: 'background 0.3s' }} />}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i <= currentStep ? color : 'var(--bg)',
                  border: `2px solid ${i <= currentStep ? color : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', color: i <= currentStep ? '#fff' : 'var(--muted)',
                  fontWeight: 700, transition: 'all 0.3s',
                }}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < currentStep ? color : 'var(--border)', transition: 'background 0.3s' }} />}
              </div>
              <div style={{ fontSize: '0.62rem', color: i === currentStep ? color : 'var(--muted)', fontWeight: i === currentStep ? 700 : 400, textAlign: 'center' }}>
                {STATUS_LABELS[s].split(' ')[0]}
              </div>
            </div>
          ))}
        </div>

        {/* Botones de avance */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {currentStep < STATUS_STEPS.length - 1 && (
            <button
              onClick={() => updateStatus(STATUS_STEPS[currentStep + 1])}
              disabled={updatingStatus}
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {updatingStatus ? '⏳' : `→ Pasar a ${STATUS_LABELS[STATUS_STEPS[currentStep + 1]]}`}
            </button>
          )}
          {currentStep > 0 && (
            <button
              onClick={() => updateStatus(STATUS_STEPS[currentStep - 1])}
              disabled={updatingStatus}
              className="btn btn-ghost"
              style={{ padding: '8px 14px' }}
            >
              ← Volver
            </button>
          )}
          {order.clients?.phone && (
            <button onClick={whatsappMsg} className="btn btn-ghost" style={{ background: '#25D36615', borderColor: '#25D366', color: '#25D366' }}>
              💬 Avisar por WA
            </button>
          )}
        </div>
      </div>

      {/* Cliente */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Cliente</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{order.clients?.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{order.clients?.type?.toUpperCase()} {order.clients?.phone ? `· ${order.clients.phone}` : ''}</div>
          </div>
          <Link href={`/admin/clients/${order.clients?.id}`} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Ver cliente →</Link>
        </div>
      </div>

      {/* Productos */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Productos</div>
        {(order.order_items || []).map((item, i) => (
          <div key={item.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{item.products?.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.qty} {item.products?.unit || 'kg'} × {formatARS(item.unit_price)}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatARS(item.subtotal)}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', paddingTop: 12, marginTop: 4 }}>
          <span>Total</span>
          <span style={{ color: 'var(--accent)' }}>{formatARS(order.total)}</span>
        </div>
      </div>

      {/* Detalles */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>Creado</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{formatDate(order.created_at)}</div>
          </div>
          {order.delivery_date && (
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>Entrega</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>📅 {formatDate(order.delivery_date)}</div>
            </div>
          )}
          {order.notes && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>Notas</div>
              <div style={{ fontSize: '0.85rem' }}>{order.notes}</div>
            </div>
          )}
        </div>
      </div>

      <button onClick={deleteOrder} style={{ background: 'none', border: 'none', color: '#ef444460', cursor: 'pointer', fontSize: '0.78rem' }}>
        🗑️ Eliminar pedido
      </button>
    </div>
  )
}
