'use client'
import { useState, useEffect, useCallback } from 'react'

type Platform = 'whatsapp' | 'facebook' | 'telegram'

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

const ZONAS = ['Palermo', 'Recoleta', 'Belgrano', 'San Telmo', 'Caballito', 'Almagro', 'Villa Crespo', 'Nunez',
  'Flores', 'Barracas', 'La Boca', 'San Isidro', 'Vicente Lopez', 'Olivos', 'Tigre', 'Pilar',
  'Quilmes', 'Lanus', 'Avellaneda', 'Moron', 'Ramos Mejia']

const TEMAS = ['vecinos compras', 'gastronomia', 'emprendedores', 'delivery comida', 'foodie', 'compra venta barrio']

const PLT = {
  whatsapp: { color: '#25D366', bg: '#25D36615', icon: '💬', label: 'WhatsApp' },
  facebook: { color: '#1877F2', bg: '#1877F215', icon: '👥', label: 'Facebook' },
  telegram: { color: '#0088cc', bg: '#0088cc15', icon: '✈️', label: 'Telegram' },
}

const STATUS_CFG = {
  pendiente: { label: 'Pendiente',        bg: '#64748b20', color: '#94a3b8' },
  intentado: { label: 'Intenté ingresar', bg: '#f59e0b20', color: '#f59e0b' },
  en_grupo:  { label: 'En el grupo',      bg: '#22c55e20', color: '#22c55e' },
}

