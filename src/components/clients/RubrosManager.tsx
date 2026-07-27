'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Rubro { name: string; count: number }

export default function RubrosManager({ rubros }: { rubros: Rubro[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)

  function empezar(name: string) { setEditando(name); setValor(name) }

  async function guardar(desde: string) {
    const hacia = valor.trim()
    if (!hacia || hacia === desde) { setEditando(null); return }
    setGuardando(true)
    try {
      await fetch('/api/clients/rubros', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desde, hacia }),
      })
      setEditando(null)
      router.refresh()
    } finally { setGuardando(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <datalist id="rubros-existentes">
        {rubros.map(r => <option key={r.name} value={r.name} />)}
      </datalist>

      {rubros.map(r => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
          {editando === r.name ? (
            <>
              <input
                autoFocus list="rubros-existentes" value={valor} onChange={e => setValor(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') guardar(r.name); if (e.key === 'Escape') setEditando(null) }}
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: '0.85rem' }}
              />
              <button onClick={() => guardar(r.name)} disabled={guardando} className="btn btn-primary" style={{ padding: '7px 12px', fontSize: '0.8rem' }}>
                {guardando ? '...' : 'Guardar'}
              </button>
              <button onClick={() => setEditando(null)} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: '0.8rem' }}>Cancelar</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px' }}>{r.count}</span>
              <button onClick={() => empezar(r.name)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>✏️ Renombrar</button>
            </>
          )}
        </div>
      ))}

      {rubros.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: '0.85rem' }}>No hay rubros cargados todavía.</div>
      )}
    </div>
  )
}
