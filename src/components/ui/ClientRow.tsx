'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Client } from '@/lib/types'
import { waLink } from '@/lib/utils'

interface Props { client: Client }

export default function ClientRow({ client }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>(client.tags || [])

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm(`¿Eliminar a ${client.name}?`)) return
    await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function toggleTag(tag: string) {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags.filter(t => t !== tag && t !== (tag === 'listo' ? 'sin_datos' : 'listo')), tag]
    setTags(next)
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    })
  }

  const isListo = tags.includes('listo')
  const isSinDatos = tags.includes('sin_datos')

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, borderLeft: isListo ? '3px solid #22c55e' : isSinDatos ? '3px solid #f59e0b' : '3px solid transparent' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>
          {isListo && <span style={{ fontSize: '0.7rem', background: '#22c55e20', color: '#22c55e', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>✓ listo</span>}
          {isSinDatos && <span style={{ fontSize: '0.7rem', background: '#f59e0b20', color: '#f59e0b', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>⚠ datos</span>}
          {client.name}
        </div>
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
