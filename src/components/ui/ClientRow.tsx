'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'
import { waLink } from '@/lib/utils'

interface Props { client: Client }

export default function ClientRow({ client }: Props) {
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm(`¿Eliminar a ${client.name}?`)) return
    await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{client.name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          {client.rubro || '—'} · {client.city || '—'}
          {client.phone && <span> · 📱 {client.phone}</span>}
          {!client.phone && client.notes && <span style={{ fontStyle: 'italic' }}> · {client.notes}</span>}
        </div>
      </div>

      <span className={`badge badge-${client.type}`}>{client.type.toUpperCase()}</span>
      <span className={`badge badge-${client.status}`}>{client.status}</span>

      <div style={{ textAlign: 'right', minWidth: 60 }}>
        <div style={{ fontWeight: 700, color: client.score >= 75 ? '#22c55e' : client.score >= 50 ? '#eab308' : '#ef4444' }}>
          {client.score}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>score</div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {client.phone && (
          <a href={waLink(client.phone)} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '6px 10px' }}>
            📱
          </a>
        )}
        <button onClick={handleDelete} className="btn btn-ghost" style={{ padding: '6px 10px', color: '#ef4444', opacity: 0.6 }} title="Eliminar">
          🗑️
        </button>
        <Link href={`/admin/clients/${client.id}`} className="btn btn-ghost" style={{ padding: '6px 10px' }}>
          →
        </Link>
      </div>
    </div>
  )
}
