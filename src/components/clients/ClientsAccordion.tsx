'use client'
import { useState } from 'react'
import ClientRow from '@/components/ui/ClientRow'
import type { Client } from '@/lib/types'

interface Props {
  grouped: { zona: string; clients: Client[] }[]
}

export default function ClientsAccordion({ grouped }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  function toggle(zona: string) {
    setOpen(prev => ({ ...prev, [zona]: !prev[zona] }))
  }

  if (grouped.length === 0) return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
      No hay contactos con zona asignada.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {grouped.map(({ zona, clients }) => {
        const isOpen = !!open[zona]
        return (
          <div key={zona} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => toggle(zona)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--text)', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1rem' }}>📍</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{zona}</span>
                <span style={{
                  background: 'var(--accent)', color: '#fff', borderRadius: 10,
                  padding: '1px 8px', fontSize: '0.72rem', fontWeight: 600,
                }}>
                  {clients.length}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                {clients.map(c => <ClientRow key={c.id} client={c} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
