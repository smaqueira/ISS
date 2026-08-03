'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RepararListos() {
  const router = useRouter()
  const [total, setTotal] = useState<number | null>(null)
  const [ejemplos, setEjemplos] = useState<string[]>([])
  const [reparando, setReparando] = useState(false)

  useEffect(() => {
    fetch('/api/clients/reparar-listos').then(r => r.json()).then(d => {
      setTotal(d.total || 0); setEjemplos(d.ejemplos || [])
    }).catch(() => setTotal(0))
  }, [])

  async function reparar() {
    setReparando(true)
    try {
      const r = await fetch('/api/clients/reparar-listos', { method: 'POST' })
      const d = await r.json()
      alert(`✓ ${d.reparados} contactos pasaron de "listo" a "sin datos".`)
      setTotal(0)
      router.refresh()
    } finally { setReparando(false) }
  }

  if (!total) return null

  return (
    <div style={{ marginBottom: 12, border: '1px solid #f59e0b55', background: '#f59e0b12', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220, fontSize: '0.82rem' }}>
        <strong style={{ color: '#f59e0b' }}>⚠️ {total} marcados “listo” sin datos</strong> — sin teléfono, Instagram ni email.
        {ejemplos.length > 0 && <span style={{ color: 'var(--muted)' }}> Ej: {ejemplos.slice(0, 3).join(', ')}…</span>}
      </div>
      <button onClick={reparar} disabled={reparando} className="btn btn-primary" style={{ fontSize: '0.8rem', background: '#f59e0b', whiteSpace: 'nowrap' }}>
        {reparando ? 'Reparando…' : `🔧 Pasar a “sin datos” (${total})`}
      </button>
    </div>
  )
}
