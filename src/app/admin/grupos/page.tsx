'use client'
import { useState, useEffect, useCallback } from 'react'

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

const ZONAS_CABA = ['Palermo', 'Recoleta', 'Belgrano', 'San Telmo', 'Caballito', 'Almagro', 'Villa Crespo', 'Nunez', 'Flores', 'Barracas', 'La Boca', 'Microcentro']
const ZONAS_NORTE = ['San Isidro', 'Vicente Lopez', 'Martinez', 'Olivos', 'Florida', 'Tigre', 'San Fernando', 'Pilar', 'Escobar', 'Nordelta']
const ZONAS_SUR = ['Quilmes', 'Lanus', 'Avellaneda', 'Banfield', 'Lomas de Zamora', 'Bernal', 'Berazategui']
const ZONAS_OESTE = ['Moron', 'Ramos Mejia', 'San Justo', 'Merlo', 'Haedo', 'Castelar', 'Ituzaingo']

const TEMAS = ['vecinos compras', 'gastronomia', 'emprendedores', 'delivery comida', 'foodie Buenos Aires', 'compra venta barrio', 'recetas cocina']

const PLATFORM: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  whatsapp: { bg: '#25D36620', color: '#25D366', icon: '💬', label: 'Unirme al grupo' },
  facebook: { bg: '#1877F220', color: '#1877F2', icon: '👥', label: 'Ver grupo' },
  telegram: { bg: '#0088cc20', color: '#0088cc', icon: '✈️', label: 'Abrir' },
  otro:     { bg: '#64748b20', color: '#94a3b8', icon: '🔗', label: 'Abrir' },
}

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pendiente: { label: 'Pendiente',          bg: '#64748b20', color: '#94a3b8' },
  intentado: { label: 'Intenté ingresar',   bg: '#f59e0b20', color: '#f59e0b' },
  en_grupo:  { label: 'Estoy en el grupo',  bg: '#22c55e20', color: '#22c55e' },
}

