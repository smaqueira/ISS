'use client'
import { useState, useEffect } from 'react'

interface GroupResult {
  title: string
  link: string
  snippet: string
  platform: 'whatsapp' | 'facebook' | 'telegram' | 'otro'
}

interface GrupoGuardado {
  id: string
  zona: string
  tema: string
  title: string
  link: string
  platform: string
  snippet: string
  status: 'pendiente' | 'intentado' | 'en_grupo'
  created_at: string
}

const ZONAS_CABA = [
  'Palermo', 'Recoleta', 'Belgrano', 'San Telmo', 'Caballito', 'Almagro',
  'Villa Crespo', 'Nunez', 'Flores', 'Barracas', 'La Boca', 'Microcentro',
]
const ZONAS_NORTE = [
  'San Isidro', 'Vicente Lopez', 'Martinez', 'Olivos', 'La Lucila', 'Munro',
  'Florida', 'Boulogne', 'Beccar', 'Villa Adelina', 'Nordelta',
  'Tigre', 'San Fernando', 'Don Torcuato', 'Pacheco', 'Garín',
  'Pilar', 'Escobar', 'San Miguel', 'Malvinas Argentinas', 'José C. Paz',
]
const ZONAS_SUR = [
  'Quilmes', 'Lanus', 'Avellaneda', 'Banfield', 'Lomas de Zamora',
  'Adrogué', 'Bernal', 'Berazategui', 'Florencio Varela', 'Temperley',
]
const ZONAS_OESTE = [
  'Moron', 'Ramos Mejia', 'San Justo', 'Merlo', 'Haedo', 'Castelar',
  'Ituzaingo', 'Hurlingham', 'Ciudadela', 'Liniers',
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

const STATUS_CONFIG = {
  pendiente:  { label: 'Pendiente',   bg: '#64748b20', color: '#94a3b8' },
  intentado:  { label: 'Intenté ingresar', bg: '#f59e0b20', color: '#f59e0b' },
  en_grupo:   { label: 'Estoy en el grupo', bg: '#22c55e20', color: '#22c55e' },
}

export default function GruposPage() {
  const [zona, setZona] = useState('')
  const [tema, setTema] = useState('vecinos compras')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GroupResult[]>([])
  const [searched, setSearched] = useState(false)
  const [guardados, setGuardados] = useState<GrupoGuardado[]>([])
  const [tab, setTab] = useState<'buscar' | 'guardados'>('buscar')
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => { loadGuardados() }, [])

  async function loadGuardados() {
    const res = await fetch('/api/grupos')
    const data = await res.json()
    setGuardados(data || [])
  }

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
    const found = data.results || []
    setResults(found)
    setSearched(true)
    setLoading(false)

    // Guardar todos los resultados automáticamente (evita duplicados en el backend)
    if (found.length > 0) {
      await fetch('/api/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zona, tema, grupos: found }),
      })
      await loadGuardados()
    }
  }

  async function updateStatus(id: string, status: string) {
    setSaving(prev => ({ ...prev, [id]: true }))
    await fetch(`/api/grupos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadGuardados()
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  const chipStyle = (active: boolean) => ({
    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.78rem',
    background: active ? 'var(--accent)' : 'var(--bg)', color: active ? 'white' : 'var(--text)',
  })
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }

  const pendientes = guardados.filter(g => g.status === 'pendiente').length
  const intentados = guardados.filter(g => g.status === 'intentado').length
  const enGrupo = guardados.filter(g => g.status === 'en_grupo').length

  function GrupoCard({ g }: { g: GrupoGuardado }) {
    const p = PLATFORM_COLORS[g.platform] || PLATFORM_COLORS.otro
    const s = STATUS_CONFIG[g.status] || STATUS_CONFIG.pendiente
    return (
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ background: p.bg, color: p.color, borderRadius: 8, padding: '6px 10px', fontSize: '1.1rem', flexShrink: 0 }}>{p.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{g.title}</div>
              <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>{g.zona} · {g.tema}</div>
            {g.snippet && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8 }}>{g.snippet}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <a href={g.link} target="_blank" rel="noreferrer">
                <button style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}40`, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                  {g.platform === 'whatsapp' ? '💬 Abrir grupo' : '👥 Ver grupo'}
                </button>
              </a>
              {g.status === 'pendiente' && (
                <button disabled={saving[g.id]} onClick={() => updateStatus(g.id, 'intentado')}
                  style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
                  {saving[g.id] ? '...' : '⏳ Intenté ingresar'}
                </button>
              )}
              {g.status === 'intentado' && (
                <button disabled={saving[g.id]} onClick={() => updateStatus(g.id, 'en_grupo')}
                  style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
                  {saving[g.id] ? '...' : '✅ Estoy en el grupo'}
                </button>
              )}
              {g.status === 'en_grupo' && (
                <span style={{ fontSize: '0.75rem', color: '#22c55e', padding: '5px 0' }}>✅ Ya estás en este grupo</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Grupos B2C</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
        Buscá y hacé seguimiento de grupos de WhatsApp y Facebook por zona.
      </p>

      {/* Stats */}
      {guardados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{guardados.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>guardados</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{intentados}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>intentados</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>{enGrupo}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>en el grupo</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('buscar')} style={{ ...chipStyle(tab === 'buscar'), fontWeight: tab === 'buscar' ? 700 : 400 }}>🔍 Buscar grupos</button>
        <button onClick={() => setTab('guardados')} style={{ ...chipStyle(tab === 'guardados'), fontWeight: tab === 'guardados' ? 700 : 400 }}>
          📋 Mis grupos {guardados.length > 0 && `(${guardados.length})`}
        </button>
      </div>

      {/* Tab: Buscar */}
      {tab === 'buscar' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Zona</label>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>CABA</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {ZONAS_CABA.map(z => <button key={z} onClick={() => setZona(z)} style={chipStyle(zona === z)}>{z}</button>)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>GBA Norte</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {ZONAS_NORTE.map(z => <button key={z} onClick={() => setZona(z)} style={chipStyle(zona === z)}>{z}</button>)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>GBA Sur</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {ZONAS_SUR.map(z => <button key={z} onClick={() => setZona(z)} style={chipStyle(zona === z)}>{z}</button>)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>GBA Oeste</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {ZONAS_OESTE.map(z => <button key={z} onClick={() => setZona(z)} style={chipStyle(zona === z)}>{z}</button>)}
              </div>
              <input value={zona} onChange={e => setZona(e.target.value)} placeholder="O escribí cualquier barrio / ciudad..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Tema del grupo</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TEMAS.map(t => <button key={t} onClick={() => setTema(t)} style={chipStyle(tema === t)}>{t}</button>)}
              </div>
            </div>
            <button onClick={search} disabled={loading || !zona} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
              {loading ? '🔍 Buscando grupos...' : '🔍 Buscar grupos en ' + (zona || '...')}
            </button>
          </div>

          {searched && !loading && results.length === 0 && (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No se encontraron grupos. Probá con otro barrio o tema.</div>
          )}

          {results.length > 0 && (
            <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#22c55e' }}>
              ✅ {results.length} grupos encontrados y guardados automáticamente en "Mis grupos"
            </div>
          )}
        </>
      )}

      {/* Tab: Guardados */}
      {tab === 'guardados' && (
        <>
          {guardados.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              Todavía no buscaste grupos. Usá la pestaña Buscar para encontrar grupos y guardarlos.
            </div>
          ) : (
            <>
              {pendientes > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>⏳ Pendientes ({pendientes})</div>
                  {guardados.filter(g => g.status === 'pendiente').map(g => <GrupoCard key={g.id} g={g} />)}
                </div>
              )}
              {intentados > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🕐 Intenté ingresar ({intentados})</div>
                  {guardados.filter(g => g.status === 'intentado').map(g => <GrupoCard key={g.id} g={g} />)}
                </div>
              )}
              {enGrupo > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>✅ En el grupo ({enGrupo})</div>
                  {guardados.filter(g => g.status === 'en_grupo').map(g => <GrupoCard key={g.id} g={g} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
