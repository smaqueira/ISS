'use client'
import { useState } from 'react'

interface Result {
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
  type: string
  score: number
  reason: string
}

const RUBROS_SUGERIDOS = [
  'restaurante', 'hotel', 'supermercado', 'bar', 'parrilla', 'cafeteria',
  'catering', 'verduleria', 'carniceria', 'almacen', 'pizzeria', 'sushi',
]

export default function ProspectingPage() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [selectedRubros, setSelectedRubros] = useState<string[]>([])
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [imported, setImported] = useState<number | null>(null)
  const [progress, setProgress] = useState('')

  async function search(autoImport = false) {
    if (!city) return
    setLoading(true)
    setResults([])
    setImported(null)

    if (mode === 'single') {
      if (!query) return
      setProgress('Buscando...')
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, city, auto_import: autoImport }),
      })
      const data = await res.json()
      setResults(data.results || [])
      if (data.imported != null) setImported(data.imported)
    } else {
      const rubros = selectedRubros.length ? selectedRubros : RUBROS_SUGERIDOS.slice(0, 5)
      let totalImported = 0
      const allResults: Result[] = []

      for (let i = 0; i < rubros.length; i++) {
        setProgress(`Buscando ${rubros[i]} (${i + 1}/${rubros.length})...`)
        const res = await fetch('/api/prospecting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: rubros[i], city, auto_import: true }),
        })
        const data = await res.json()
        allResults.push(...(data.results || []))
        totalImported += data.imported || 0
      }

      setResults(allResults)
      setImported(totalImported)
    }

    setProgress('')
    setLoading(false)
  }

  function toggleRubro(r: string) {
    setSelectedRubros(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }
  const tabStyle = (t: string) => ({
    padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', border: 'none',
    background: mode === t ? 'var(--accent)' : 'transparent',
    color: mode === t ? 'white' : 'var(--muted)',
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Prospección automática</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Buscá negocios en Google y la IA los califica e importa automáticamente.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={tabStyle('single')} onClick={() => setMode('single')}>🔍 Búsqueda simple</button>
        <button style={tabStyle('bulk')} onClick={() => setMode('bulk')}>⚡ Búsqueda masiva</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Ciudad</label>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="Buenos Aires, Córdoba..." style={{ ...inputStyle, width: '100%' }} />
        </div>

        {mode === 'single' ? (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Rubro a buscar</label>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="restaurante, hotel, supermercado..." style={{ ...inputStyle, width: '100%' }} />
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
              Rubros a buscar {selectedRubros.length > 0 ? `(${selectedRubros.length} seleccionados)` : '(todos si no seleccionás)'}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {RUBROS_SUGERIDOS.map(r => (
                <button key={r} onClick={() => toggleRubro(r)} style={{
                  padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem',
                  background: selectedRubros.includes(r) ? 'var(--accent)' : 'var(--bg)',
                  color: selectedRubros.includes(r) ? 'white' : 'var(--text)',
                }}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {loading && progress && (
          <div style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 12 }}>⏳ {progress}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {mode === 'single' && (
            <button onClick={() => search(false)} disabled={loading || !query || !city} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? '🔍 Buscando...' : '🔍 Ver resultados'}
            </button>
          )}
          <button onClick={() => search(true)} disabled={loading || !city} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? '⏳ Procesando...' : mode === 'bulk' ? '⚡ Búsqueda masiva e importar' : '⚡ Buscar e importar al CRM'}
          </button>
        </div>
      </div>

      {imported != null && (
        <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#22c55e', fontSize: '0.9rem' }}>
          ✅ {imported} clientes importados al CRM automáticamente
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {results.length} resultados encontrados
          </div>
          {results.map((r, i) => (
            <div key={i} className="card" style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>{r.address}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>{r.reason}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  {r.phone && <span style={{ fontSize: '0.75rem' }}>📱 {r.phone}</span>}
                  {r.website && <a href={r.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>🌐 web</a>}
                  {r.rating && <span style={{ fontSize: '0.75rem', color: '#eab308' }}>⭐ {r.rating}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: r.score >= 75 ? '#22c55e' : r.score >= 50 ? '#eab308' : '#ef4444' }}>{r.score}</div>
                <span className={`badge badge-${r.type}`}>{r.type.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
