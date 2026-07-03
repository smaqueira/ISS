'use client'
import { useState, useEffect } from 'react'

interface Prospecto {
  id: string
  name: string
  rubro?: string
  city?: string
  phone?: string
  instagram?: string
  website?: string
  score: number
  type: string
  status: string
  notes?: string
}

export default function VenderPage() {
  const [queue, setQueue] = useState<Prospecto[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [contactando, setContactando] = useState(false)
  const [hechos, setHechos] = useState(0)
  const [saltados, setSaltados] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/clients?status=nuevo')
    const data: Prospecto[] = await res.json()
    // Cola: solo con teléfono, mejores scores primero
    const cola = (data || [])
      .filter(c => c.phone)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
    setQueue(cola)
    setLoading(false)
  }

  const actual = queue[idx]

  async function contactar() {
    if (!actual) return
    setContactando(true)
    try {
      // Traer mensaje + URL de WhatsApp
      const res = await fetch(`/api/clients/${actual.id}/whatsapp`)
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
        // Marcar como contactado con fecha
        await fetch(`/api/clients/${actual.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'contactado', last_contact: new Date().toISOString() }),
        })
        setHechos(h => h + 1)
        setIdx(i => i + 1)
      }
    } finally {
      setContactando(false)
    }
  }

  function saltar() {
    setSaltados(s => s + 1)
    setIdx(i => i + 1)
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Cargando cola...</div>

  const restantes = queue.length - idx

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>⚡ Modo Vendedor</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Contactá la cola del día de un click. El sistema marca cada uno como contactado y el agente hace el seguimiento.
      </p>

      {/* Progreso */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>{hechos}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>contactados</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--muted)' }}>{saltados}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>saltados</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)' }}>{Math.max(restantes, 0)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>en cola</div>
        </div>
      </div>

      {!actual && (
        <div className="card" style={{ textAlign: 'center', padding: 50 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {queue.length === 0 ? 'No hay prospectos nuevos con teléfono en la cola' : '¡Cola completada!'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            {queue.length === 0
              ? 'Ejecutá el agente o buscá prospectos para llenar la cola.'
              : `Contactaste ${hechos} prospectos hoy. El agente se encarga del seguimiento.`}
          </div>
        </div>
      )}

      {actual && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>{actual.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {actual.rubro || 'sin rubro'} · {actual.city || 'sin zona'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: actual.score >= 75 ? '#22c55e' : '#eab308' }}>{actual.score}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>score</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem' }}>
            <div style={{ marginBottom: 4 }}>📱 {actual.phone}</div>
            {actual.instagram && <div style={{ marginBottom: 4 }}>📷 {actual.instagram}</div>}
            {actual.website && <div style={{ marginBottom: 4 }}>🔗 {actual.website}</div>}
            {actual.notes && <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>📍 {actual.notes}</div>}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saltar} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: 14 }}>
              ⏭ Saltar
            </button>
            <button onClick={contactar} disabled={contactando} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: 14, fontSize: '0.95rem' }}>
              {contactando ? '⏳ Abriendo...' : '💬 Contactar por WhatsApp'}
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
            Al contactar se abre WhatsApp con el mensaje listo y se marca como contactado automáticamente.
          </p>
        </div>
      )}
    </div>
  )
}
