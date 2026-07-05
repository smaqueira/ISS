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

interface Resultado {
  title: string
  link: string
  snippet: string
  platform: Platform
  members: number | null
  verified: boolean
}

const ZONAS = ['Palermo', 'Recoleta', 'Belgrano', 'San Telmo', 'Caballito', 'Almagro', 'Villa Crespo', 'Nunez',
  'Flores', 'Barracas', 'La Boca', 'San Isidro', 'Vicente Lopez', 'Olivos', 'Tigre', 'Pilar',
  'Quilmes', 'Lanus', 'Avellaneda', 'Moron', 'Ramos Mejia']

const TEMAS = ['vecinos compras', 'gastronomia', 'emprendedores', 'delivery comida', 'foodie', 'compra venta barrio']

const PLT: Record<Platform, { color: string; bg: string; icon: string; label: string }> = {
  whatsapp: { color: '#25D366', bg: '#25D36615', icon: '💬', label: 'WhatsApp' },
  facebook: { color: '#1877F2', bg: '#1877F215', icon: '👥', label: 'Facebook' },
  telegram: { color: '#0088cc', bg: '#0088cc15', icon: '✈️', label: 'Telegram' },
}

const STATUS_CFG = {
  pendiente: { label: 'Pendiente',        bg: '#64748b20', color: '#94a3b8' },
  intentado: { label: 'Intenté ingresar', bg: '#f59e0b20', color: '#f59e0b' },
  en_grupo:  { label: 'En el grupo',      bg: '#22c55e20', color: '#22c55e' },
}

function detectPlatform(link: string): Platform | null {
  if (link.includes('chat.whatsapp.com')) return 'whatsapp'
  if (link.includes('facebook.com/groups') || link.includes('fb.com/groups')) return 'facebook'
  if (link.includes('t.me') || link.startsWith('@')) return 'telegram'
  return null
}

