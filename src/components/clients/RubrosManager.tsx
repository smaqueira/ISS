'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Rubro { name: string; count: number }

export default function RubrosManager({ rubros }: { rubros: Rubro[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [destino, setDestino] = useState('')
  const [fusionando, setFusionando] = useState(false)

  const countMap: Record<string, number> = Object.fromEntries(rubros.map(r => [r.name, r.count]))
  const selArr = [...sel]
  const destinoEfectivo = destino && sel.has(destino)
    ? destino
    : (selArr.slice().sort((a, b) => (countMap[b] || 0) - (countMap[a] || 0))[0] || '')

  function empezar(name: string) { setEditando(name); setValor(name) }

  async function renombrar(desde: string, hacia: string): Promise<number> {
    const r = await fetch('/api/clients/rubros', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desde, hacia }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.error || `Error ${r.status}`)
    return d?.updated ?? 0
  }

  async function guardar(desde: string) {
    const hacia = valor.trim()
    if (!hacia || hacia === desde) { setEditando(null); return }
    setGuardando(true)
    try {
      const n = await renombrar(desde, hacia)
      if (n === 0) alert(`No se encontró ningún contacto con el rubro "${desde}".`)
      setEditando(null); router.refresh()
    } catch (e) {
      alert('No se pudo renombrar: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setGuardando(false) }
  }

  function toggleSel(name: string) {
    setSel(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  async function fusionar() {
    const dest = destinoEfectivo
    if (!dest) return
    setFusionando(true)
    try {
      let total = 0
      for (const name of selArr) if (name !== dest) total += await renombrar(name, dest)
      setSel(new Set()); setDestino(''); router.refresh()
      alert(`✓ ${total} contactos pasaron a "${dest}".`)
    } catch (e) {
      alert('No se pudo fusionar: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setFusionando(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <datalist id="rubros-existentes">
        {rubros.map(r => <option key={r.name} value={r.name} />)}
      </datalist>

      {/* Barra de fusión (al seleccionar 2+) */}
      {sel.size >= 2 && (
        <div style={{ position: 'sticky', top: 8, zIndex: 5, background: 'var(--accent)18', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Fusionar {sel.size} en:</span>
          <select value={destinoEfectivo} onChange={e => setDestino(e.target.value)}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)', fontSize: '0.82rem', maxWidth: 260 }}>
            {selArr.map(n => <option key={n} value={n}>{n} ({countMap[n] || 0})</option>)}
          </select>
          <button onClick={fusionar} disabled={fusionando} className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.8rem' }}>
            {fusionando ? 'Fusionando...' : '🔀 Fusionar'}
          </button>
          <button onClick={() => setSel(new Set())} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: '0.8rem' }}>Cancelar</button>
        </div>
      )}

      {rubros.map(r => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${sel.has(r.name) ? 'var(--accent)' : 'var(--border)'}`, background: sel.has(r.name) ? 'var(--accent)10' : 'transparent', borderRadius: 10, padding: '10px 14px' }}>
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
              <input type="checkbox" checked={sel.has(r.name)} onChange={() => toggleSel(r.name)} style={{ cursor: 'pointer' }} title="Seleccionar para fusionar" />
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
