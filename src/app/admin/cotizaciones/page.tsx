'use client'
import { useState, useEffect } from 'react'

interface Cotizacion {
  id: string
  client_name: string
  total: number
  status: string
  validity_days: number
  created_at: string
  items: { name: string; qty: number; unit: string; unit_price: number }[]
}

export default function CotizacionesPage() {
  const [cots, setCots] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cotizaciones').then(r => r.json()).then(d => { setCots(d || []); setLoading(false) })
  }, [])

  async function remove(id: string) {
    await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' })
    setCots(prev => prev.filter(c => c.id !== id))
  }

  const statusColor: Record<string, string> = {
    borrador: '#64748b', enviada: '#3b82f6', aceptada: '#22c55e', rechazada: '#ef4444',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Cotizaciones</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Propuestas comerciales para clientes B2B.</p>
        </div>
        <a href="/admin/cotizaciones/nueva">
          <button className="btn btn-primary">+ Nueva cotización</button>
        </a>
      </div>

      {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Cargando...</div>}
      {!loading && cots.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No hay cotizaciones todavía</div>
          <a href="/admin/cotizaciones/nueva"><button className="btn btn-primary" style={{ marginTop: 8 }}>Crear la primera</button></a>
        </div>
      )}

      {cots.map(c => (
        <div key={c.id} className="card" style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>{c.client_name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>
              {c.items?.length || 0} productos · {new Date(c.created_at).toLocaleDateString('es-AR')} · válida {c.validity_days} días
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {(c.items || []).map(i => `${i.qty} ${i.unit} ${i.name}`).join(' · ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)', marginBottom: 4 }}>
              ${(c.total || 0).toLocaleString('es-AR')}
            </div>
            <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, background: `${statusColor[c.status] || '#64748b'}20`, color: statusColor[c.status] || '#64748b', marginBottom: 8 }}>
              {c.status}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <a href={`/cotizacion/${c.id}`} target="_blank" rel="noreferrer">
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}>📄 Ver PDF</button>
            </a>
            <button onClick={() => remove(c.id)} style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
              🗑️ Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
