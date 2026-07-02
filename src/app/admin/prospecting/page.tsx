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

export default function ProspectingPage() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [imported, setImported] = useState<number | null>(null)

  async function search(autoImport = false) {
    if (!query || !city) return
    setLoading(true)
    setResults([])
    setImported(null)
    const res = await fetch('/api/prospecting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, city, auto_import: autoImport }),
    })
    const data = await res.json()
    setResults(data.results || [])
    if (data.imported != null) setImported(data.imported)
    setLoading(false)
  }

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Prospección automática</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Buscá negocios en Google y la IA los califica automáticamente.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Rubro a buscar</label>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="restaurante, hotel, supermercado..." style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Ciudad</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Buenos Aires, Córdoba..." style={{ ...inputStyle, width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => search(false)} disabled={loading || !query || !city} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? '🔍 Buscando...' : '🔍 Ver resultados'}
          </button>
          <button onClick={() => search(true)} disabled={loading || !query || !city} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? '⏳ Procesando...' : '⚡ Buscar e importar al CRM'}
          </button>
        </div>
      </div>

      {imported != null && (
        <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#22c55e', fontSize: '0.9rem' }}>
          ✅ {imported} clientes importados al CRM automáticamente (score ≥ 60)
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
