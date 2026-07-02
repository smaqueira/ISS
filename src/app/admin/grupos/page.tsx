'use client'
import { useState } from 'react'

interface GroupResult {
  title: string
  link: string
  snippet: string
  platform: 'whatsapp' | 'facebook' | 'telegram' | 'otro'
}

const ZONAS = [
  'Palermo', 'Recoleta', 'Belgrano', 'San Telmo', 'Caballito', 'Almagro',
  'Villa Crespo', 'Nunez', 'Flores', 'Barracas', 'La Boca', 'Microcentro',
  'San Isidro', 'Vicente Lopez', 'Tigre', 'Olivos', 'Quilmes', 'Avellaneda',
  'Moron', 'Lomas de Zamora', 'Banfield', 'Ramos Mejia',
]

const TEMAS = [
  'vecinos compras', 'gastronomia', 'emprendedores', 'delivery comida',
  'foodie Buenos Aires', 'compra venta barrio', 'recetas cocina',
]

const PLATFORM_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  whatsapp: { bg: '#25D36620', color: '#25D366', icon: '💬' },
  facebook: { bg: '#1877F220', color: '#1877F2', icon: '👥' },
  telegram: { bg: '#0088cc20', color: '#0088cc', icon: '✈️' },
  otro: { bg: '#64748b20', color: '#94a3b8', icon: '🔗' },
}

export default function GruposPage() {
  const [zona, setZona] = useState('')
  const [tema, setTema] = useState('vecinos compras')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GroupResult[]>([])
  const [searched, setSearched] = useState(false)

  async function search() {
    if (!zona) return
    setLoading(true)
    setResults([])
    const res = await fetch('/api/prospecting/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona, tema }),
    })
    const data = await res.json()
    setResults(data.results || [])
    setSearched(true)
    setLoading(false)
  }

  const chipStyle = (active: boolean) => ({
    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.78rem',
    background: active ? 'var(--accent)' : 'var(--bg)', color: active ? 'white' : 'var(--text)',
  })
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }

  const waCount = results.filter(r => r.platform === 'whatsapp').length
  const fbCount = results.filter(r => r.platform === 'facebook').length

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Buscador de grupos</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Encontrá grupos de WhatsApp y Facebook por zona para compartir tu catálogo.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Zona</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {ZONAS.map(z => (
              <button key={z} onClick={() => setZona(z)} style={chipStyle(zona === z)}>{z}</button>
            ))}
          </div>
          <input value={zona} onChange={e => setZona(e.target.value)} placeholder="O escribí cualquier barrio / ciudad..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Tema del grupo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEMAS.map(t => (
              <button key={t} onClick={() => setTema(t)} style={chipStyle(tema === t)}>{t}</button>
            ))}
          </div>
        </div>

        <button onClick={search} disabled={loading || !zona} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          {loading ? '🔍 Buscando grupos...' : '🔍 Buscar grupos en ' + (zona || '...')}
        </button>
      </div>

      {searched && !loading && results.length === 0 && (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
          No se encontraron grupos para esta zona. Probá con otro barrio o tema.
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {waCount > 0 && <div style={{ background: '#25D36620', color: '#25D366', borderRadius: 8, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}>💬 {waCount} grupos de WhatsApp</div>}
            {fbCount > 0 && <div style={{ background: '#1877F220', color: '#1877F2', borderRadius: 8, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}>👥 {fbCount} grupos de Facebook</div>}
          </div>

          <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#f59e0b' }}>
            💡 <strong>Estrategia:</strong> Entrá al grupo, presentate brevemente y compartí tu link de catálogo. No spamees — una publicación por semana máximo.
          </div>

          {results.map((r, i) => {
            const p = PLATFORM_COLORS[r.platform]
            return (
              <div key={i} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ background: p.bg, color: p.color, borderRadius: 8, padding: '6px 10px', fontSize: '1.1rem', flexShrink: 0 }}>{p.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>{r.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8, lineClamp: 2 }}>{r.snippet}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a href={r.link} target="_blank" rel="noreferrer">
                        <button style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}40`, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                          {r.platform === 'whatsapp' ? '💬 Unirme al grupo' : r.platform === 'facebook' ? '👥 Ver grupo' : '🔗 Abrir'}
                        </button>
                      </a>
                      <button onClick={() => navigator.clipboard.writeText(r.link)} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
                        📋 Copiar link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