export default function GruposPage() {
  const [tab, setTab] = useState<Platform>('whatsapp')
  const [zona, setZona] = useState('')
  const [tema, setTema] = useState('vecinos compras')
  const [zonaInput, setZonaInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [guardados, setGuardados] = useState<GrupoGuardado[]>([])
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [view, setView] = useState<'buscar' | 'guardados'>('buscar')
  const [tgGroups, setTgGroups] = useState<{ id: string; title: string; type: string; username: string | null; link: string | null; participantsCount: number | null }[]>([])
  const [tgConnected, setTgConnected] = useState(false)
  const [tgSaved, setTgSaved] = useState<Set<string>>(new Set())
  const [savingAll, setSavingAll] = useState(false)
  const [tgError, setTgError] = useState('')

  const loadGuardados = useCallback(async () => {
    const r = await fetch('/api/grupos')
    if (r.ok) setGuardados(await r.json())
  }, [])

  useEffect(() => { loadGuardados() }, [loadGuardados])

  useEffect(() => {
    fetch('/api/telegram/status').then(r => r.json()).then(d => setTgConnected(d.connected))
  }, [])

  const zonaActual = zonaInput || zona

  async function buscarWAFB() {
    if (!zonaActual) return
    setLoading(true)
    const platform = tab === 'whatsapp' ? 'whatsapp' : 'facebook'
    const r = await fetch('/api/prospecting/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona: zonaActual, tema, platform }),
    })
    const data = await r.json()
    const found = (data.results || []).filter((g: { platform: string }) => g.platform === platform)
    if (found.length > 0) {
      await fetch('/api/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zona: zonaActual, tema, grupos: found }),
      })
      await loadGuardados()
    }
    setLoading(false)
    setView('guardados')
  }

  async function buscarTelegram() {
    if (!zonaActual) return
    setLoading(true)
    setTgGroups([])
    setTgError('')
    // Búsqueda múltiple: zona sola + zona con tema para más resultados
    const queries = [zonaActual, `${zonaActual} vecinos`, `${zonaActual} ${tema}`]
    const seen = new Set<string>()
    const all: typeof tgGroups = []
    for (const q of queries) {
      try {
        const r = await fetch(`/api/telegram/search?q=${encodeURIComponent(q)}`)
        const data = await r.json()
        if (data.error) { setTgError(data.error); break }
        for (const g of (Array.isArray(data) ? data : [])) {
          if (!seen.has(g.id)) { seen.add(g.id); all.push(g) }
        }
      } catch { /* continuar */ }
    }
    setTgGroups(all)
    if (all.length === 0 && !tgError) setTgError('No se encontraron grupos. Probá con otra zona o tema.')
    setLoading(false)
  }

  async function guardarTgGrupo(g: { id: string; title: string; link: string | null; type: string }) {
    if (!g.link) return
    setBusy(p => ({ ...p, [g.id]: true }))
    await fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona: zonaActual, tema, grupos: [{ title: g.title, link: g.link, platform: 'telegram', snippet: g.type }] }),
    })
    setTgSaved(p => new Set(p).add(g.id))
    await loadGuardados()
    setBusy(p => ({ ...p, [g.id]: false }))
  }

  async function guardarTodosTg() {
    const restantes = tgGroups.filter(g => g.link && !tgSaved.has(g.id))
    if (!restantes.length) return
    setSavingAll(true)
    await fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona: zonaActual, tema, grupos: restantes.map(g => ({ title: g.title, link: g.link, platform: 'telegram', snippet: g.type })) }),
    })
    setTgSaved(new Set(tgGroups.map(g => g.id)))
    await loadGuardados()
    setSavingAll(false)
  }

  async function updateStatus(id: string, status: string) {
    setBusy(p => ({ ...p, [id]: true }))
    await fetch(`/api/grupos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await loadGuardados()
    setBusy(p => ({ ...p, [id]: false }))
  }

  async function deleteGrupo(id: string) {
    setBusy(p => ({ ...p, [id]: true }))
    await fetch(`/api/grupos/${id}`, { method: 'DELETE' })
    await loadGuardados()
    setBusy(p => ({ ...p, [id]: false }))
  }

  const filtrados = guardados.filter(g => g.platform === tab)
  const pendientes = filtrados.filter(g => g.status === 'pendiente').length
  const intentados = filtrados.filter(g => g.status === 'intentado').length
  const enGrupo   = filtrados.filter(g => g.status === 'en_grupo').length

  const p = PLT[tab]

  function GrupoCard({ g }: { g: GrupoGuardado }) {
    const s = STATUS_CFG[g.status] || STATUS_CFG.pendiente
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
                {tab === 'whatsapp' ? '💬 Unirme' : tab === 'facebook' ? '👥 Ver grupo' : '✈️ Abrir'}
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
                {busy[g.id] ? '...' : '✅ Estoy en el grupo'}
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
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Grupos B2C</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginBottom: 16 }}>
        Buscá y rastreá grupos por plataforma. Cada pestaña es independiente.
      </p>

      {/* Selector de zona global */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Zona</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {ZONAS.map(z => (
            <button key={z} onClick={() => { setZona(z); setZonaInput('') }}
              style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.75rem',
                background: zona === z && !zonaInput ? 'var(--accent)' : 'var(--bg)', color: zona === z && !zonaInput ? '#fff' : 'var(--text)' }}>
              {z}
            </button>
          ))}
        </div>
        <input value={zonaInput} onChange={e => { setZonaInput(e.target.value); setZona('') }} placeholder="O escribí otro barrio..."
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.88rem' }} />

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Tema</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {TEMAS.map(t => (
              <button key={t} onClick={() => setTema(t)}
                style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.75rem',
                  background: tema === t ? 'var(--accent)' : 'var(--bg)', color: tema === t ? '#fff' : 'var(--text)' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs de plataforma */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {(['whatsapp', 'facebook', 'telegram'] as Platform[]).map((pl, i) => {
          const cfg = PLT[pl]
          const active = tab === pl
          return (
            <button key={pl} onClick={() => { setTab(pl); setView('buscar'); setTgGroups([]) }}
              style={{ flex: 1, padding: '11px 8px', border: 'none', borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                background: active ? cfg.bg : 'var(--surface)', color: active ? cfg.color : 'var(--muted)',
                fontWeight: active ? 700 : 400, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s' }}>
              {cfg.icon} {cfg.label}
              {guardados.filter(g => g.platform === pl).length > 0 && (
                <span style={{ marginLeft: 6, background: cfg.color + '30', color: cfg.color, borderRadius: 10, padding: '1px 7px', fontSize: '0.7rem' }}>
                  {guardados.filter(g => g.platform === pl).length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats de la plataforma activa */}
      {filtrados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[['pendientes', pendientes, 'var(--muted)'], ['intentados', intentados, '#f59e0b'], ['en grupo', enGrupo, '#22c55e']].map(([lbl, val, color]) => (
            <div key={lbl as string} className="card" style={{ textAlign: 'center', padding: '10px 6px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color as string }}>{val as number}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{lbl as string}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs buscar / guardados */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setView('buscar')}
          style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem',
            background: view === 'buscar' ? p.color : 'var(--bg)', color: view === 'buscar' ? '#fff' : 'var(--text)' }}>
          🔍 Buscar
        </button>
        <button onClick={() => setView('guardados')}
          style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem',
            background: view === 'guardados' ? p.color : 'var(--bg)', color: view === 'guardados' ? '#fff' : 'var(--text)' }}>
          📋 Guardados {filtrados.length > 0 && `(${filtrados.length})`}
        </button>
      </div>

      {/* BUSCAR */}
      {view === 'buscar' && (
        <div>
          {tab === 'telegram' && !tgConnected && (
            <div className="card" style={{ background: '#0088cc15', border: '1px solid #0088cc40', padding: '14px 16px', marginBottom: 16, fontSize: '0.85rem' }}>
              ✈️ Para buscar grupos de Telegram necesitás conectar la cuenta primero en{' '}
              <a href="/admin/telegram" style={{ color: '#0088cc', fontWeight: 600 }}>Admin → Telegram</a>.
            </div>
          )}

          <button
            onClick={tab === 'telegram' ? buscarTelegram : buscarWAFB}
            disabled={loading || !zonaActual || (tab === 'telegram' && !tgConnected)}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 12, marginBottom: 16,
              background: p.color, border: 'none' }}>
            {loading ? 'Buscando...' : `${p.icon} Buscar grupos de ${p.label} en ${zonaActual || '...'}`}
          </button>

          {/* Error Telegram */}
          {tab === 'telegram' && tgError && tgGroups.length === 0 && (
            <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '12px 16px', marginBottom: 12, fontSize: '0.83rem', color: '#ef4444' }}>
              ⚠️ {tgError}
            </div>
          )}

          {/* Resultados Telegram */}
          {tab === 'telegram' && tgGroups.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{tgGroups.length} grupos encontrados</div>
                <button onClick={guardarTodosTg} disabled={savingAll || tgGroups.every(g => tgSaved.has(g.id))}
                  style={{ background: '#0088cc20', color: '#0088cc', border: '1px solid #0088cc40', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                  {savingAll ? '...' : '💾 Guardar todos'}
                </button>
              </div>
              {tgGroups.map(g => (
                <div key={g.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ background: '#0088cc15', color: '#0088cc', borderRadius: 8, padding: '6px 10px', fontSize: '1.1rem', flexShrink: 0 }}>
                    {g.type === 'canal' ? '📢' : '👥'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{g.title}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
                      {g.type}{g.participantsCount ? ` · ${g.participantsCount.toLocaleString()} miembros` : ''}
                      {g.username && <span style={{ color: '#0088cc', marginLeft: 6 }}>@{g.username}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {g.link && (
                      <a href={g.link} target="_blank" rel="noreferrer">
                        <button style={{ background: '#0088cc15', color: '#0088cc', border: '1px solid #0088cc40', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>✈️</button>
                      </a>
                    )}
                    <button disabled={busy[g.id] || tgSaved.has(g.id)} onClick={() => guardarTgGrupo(g)}
                      style={{ background: tgSaved.has(g.id) ? '#22c55e20' : 'var(--bg)', color: tgSaved.has(g.id) ? '#22c55e' : 'var(--muted)',
                        border: `1px solid ${tgSaved.has(g.id) ? '#22c55e40' : 'var(--border)'}`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
                      {busy[g.id] ? '...' : tgSaved.has(g.id) ? '✅' : '💾'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab !== 'telegram' && !loading && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30, fontSize: '0.84rem' }}>
              Seleccioná una zona y hacé clic en Buscar. Los resultados se guardan automáticamente.
            </div>
          )}
        </div>
      )}

      {/* GUARDADOS */}
      {view === 'guardados' && (
        <div>
          {filtrados.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '0.85rem' }}>
              No hay grupos de {p.label} guardados. Usá la pestaña Buscar.
            </div>
          ) : (
            <>
              {[['pendiente', '⏳ Pendientes'], ['intentado', '🕐 Intenté ingresar'], ['en_grupo', '✅ En el grupo']].map(([status, titulo]) => {
                const lista = filtrados.filter(g => g.status === status)
                if (!lista.length) return null
                return (
                  <div key={status} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      {titulo} ({lista.length})
                    </div>
                    {lista.map(g => <GrupoCard key={g.id} g={g} />)}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
