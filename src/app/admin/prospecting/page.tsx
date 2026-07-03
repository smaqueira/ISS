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
  existing?: boolean
}

const RUBROS_GASTRONOMIA = [
  'restaurante', 'parrilla', 'bar', 'cafeteria', 'pizzeria', 'sushi',
  'bodegon', 'rotiseria', 'cantina', 'hamburgueseria', 'catering', 'hotel',
  'supermercado', 'verduleria', 'carniceria', 'almacen', 'buffet', 'comida rapida',
]

const ZONAS_CABA = [
  'Palermo', 'Recoleta', 'San Telmo', 'Belgrano', 'Caballito', 'Almagro',
  'Villa Crespo', 'Nunez', 'Colegiales', 'Flores', 'Barracas', 'La Boca',
  'Puerto Madero', 'Microcentro', 'Villa Urquiza', 'Chacarita',
]

const ZONAS_GBA_NORTE = [
  'San Isidro', 'Vicente Lopez', 'Martinez', 'Olivos', 'La Lucila', 'Munro',
  'Florida', 'Boulogne', 'Beccar', 'Villa Adelina', 'Nordelta',
  'Tigre', 'San Fernando', 'Don Torcuato', 'Pacheco', 'Garín',
  'Pilar', 'Escobar', 'San Miguel', 'Malvinas Argentinas', 'José C. Paz',
]

const ZONAS_GBA_SUR = [
  'Quilmes', 'Lanus', 'Avellaneda', 'Banfield', 'Lomas de Zamora',
  'Adrogué', 'Bernal', 'Berazategui', 'Florencio Varela', 'Temperley',
]

const ZONAS_GBA_OESTE = [
  'Moron', 'Ramos Mejia', 'San Justo', 'Merlo', 'Haedo', 'Castelar',
  'Ituzaingo', 'Hurlingham', 'Ciudadela', 'Liniers',
]