export default function GruposPage() {
  const [zona, setZona] = useState('')
  const [tema, setTema] = useState('vecinos compras')
  const [zonaInput, setZonaInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [guardados, setGuardados] = useState<GrupoGuardado[]>([])
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [searchStats, setSearchStats] = useState<{ linksEncontrados: number; verificados: number } | null>(null)
  const [serperAlert, setSerperAlert] = useState<'agotado' | 'parcial' | null>(null)
  const [searchDone, setSearchDone] = useState(false)
  const [savedLinks, setSavedLinks] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<Platform | 'todos'>('todos')
  const [quickLink, setQuickLink] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [savingQuick, setSavingQuick] = useState(false)
  const [tgConnected, setTgConnected] = useState(false)
  const [tgQuery, setTgQuery] = useState('')
  const [tgLoading, setTgLoading] = useState(false)

  const loadGuardados = useCallback(async () => {
    const r = await fetch('/api/grupos')
    if (r.ok) {
      const data = await r.json()
      setGuardados(data)
      setSavedLinks(new Set(data.map((g: GrupoGuardado) => g.link)))
    }
  }, [])

  useEffect(() => { loadGuardados() }, [loadGuardados])
  useEffect(() => {
    fetch('/api/telegram/status').then(r => r.json()).then(d => setTgConnected(d.connected)).catch(() => {})
  }, [])

  const zonaActual = zonaInput || zona

  async function buscar() {
    if (!zonaActual) return
    setLoading(true)
    setResultados([])
    setSearchStats(null)
    setSearchDone(false)
    try {
      const r = await fetch('/api/prospecting/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zona: zonaActual, tema }),
      })
      const data = await r.json()
      setResultados(data.results || [])
      setSearchStats(data.stats || null)
      if (data.serper?.sinCreditos) setSerperAlert('agotado')
      else if (data.serper?.clavesAgotadas > 0) setSerperAlert('parcial')
      else setSerperAlert(null)
    } catch { /* mostrar vacío */ }
    setSearchDone(true)
    setLoading(false)
  }

  // Búsqueda extra dentro de Telegram (MTProto) — encuentra grupos públicos que Google no indexa
  async function buscarTelegramInterno() {
    const q = tgQuery.trim() || zonaActual
    if (!q || !tgConnected) return
    setTgLoading(true)
    try {
      const r = await fetch(`/api/telegram/search?q=${encodeURIComponent(q)}&global=1`)
      const data = await r.json()
      if (Array.isArray(data)) {
        const nuevos: Resultado[] = data
          .filter(g => g.link)
          .map(g => ({
            title: g.title, link: g.link!, snippet: g.type, platform: 'telegram' as const,
            members: g.participantsCount, verified: true,
          }))
        setResultados(prev => {
          const links = new Set(prev.map(p => p.link))
          return [...prev, ...nuevos.filter(n => !links.has(n.link))]
        })
        setSearchDone(true)
      }
    } catch { /* ignorar */ }
    setTgLoading(false)
  }

  async function guardarResultado(g: Resultado) {
    setBusy(p => ({ ...p, [g.link]: true }))
    await fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona: zonaActual, tema, grupos: [{ title: g.title, link: g.link, platform: g.platform, snippet: g.snippet }] }),
    })
    await loadGuardados()
    setBusy(p => ({ ...p, [g.link]: false }))
  }

  async function guardarQuick() {
    const platform = detectPlatform(quickLink)
    if (!platform || !quickTitle.trim()) return
    setSavingQuick(true)
    const link = quickLink.startsWith('@') ? `https://t.me/${quickLink.slice(1)}`
      : quickLink.startsWith('http') ? quickLink : `https://${quickLink}`
    await fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona: zonaActual, tema, grupos: [{ title: quickTitle, link, platform, snippet: 'agregado manualmente' }] }),
    })
    setQuickLink(''); setQuickTitle('')
    await loadGuardados()
    setSavingQuick(false)
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

  const quickPlatform = detectPlatform(quickLink)
  const filtrados = filtro === 'todos' ? guardados : guardados.filter(g => g.platform === filtro)
  const enGrupo = guardados.filter(g => g.status === 'en_grupo')
  const pendientes = guardados.filter(g => g.status === 'pendiente')

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Grupos B2C</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginBottom: 16 }}>
        El objetivo: estar adentro de grupos donde compra tu cliente. Buscamos links vivos y verificados.
      </p>

      {/* RESULTADO REAL: dónde estás */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>{enGrupo.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>grupos donde estás</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{pendientes.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>por ingresar</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0088cc' }}>
            {guardados.filter(g => g.platform === 'telegram' && g.status === 'en_grupo').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>reciben oferta 8am ✈️</div>
        </div>
      </div>

      {/* AGREGAR POR LINK — el camino más directo */}
      <div className="card" style={{ marginBottom: 16, border: '1px solid var(--accent)40' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>⚡ Agregar grupo por link</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.76rem', marginBottom: 10 }}>
          ¿Conseguiste un link (te lo pasó un vecino, lo viste en otro grupo)? Pegalo acá — detecta la plataforma solo.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={quickLink} onChange={e => setQuickLink(e.target.value)}
            placeholder="chat.whatsapp.com/... · t.me/... · facebook.com/groups/..."
            style={{ flex: 2, minWidth: 200, background: 'var(--bg)', border: `1px solid ${quickPlatform ? PLT[quickPlatform].color : 'var(--border)'}`, borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.85rem' }} />
          <input value={quickTitle} onChange={e => setQuickTitle(e.target.value)}
            placeholder="Nombre del grupo"
            style={{ flex: 1, minWidth: 140, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.85rem' }} />
          <button onClick={guardarQuick} disabled={savingQuick || !quickPlatform || !quickTitle.trim()}
            style={{ background: quickPlatform ? PLT[quickPlatform].color : 'var(--border)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {savingQuick ? '...' : quickPlatform ? `${PLT[quickPlatform].icon} Guardar` : 'Guardar'}
          </button>
        </div>
      </div>

      {/* BUSCAR LINKS VIVOS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10 }}>🔎 Buscar links de grupos</div>

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
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.88rem', marginBottom: 10, boxSizing: 'border-box' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {TEMAS.map(t => (
            <button key={t} onClick={() => setTema(t)}
              style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.75rem',
                background: tema === t ? 'var(--accent)' : 'var(--bg)', color: tema === t ? '#fff' : 'var(--text)' }}>
              {t}
            </button>
          ))}
        </div>

        <button onClick={buscar} disabled={loading || !zonaActual} className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          {loading ? '⏳ Buscando y verificando links...' : `🔎 Buscar grupos en ${zonaActual || '...'}`}
        </button>

        {tgConnected && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input value={tgQuery} onChange={e => setTgQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarTelegramInterno()}
              placeholder="Extra: buscar dentro de Telegram (grupos públicos)..."
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid #0088cc30', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.82rem' }} />
            <button onClick={buscarTelegramInterno} disabled={tgLoading || (!tgQuery.trim() && !zonaActual)}
              style={{ background: '#0088cc', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              {tgLoading ? '...' : '✈️'}
            </button>
          </div>
        )}
      </div>

      {/* Alerta de créditos Serper */}
      {serperAlert && (
        <div style={{
          background: serperAlert === 'agotado' ? '#ef444415' : '#f59e0b15',
          border: `1px solid ${serperAlert === 'agotado' ? '#ef444440' : '#f59e0b40'}`,
          color: serperAlert === 'agotado' ? '#ef4444' : '#f59e0b',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.83rem',
        }}>
          {serperAlert === 'agotado'
            ? <>🚨 <b>Créditos de Serper agotados.</b> La búsqueda de Google no funciona hasta renovar. Entrá a <a href="https://serper.dev" target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>serper.dev</a>, creá una clave nueva (gratis, 2.500 búsquedas) y cargala en Configuración.</>
            : <>⚠️ <b>Una o más claves de Serper se quedaron sin créditos.</b> La búsqueda sigue funcionando con las restantes, pero conviene renovar en <a href="https://serper.dev" target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>serper.dev</a>.</>}
        </div>
      )}

      {/* RESULTADOS */}
      {searchDone && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Resultados {resultados.length > 0 && `(${resultados.length})`}
            </div>
            {searchStats && (
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                {searchStats.linksEncontrados} links encontrados · {searchStats.verificados} activos verificados
              </div>
            )}
          </div>

          {resultados.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30, fontSize: '0.84rem' }}>
              No se encontraron links vivos para esa zona/tema. Probá otro tema, otra zona cercana, o conseguí el link a mano y pegalo arriba.
            </div>
          )}

          {resultados.map(g => {
            const cfg = PLT[g.platform]
            const yaGuardado = savedLinks.has(g.link)
            return (
              <div key={g.link} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 8, padding: '6px 10px', fontSize: '1.1rem', flexShrink: 0 }}>{cfg.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {g.title}
                    {g.verified && <span style={{ background: '#22c55e20', color: '#22c55e', borderRadius: 10, padding: '1px 8px', fontSize: '0.65rem', fontWeight: 700 }}>✓ ACTIVO</span>}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
                    {g.members ? `${g.members.toLocaleString('es-AR')} miembros · ` : ''}{g.snippet}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a href={g.link} target="_blank" rel="noreferrer">
                    <button style={{ background: cfg.color, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                      Unirme
                    </button>
                  </a>
                  <button disabled={busy[g.link] || yaGuardado} onClick={() => guardarResultado(g)}
                    style={{ background: yaGuardado ? '#22c55e20' : 'var(--bg)', color: yaGuardado ? '#22c55e' : 'var(--muted)',
                      border: `1px solid ${yaGuardado ? '#22c55e40' : 'var(--border)'}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem' }}>
                    {busy[g.link] ? '...' : yaGuardado ? '✅' : '💾'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* GUARDADOS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📋 Mis grupos ({guardados.length})</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['todos', 'whatsapp', 'facebook', 'telegram'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.73rem',
                  background: filtro === f ? (f === 'todos' ? 'var(--accent)' : PLT[f].color) : 'var(--bg)',
                  color: filtro === f ? '#fff' : 'var(--text)' }}>
                {f === 'todos' ? 'Todos' : PLT[f].icon}
              </button>
            ))}
          </div>
        </div>

        {filtrados.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30, fontSize: '0.84rem' }}>
            Todavía no hay grupos guardados{filtro !== 'todos' ? ` de ${PLT[filtro].label}` : ''}.
          </div>
        )}

        {[['en_grupo', '✅ Estás adentro'], ['intentado', '🕐 Intentaste ingresar'], ['pendiente', '⏳ Por ingresar']].map(([status, titulo]) => {
          const lista = filtrados.filter(g => g.status === status)
          if (!lista.length) return null
          return (
            <div key={status} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {titulo} ({lista.length})
              </div>
              {lista.map(g => {
                const cfg = PLT[(g.platform as Platform)] || PLT.telegram
                const s = STATUS_CFG[g.status] || STATUS_CFG.pendiente
                return (
                  <div key={g.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 8, padding: '6px 10px', fontSize: '1.1rem', flexShrink: 0 }}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{g.title}</div>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.label}</span>
                      </div>
                      {g.zona && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>{g.zona} · {g.tema}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <a href={g.link} target="_blank" rel="noreferrer">
                          <button style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                            {cfg.icon} Abrir
                          </button>
                        </a>
                        {g.status === 'pendiente' && (
                          <button disabled={busy[g.id]} onClick={() => updateStatus(g.id, 'intentado')}
                            style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
                            {busy[g.id] ? '...' : '⏳ Intenté ingresar'}
                          </button>
                        )}
                        {g.status !== 'en_grupo' && (
                          <button disabled={busy[g.id]} onClick={() => updateStatus(g.id, 'en_grupo')}
                            style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
                            {busy[g.id] ? '...' : '✅ Estoy adentro'}
                          </button>
                        )}
                        {g.status === 'en_grupo' && g.platform === 'telegram' && (
                          <span style={{ fontSize: '0.72rem', color: '#0088cc', alignSelf: 'center' }}>✈️ recibe oferta 8am</span>
                        )}
                        <button disabled={busy[g.id]} onClick={() => deleteGrupo(g.id)}
                          style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
