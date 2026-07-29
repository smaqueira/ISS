'use client'
import { useState } from 'react'

interface Fila { handle: string; name: string; crear: boolean }

export default function AltaDesdeIg() {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<'idle' | 'buscando' | 'revisar' | 'creando'>('idle')
  const [progreso, setProgreso] = useState('')
  const [filas, setFilas] = useState<Fila[]>([])
  const [creados, setCreados] = useState<number | null>(null)
  const [repetidos, setRepetidos] = useState<number | null>(null)

  function parseHandles(): string[] {
    return [...new Set(
      texto.split(/[\n,;\s]+/)
        .map(s => s.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?].*$/, '').toLowerCase())
        .filter(h => h.length > 1)
    )]
  }

  async function buscar() {
    const handles = parseHandles()
    if (!handles.length) return
    setEstado('buscando'); setCreados(null); setFilas([])
    const out: Fila[] = []
    for (let i = 0; i < handles.length; i++) {
      const h = handles[i]
      setProgreso(`Buscando ${i + 1}/${handles.length}: @${h}`)
      let name = ''
      try {
        const r = await fetch('/api/clients/nombre-desde-ig', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: h }),
        })
        const d = await r.json()
        name = d.name || ''
      } catch { /* seguir */ }
      out.push({ handle: h, name: name || h, crear: true })
    }
    setFilas(out); setEstado('revisar'); setProgreso('')
  }

  async function crear() {
    setEstado('creando')
    const aCrear = filas.filter(f => f.crear && f.name.trim())
    let ok = 0
    let repetidos = 0
    for (let i = 0; i < aCrear.length; i++) {
      const f = aCrear[i]
      setProgreso(`Creando ${i + 1}/${aCrear.length}: ${f.name}`)
      try {
        const r = await fetch('/api/clients', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: f.name.trim(), instagram: '@' + f.handle }),
        })
        const d = await r.json().catch(() => ({}))
        if (r.ok && d?.existing) repetidos++
        else if (r.ok) ok++
      } catch { /* seguir */ }
    }
    setCreados(ok); setRepetidos(repetidos); setEstado('idle'); setProgreso(''); setFilas([]); setTexto('')
  }

  function set(handle: string, patch: Partial<Fila>) {
    setFilas(prev => prev.map(f => f.handle === handle ? { ...f, ...patch } : f))
  }

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', width: '100%' } as const

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
        Pegá uno o varios usuarios de Instagram (uno por línea, o separados por coma). Busco el nombre del negocio y los doy de alta como prospectos.
      </div>

      {(estado === 'idle' || estado === 'buscando') && (
        <>
          <textarea
            value={texto} onChange={e => setTexto(e.target.value)} rows={5}
            placeholder={'@donpepe\n@laparrilla\ninstagram.com/otrocomercio'}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }}
          />
          {estado === 'buscando' && <div style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 10 }}>⏳ {progreso}</div>}
          <button onClick={buscar} disabled={estado === 'buscando' || !texto.trim()} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            {estado === 'buscando' ? 'Buscando…' : '🔎 Buscar nombres'}
          </button>
        </>
      )}

      {estado === 'revisar' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{filas.length} para revisar — corregí el nombre si hace falta</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={crear} disabled={filas.filter(f => f.crear).length === 0} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                Crear {filas.filter(f => f.crear).length}
              </button>
              <button onClick={() => setEstado('idle')} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Volver</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filas.map(f => (
              <div key={f.handle} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', opacity: f.crear ? 1 : 0.5 }}>
                <input type="checkbox" checked={f.crear} onChange={e => set(f.handle, { crear: e.target.checked })} />
                <input value={f.name} onChange={e => set(f.handle, { name: e.target.value })} placeholder="Nombre del negocio"
                  style={{ flex: 1, minWidth: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 9px', color: 'var(--text)', fontSize: '0.82rem' }} />
                <a href={`https://instagram.com/${f.handle}`} target="_blank" rel="noreferrer" style={{ color: '#DD2A7B', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>@{f.handle} ↗</a>
              </div>
            ))}
          </div>
        </>
      )}

      {estado === 'creando' && <div style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>⏳ {progreso}</div>}

      {creados != null && (
        <div style={{ marginTop: 12, background: '#22c55e18', border: '1px solid #22c55e44', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: '#22c55e' }}>
          ✅ {creados} contactos creados como prospectos (con su Instagram cargado).
          {repetidos ? <span style={{ color: '#f59e0b', marginLeft: 8 }}>· {repetidos} ya existían (no se duplicaron)</span> : null}
        </div>
      )}
    </div>
  )
}