export default function ProspectingPage() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [selectedRubros, setSelectedRubros] = useState<string[]>([])
  const [selectedZonas, setSelectedZonas] = useState<string[]>([])
  const [mode, setMode] = useState<'single' | 'bulk' | 'zona'>('single')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [imported, setImported] = useState<number | null>(null)
  const [progress, setProgress] = useState('')

  async function search(autoImport = false) {
    setLoading(true)
    setResults([])
    setImported(null)

    if (mode === 'single') {
      if (!query || !city) { setLoading(false); return }
      setProgress('Buscando...')
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, city, auto_import: autoImport }),
      })
      const data = await res.json()
      setResults(data.results || [])
      if (data.imported != null) setImported(data.imported)

    } else if (mode === 'bulk') {
      if (!city) { setLoading(false); return }
      const rubros = selectedRubros.length ? selectedRubros : RUBROS_GASTRONOMIA.slice(0, 6)
      let totalImported = 0
      const allResults: Result[] = []
      for (let i = 0; i < rubros.length; i++) {
        setProgress(`Buscando ${rubros[i]} en ${city} (${i + 1}/${rubros.length})...`)
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

    } else if (mode === 'zona') {
      const zonas = selectedZonas.length ? selectedZonas : ZONAS_CABA.slice(0, 4)
      const rubros = selectedRubros.length ? selectedRubros : ['restaurante', 'parrilla', 'bar', 'cafeteria']
      let totalImported = 0
      const allResults: Result[] = []
      const total = zonas.length * rubros.length
      let count = 0
      for (const zona of zonas) {
        for (const rubro of rubros) {
          count++
          setProgress(`${rubro} en ${zona} (${count}/${total})...`)
          const res = await fetch('/api/prospecting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: rubro, city: zona, auto_import: true }),
          })
          const data = await res.json()
          allResults.push(...(data.results || []))
          totalImported += data.imported || 0
        }
      }
      setResults(allResults)
      setImported(totalImported)
    }

    setProgress('')
    setLoading(false)
  }

  function toggle(val: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  const chipStyle = (active: boolean) => ({
    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.78rem',
    background: active ? 'var(--accent)' : 'var(--bg)', color: active ? 'white' : 'var(--text)',
  })
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }
  const tabStyle = (t: string) => ({
    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', border: 'none',
    background: mode === t ? 'var(--accent)' : 'transparent',
    color: mode === t ? 'white' : 'var(--muted)',
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Prospección automática</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Buscá negocios y la IA los califica e importa al CRM automáticamente.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={tabStyle('single')} onClick={() => setMode('single')}>🔍 Simple</button>
        <button style={tabStyle('bulk')} onClick={() => setMode('bulk')}>⚡ Por rubros</button>
        <button style={tabStyle('zona')} onClick={() => setMode('zona')}>🗺️ Por zonas CABA / GBA</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>

        {mode === 'single' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Rubro</label>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="restaurante, parrilla..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Ciudad o barrio</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Palermo, San Telmo..." style={inputStyle} />
            </div>
          </>
        )}

        {mode === 'bulk' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Ciudad o barrio</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Buenos Aires, Palermo..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
                Rubros {selectedRubros.length > 0 ? `(${selectedRubros.length} seleccionados)` : '(primeros 6 si no seleccionás)'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {RUBROS_GASTRONOMIA.map(r => (
                  <button key={r} onClick={() => toggle(r, selectedRubros, setSelectedRubros)} style={chipStyle(selectedRubros.includes(r))}>{r}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'zona' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
                Rubros {selectedRubros.length > 0 ? `(${selectedRubros.length})` : '(restaurante, parrilla, bar, cafeteria por defecto)'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {RUBROS_GASTRONOMIA.slice(0, 8).map(r => (
                  <button key={r} onClick={() => toggle(r, selectedRubros, setSelectedRubros)} style={chipStyle(selectedRubros.includes(r))}>{r}</button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6 }}>
                CABA {selectedZonas.filter(z => ZONAS_CABA.includes(z)).length > 0 ? `(${selectedZonas.filter(z => ZONAS_CABA.includes(z)).length} sel.)` : ''}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {ZONAS_CABA.map(z => (
                  <button key={z} onClick={() => toggle(z, selectedZonas, setSelectedZonas)} style={chipStyle(selectedZonas.includes(z))}>{z}</button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6 }}>
                GBA Norte {selectedZonas.filter(z => ZONAS_GBA_NORTE.includes(z)).length > 0 ? `(${selectedZonas.filter(z => ZONAS_GBA_NORTE.includes(z)).length} sel.)` : ''}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {ZONAS_GBA_NORTE.map(z => (
                  <button key={z} onClick={() => toggle(z, selectedZonas, setSelectedZonas)} style={chipStyle(selectedZonas.includes(z))}>{z}</button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6 }}>
                GBA Sur {selectedZonas.filter(z => ZONAS_GBA_SUR.includes(z)).length > 0 ? `(${selectedZonas.filter(z => ZONAS_GBA_SUR.includes(z)).length} sel.)` : ''}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {ZONAS_GBA_SUR.map(z => (
                  <button key={z} onClick={() => toggle(z, selectedZonas, setSelectedZonas)} style={chipStyle(selectedZonas.includes(z))}>{z}</button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6 }}>
                GBA Oeste {selectedZonas.filter(z => ZONAS_GBA_OESTE.includes(z)).length > 0 ? `(${selectedZonas.filter(z => ZONAS_GBA_OESTE.includes(z)).length} sel.)` : ''}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ZONAS_GBA_OESTE.map(z => (
                  <button key={z} onClick={() => toggle(z, selectedZonas, setSelectedZonas)} style={chipStyle(selectedZonas.includes(z))}>{z}</button>
                ))}
              </div>
            </div>
            {selectedZonas.length > 0 && selectedRubros.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
                ⚡ Va a hacer {selectedZonas.length * selectedRubros.length} búsquedas en total
              </div>
            )}
          </>
        )}

        {loading && progress && (
          <div style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 12 }}>⏳ {progress}</div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {mode === 'single' && (
            <button onClick={() => search(false)} disabled={loading || !query || !city} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? '🔍 Buscando...' : '🔍 Ver resultados'}
            </button>
          )}
          <button onClick={() => search(true)} disabled={loading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? '⏳ Procesando...' : mode === 'zona' ? '🗺️ Buscar por zonas e importar' : '⚡ Buscar e importar al CRM'}
          </button>
        </div>
      </div>

      {imported != null && (
        <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.9rem' }}>
          <span style={{ color: '#22c55e' }}>✅ {imported} nuevos importados al CRM</span>
          {results.filter(r => r.existing).length > 0 && (
            <span style={{ color: '#f59e0b', marginLeft: 12 }}>· {results.filter(r => r.existing).length} ya estaban en la base</span>
          )}
          <span style={{ color: 'var(--muted)', marginLeft: 12 }}>· {results.length} resultados totales</span>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {results.length} resultados
          </div>
          {results.map((r, i) => (
            <div key={i} className="card" style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: r.existing ? 0.65 : 1, borderColor: r.existing ? 'var(--border)' : undefined }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.name}
                  {r.existing && <span style={{ fontSize: '0.68rem', background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 6, padding: '2px 7px', fontWeight: 500 }}>ya en CRM</span>}
                </div>
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
