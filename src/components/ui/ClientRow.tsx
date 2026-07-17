'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Client } from '@/lib/types'
import WhatsAppModal from '@/components/clients/WhatsAppModal'
import { STATUS_LABELS, STATUS_COLORS, STATUS_OPTIONS, PRIORIDAD_OPTIONS, TEMPERATURA_OPTIONS } from '@/lib/crm'

interface Props { client: Client }

function isOverdue(date?: string) {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}
function isToday(date?: string) {
  if (!date) return false
  return new Date(date).toDateString() === new Date().toDateString()
}

export default function ClientRow({ client }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>(client.tags || [])
  const [waOpen, setWaOpen] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm(`¿Eliminar a ${client.name}?`)) return
    await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function toggleTag(tag: string) {
    const next = tags.includes(tag)
      ? tags.filter(t => t !== tag)
      : [...tags.filter(t => t !== tag && t !== (tag === 'listo' ? 'sin_datos' : 'listo')), tag]
    setTags(next)
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    })
  }

  const [status, setStatus] = useState(client.status)
  const isListo    = tags.includes('listo')
  const isSinDatos = tags.includes('sin_datos')
  const overdue    = isOverdue(client.next_followup)
  const todayFU    = isToday(client.next_followup)
  const alertColor = overdue ? '#ef4444' : todayFU ? '#f59e0b' : null

  async function changeStatus(newStatus: string) {
    setStatus(newStatus as typeof client.status)
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const statusLabel = STATUS_LABELS[status] || status
  const statusColor = STATUS_COLORS[status] || '#6366f1'
  const prioColor   = PRIORIDAD_OPTIONS.find(o => o.value === client.prioridad)?.color
  const tempColor   = TEMPERATURA_OPTIONS.find(o => o.value === client.temperatura)?.color

  const borderColor = alertColor || (isListo ? '#22c55e' : isSinDatos ? '#f59e0b' : 'transparent')

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, borderLeft: `3px solid ${borderColor}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isListo    && <span style={{ fontSize: '0.68rem', background: '#22c55e20', color: '#22c55e', borderRadius: 4, padding: '1px 5px' }}>✓ listo</span>}
          {isSinDatos && <span style={{ fontSize: '0.68rem', background: '#f59e0b20', color: '#f59e0b', borderRadius: 4, padding: '1px 5px' }}>⚠ datos</span>}
          {alertColor && (
            <span style={{ fontSize: '0.68rem', background: alertColor + '20', color: alertColor, borderRadius: 4, padding: '1px 5px' }}>
              {overdue ? '🔴 vencido' : '🟡 hoy'}
            </span>
          )}
          {client.name}
          {client.prioridad && prioColor && (
            <span style={{ fontSize: '0.65rem', background: prioColor + '20', color: prioColor, borderRadius: 4, padding: '1px 5px' }}>
              {client.prioridad}
            </span>
          )}
          {client.temperatura && tempColor && (
            <span style={{ fontSize: '0.65rem', background: tempColor + '20', color: tempColor, borderRadius: 4, padding: '1px 5px' }}>
              {client.temperatura}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>
          {client.rubro || '—'} · {client.city || '—'}
          {client.phone && <span> · 📱 {client.phone}</span>}
          {!client.phone && client.notes && <span style={{ fontStyle: 'italic' }}> · {client.notes}</span>}
        </div>
      </div>

      <span className={`badge badge-${client.type}`}>{client.type.toUpperCase()}</span>
      <select
        value={status}
        onChange={e => changeStatus(e.target.value)}
        style={{ padding: '2px 6px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44`, cursor: 'pointer', outline: 'none' }}
      >
        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div style={{ textAlign: 'right', minWidth: 50 }}>
        <div style={{ fontWeight: 700, color: client.score >= 75 ? '#22c55e' : client.score >= 50 ? '#eab308' : '#ef4444' }}>
          {client.score}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>score</div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => toggleTag('listo')} title="Listo para contactar"
          style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${isListo ? '#22c55e' : 'var(--border)'}`, background: isListo ? '#22c55e20' : 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
          ✅
        </button>
        <button onClick={() => toggleTag('sin_datos')} title="Faltan datos"
          style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${isSinDatos ? '#f59e0b' : 'var(--border)'}`, background: isSinDatos ? '#f59e0b20' : 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
          ⚠️
        </button>
        {client.phone && (
          <>
            <button onClick={() => setWaOpen(true)} className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Enviar WhatsApp">
              📱
            </button>
            {waOpen && <WhatsAppModal clientId={client.id} onClose={() => setWaOpen(false)} />}
          </>
        )}
        <button onClick={handleDelete} className="btn btn-ghost" style={{ padding: '6px 10px', color: '#ef4444', opacity: 0.6 }} title="Eliminar">
          🗑️
        </button>
        <Link href={`/admin/clients/${client.id}`} className="btn btn-ghost" style={{ padding: '6px 10px' }}>→</Link>
      </div>
    </div>
  )
}