export default function GruposPage() {
  const [zona, setZona] = useState('')
  const [tema, setTema] = useState('vecinos compras')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GroupResult[]>([])
  const [searched, setSearched] = useState(false)
  const [guardados, setGuardados] = useState<GrupoGuardado[]>([])
  const [tab, setTab] = useState<'buscar' | 'guardados'>('buscar')
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const loadGuardados = useCallback(async () => {
    const res = await fetch('/api/grupos')
    if (res.ok) setGuardados(await res.json())
  }, [])

  useEffect(() => { loadGuardados() }, [loadGuardados])

  async function search() {
    if (!zona) return
    setLoading(true)
    setResults([])
    setSearched(false)
    const res = await fetch('/api/prospecting/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona, tema }),
    })
    const data = await res.json()
    const found: GroupResult[] = data.results || []
    setResults(found)
    setSearched(true)
    setLoading(false)

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
    setBusy(p => ({ ...p, [id]: true }))
    await fetch(`/api/grupos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadGuardados()
    setBusy(p => ({ ...p, [id]: false }))
  }

  async function deleteGrupo(id: string) {
    setBusy(p => ({ ...p, [id]: true }))
    await fetch(`/api/grupos/${id}`, { method: 'DELETE' })
    await loadGuardados()
    setBusy(p => ({ ...p, [id]: false }))
  }

  const chip = (active: boolean) => ({
    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.78rem',
    background: active ? 'var(--accent)' : 'var(--bg)', color: active ? 'white' : 'var(--text)',
  })

  const pendientes = guardados.filter(g => g.status === 'pendiente').length
  const intentados = guardados.filter(g => g.status === 'intentado').length
  const enGrupo   = guardados.filter(g => g.status === 'en_grupo').length

  function GrupoCard({ g }: { g: GrupoGuardado }) {
    const p = PLATFORM[g.platform] || PLATFORM.otro
    const s = STATUS[g.status]  || STATUS.pendiente
    return (
      <div className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ background: p.bg, color: p.color, borderRadius: 8, padding: '6px 10px', fontSize: '1.1rem', flexShrink: 0 }}>{p.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{g.title}</div>
            <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.label}</span>
          </div>
          {g.zona && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>{g.zona} · {g.tema}</div>}
          {g.snippet && <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: 8 }}>{g.snippet}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <a href={g.link} target="_blank" rel="noreferrer">
              <button style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}40`, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                {p.label}
              </button>
            </a>
            {g.status === 'pendiente' && (
              <button disabled={busy[g.id]} onClick={() => updateStatus(g.id, 'intentado')}
                style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
                {busy[g.id] ? '...' : '⏳ Intenté ingresar'}
              </button>
            )}
            {g.status === 'intentado' && (
              <button disabled={busy[g.id]} onClick={() => updateStatus(g.id, 'en_grupo')}
                style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
                {busy[g.id] ? '...' : '✅ Ya estoy en el grupo'}
              </button>
            )}
            <button disabled={busy[g.id]} onClick={() => deleteGrupo(g.id)}
              style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
              🗑
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Grupos B2C</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>Buscá grupos de WhatsApp y Facebook y hacé seguimiento de tu ingreso.</p>

      {guardados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--muted)' }}>{pendientes}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>pendientes</div>
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('buscar')} style={chip(tab === 'buscar')}>🔍 Buscar grupos</button>
        <button onClick={() => setTab('guardados')} style={chip(tab === 'guardados')}>
          📋 Mis grupos {guardados.length > 0 && `(${guardados.length})`}
        </button>
      </div>

      {/* BUSCAR */}
      {tab === 'buscar' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Zona</label>
            {[['CABA', ZONAS_CABA], ['GBA Norte', ZONAS_NORTE], ['GBA Sur', ZONAS_SUR], ['GBA Oeste', ZONAS_OESTE]].map(([label, zonas]) => (
              <div key={label as string} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>{label as string}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(zonas as string[]).map(z => <button key={z} onClick={() => setZona(z)} style={chip(zona === z)}>{z}</button>)}
                </div>
              </div>
            ))}
            <input value={zona} onChange={e => setZona(e.target.value)} placeholder="O escribí cualquier barrio..."
              style={{ marginTop: 8, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Tema</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {TEMAS.map(t => <button key={t} onClick={() => setTema(t)} style={chip(tema === t)}>{t}</button>)}
            </div>
          </div>
          <button onClick={search} disabled={loading || !zona} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            {loading ? '🔍 Buscando...' : `🔍 Buscar grupos en ${zona || '...'}`}
          </button>

          {searched && !loading && results.length === 0 && (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, fontSize: '0.85rem' }}>No se encontraron grupos. Probá con otro barrio o tema.</div>
          )}

          {results.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#22c55e' }}>
                ✅ {results.length} grupos guardados en "Mis grupos"
              </div>
              {results.map((r, i) => {
                const p = PLATFORM[r.platform] || PLATFORM.otro
                return (
                  <div key={i} className="card" style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ background: p.bg, color: p.color, borderRadius: 8, padding: '6px 10px', flexShrink: 0 }}>{p.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: 8 }}>{r.snippet}</div>
                      <a href={r.link} target="_blank" rel="noreferrer">
                        <button style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}40`, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                          {p.label}
                        </button>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MIS GRUPOS */}
      {tab === 'guardados' && (
        <>
          {guardados.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              Todavía no buscaste grupos. Usá la pestaña Buscar.
            </div>
          ) : (
            <>
              {pendientes > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>⏳ Pendientes ({pendientes})</div>
                  {guardados.filter(g => g.status === 'pendiente').map(g => <GrupoCard key={g.id} g={g} />)}
                </div>
              )}
              {intentados > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>🕐 Intenté ingresar ({intentados})</div>
                  {guardados.filter(g => g.status === 'intentado').map(g => <GrupoCard key={g.id} g={g} />)}
                </div>
              )}
              {enGrupo > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>✅ En el grupo ({enGrupo})</div>
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
