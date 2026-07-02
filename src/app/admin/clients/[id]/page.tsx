import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatARS, formatDate, waLink } from '@/lib/utils'
import DeleteClientButton from '@/components/clients/DeleteClientButton'
import WhatsAppButton from '@/components/clients/WhatsAppButton'

type Params = Promise<{ id: string }>

export default async function ClientDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()

  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  const { data: interactions } = await db.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false })
  const { data: orders } = await db.from('orders').select('*').eq('client_id', id).order('created_at', { ascending: false })

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/admin/clients" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem' }}>← Clientes</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{client.name}</h1>
        <span className={`badge badge-${client.type}`}>{client.type.toUpperCase()}</span>
        <span className={`badge badge-${client.status}`}>{client.status}</span>
      </div>

      {/* Info + Score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Datos</div>
          {[
            ['Rubro', client.rubro],
            ['Ciudad', client.city],
            ['Email', client.email],
            ['Teléfono', client.phone],
            ['Instagram', client.instagram],
            ['Web', client.website],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--muted)' }}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: client.score >= 75 ? '#22c55e' : client.score >= 50 ? '#eab308' : '#ef4444' }}>
            {client.score}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Score IA</div>
          {client.notes && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>{client.notes}</div>}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {client.phone && <WhatsAppButton clientId={id} />}
        {client.email && (
          <a href={`mailto:${client.email}`} className="btn btn-ghost">📧 Email</a>
        )}
        <Link href={`/admin/orders/new?client=${id}`} className="btn btn-ghost">📦 Nuevo pedido</Link>
        <DeleteClientButton id={id} />
      </div>

      {/* Pedidos */}
      {orders && orders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Pedidos</div>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
              <span>{formatDate(o.created_at)}</span>
              <span style={{ textTransform: 'capitalize', color: 'var(--muted)' }}>{o.status}</span>
              <span style={{ fontWeight: 700 }}>{formatARS(o.total || 0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Historial */}
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Historial</div>
        {!interactions?.length && (
          <div className="card" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin interacciones registradas.</div>
        )}
        {interactions?.map(i => (
          <div key={i.id} className="card" style={{ marginBottom: 8, fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{i.channel} · {i.type}</span>
              <span style={{ color: 'var(--muted)' }}>{formatDate(i.created_at)}</span>
            </div>
            <div style={{ color: 'var(--muted)' }}>{i.notes}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
