'use client'
import { useEffect, useState } from 'react'

interface Cli { id: string; name: string | null; city: string | null; rubro: string | null; phone: string | null; email: string | null; instagram: string | null }
interface Grupo { tipo: string; label: string; valor: string; items: Cli[] }

const COLOR: Record<string, string> = {
  telefono: '#22c55e', instagram: '#DD2A7B', email: '#7EC8C8', nombre: '#f59e0b',
  'telefono-parecido': '#84cc16', 'nombre-parecido': '#eab308',
}

export default function DuplicadosView() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null)
  const [totalDup, setTotalDup] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [fuzzy, setFuzzy] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  async function cargar(conFuzzy = fuzzy) {
    setCargando(true)
    try {
      const r = await fetch(`/api/clients/duplicados${conFuzzy ? '?fuzzy=1' : ''}`)
      const d = await r.json()
      setGrupos(d.grupos || [])
      setTotalDup(d.totalDuplicados || 0)
    } catch { setGrupos([]) }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar(false) }, [])

  function quitarGrupo(gi: number) {
    setGrupos(prev => prev ? prev.filter((_, i) => i !== gi) : prev)
  }

  async function borrar(gi: number, id: string, name: string | null) {
    if (!confirm(`¿Eliminar "${name || 'sin nombre'}"? No se puede deshacer.`)) return
    setOcupado(true)
    try {
      const r = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!r.ok) { alert('No se pudo eliminar (¿sos admin?).'); return }
      setGrupos(prev => {
        if (!prev) return prev
        const copia = prev.map(g => ({ ...g, items: [...g.items] }))
        copia[gi].items = copia[gi].items.filter(c => c.id !== id)
        setTotalDup(t => Math.max(0, t - 1))
        return copia.filter(g => g.items.length > 1)
      })
    } finally { setOcupado(false) }
  }

  async function fusionar(gi: number, keepId: string, items: Cli[]) {
    const dropIds = items.filter(c => c.id !== keepId).map(c => c.id)
    if (!dropIds.length) return
    if (!confirm(`Fusionar ${items.length} fichas en una: se completan los datos faltantes en la que elegiste y se borran las otras ${dropIds.length}. ¿Seguir?`)) return
    setOcupado(true)
    try {
      const r = await fetch('/api/clients/merge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, dropIds }),
      })
      const d = await r.json()
      if (!r.ok) { alert('No se pudo fusionar: ' + (d?.error || r.status)); return }
      quitarGrupo(gi)
      setTotalDup(t => Math.max(0, t - dropIds.length))
    } finally { setOcupado(false) }
  }

  if (cargando) return <div style={{ color: 'var(--muted)', padding: 20 }}>⏳ Escaneando toda la base…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          {grupos && grupos.length > 0
            ? <><strong style={{ color: 'var(--text)' }}>{grupos.length}</strong> grupos · <strong style={{ color: '#f59e0b' }}>{totalDup}</strong> a depurar</>
            : 'Sin duplicados con este criterio.'}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={fuzzy} onChange={e => { setFuzzy(e.target.checked); cargar(e.target.checked) }} /> Incluir parecidos
          </label>
          <button onClick={() => cargar()} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>↻ Reescanear</button>
        </div>
      </div>

      {(!grupos || grupos.length === 0) && (
        <div style={{ background: '#22c55e12', border: '1px solid #22c55e44', borderRadius: 10, padding: 20, color: '#22c55e', fontSize: '0.9rem' }}>
          ✅ No se encontraron duplicados{fuzzy ? ' (incluyendo parecidos)' : ''}.
        </div>
      )}

      {grupos && grupos.map((g, gi) => (
        <div key={`${g.tipo}-${gi}`} style={{ border: `1px solid ${COLOR[g.tipo] || 'var(--border)'}55`, borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: COLOR[g.tipo] || 'var(--text)', marginBottom: 8 }}>
            {g.label}: <span style={{ fontWeight: 400 }}>{g.valor.replace('||', ' · ')}</span> <span style={{ color: 'var(--muted)' }}>({g.items.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.items.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: 6, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 600 }}>{c.name || '(sin nombre)'}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
                    {[c.rubro, c.city, c.phone, c.email, c.instagram].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <a href={`/admin/clients/${c.id}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--accent)', textDecoration: 'none' }}>ver ↗</a>
                <button onClick={() => fusionar(gi, c.id, g.items)} disabled={ocupado} title="Conservar esta y fusionar el resto acá" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#22c55e' }}>⭐ Conservar y fusionar</button>
                <button onClick={() => borrar(gi, c.id, c.name)} disabled={ocupado} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#ef4444' }}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
