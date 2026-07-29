'use client'
import { useEffect, useState } from 'react'
import WhatsAppModal from '@/components/clients/WhatsAppModal'

interface Cli { id: string; name: string | null; rubro: string | null; city: string | null; phone: string | null; instagram: string | null; dias: number }

const igUser = (v: string) => v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?].*$/, '').trim()

export default function ClientesReactivar() {
  const [items, setItems] = useState<Cli[] | null>(null)
  const [waId, setWaId] = useState<string | null>(null)

  function cargar() {
    fetch('/api/clientes/reactivar').then(r => r.json()).then(d => setItems(d.clientes || [])).catch(() => setItems([]))
  }
  useEffect(() => { cargar() }, [])

  function sacar(id: string) { setItems(prev => prev ? prev.filter(c => c.id !== id) : prev) }

  async function posponer(id: string) {
    const f = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    sacar(id)
    await fetch(`/api/clients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ next_followup: f }) })
  }

  function escribir(c: Cli) {
    if (c.phone) { setWaId(c.id); return }
    if (c.instagram) {
      window.open(`https://ig.me/m/${igUser(c.instagram)}`, '_blank')
      fetch(`/api/clients/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _accion: 'instagram_enviado' }) })
      sacar(c.id)
    }
  }

  if (!items) return <div style={{ color: 'var(--muted)', padding: 20 }}>⏳ Buscando clientes a reactivar…</div>
  if (items.length === 0) return (
    <div style={{ background: '#22c55e12', border: '1px solid #22c55e44', borderRadius: 10, padding: 20, color: '#22c55e', fontSize: '0.9rem' }}>
      ✅ Ningún cliente para reactivar hoy. Todos comprando o ya pospuestos.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(c => (
        <div key={c.id} style={{ border: '1px solid var(--border)', borderLeft: '3px solid #ef4444', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.name || '(sin nombre)'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{[c.rubro, c.city].filter(Boolean).join(' · ') || '—'}</div>
            <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600, marginTop: 2 }}>🔴 No compra hace {c.dias} días — ¿le escribís?</div>
          </div>
          <button onClick={() => escribir(c)} disabled={!c.phone && !c.instagram} className="btn btn-primary" style={{ fontSize: '0.8rem', background: '#22c55e' }}>
            {c.phone ? '💬 SÍ, le escribo' : c.instagram ? '📸 SÍ (DM)' : 'sin canal'}
          </button>
          <button onClick={() => posponer(c.id)} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Hoy no</button>
        </div>
      ))}
      {waId && <WhatsAppModal clientId={waId} onClose={() => { setWaId(null); sacar(waId); cargar() }} />}
    </div>
  )
}
