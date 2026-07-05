'use client'
import { useState, useEffect, useCallback } from 'react'

interface Community {
  id: string
  title: string
  description: string
  link: string
  platform: string
  members: number | null
  categoria: string | null
  provincia: string | null
  ciudad: string | null
  score: number | null
  status: string
  source_query: string | null
  discovered_at: string
}

interface Stats {
  total: number
  activos: number
  caidos: number
  nuevosHoy: number
  alcance: number
  porPlataforma: [string, number][]
  porCategoria: [string, number][]
  porProvincia: [string, number][]
}

const PLT: Record<string, { color: string; icon: string; label: string }> = {
  whatsapp: { color: '#25D366', icon: '💬', label: 'WhatsApp' },
  telegram: { color: '#0088cc', icon: '✈️', label: 'Telegram' },
  discord:  { color: '#5865F2', icon: '🎮', label: 'Discord' },
  facebook: { color: '#1877F2', icon: '👥', label: 'Facebook' },
  reddit:   { color: '#FF4500', icon: '🔴', label: 'Reddit' },
}

export default function ComunidadesPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [results, setResults] = useState<Community[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [platform, setPlatform] = useState('')
  const [categoria, setCategoria] = useState('')
  const [provincia, setProvincia] = useState('')
  const [loading, setLoading] = useState(false)
  const [crawling, setCrawling] = useState(false)
  const [crawlMsg, setCrawlMsg] = useState('')

  const loadStats = useCallback(async () => {
    const r = await fetch('/api/communities', { method: 'POST' })
    if (r.ok) setStats(await r.json())
  }, [])

  const buscar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (platform) params.set('platform', platform)
    if (categoria) params.set('categoria', categoria)
    if (provincia) params.set('provincia', provincia)
    const r = await fetch(`/api/communities?${params}`)
    if (r.ok) {
      const data = await r.json()
      setResults(data.results || [])
      setTotal(data.total || 0)
    }
    setLoading(false)
  }, [q, platform, categoria, provincia])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { buscar() }, [platform, categoria, provincia]) // eslint-disable-line react-hooks/exhaustive-deps

  async function rastrearAhora() {
    setCrawling(true)
    setCrawlMsg('')
    try {
      const r = await fetch('/api/cron/community-crawl', { method: 'POST' })
      const data = await r.json()
      if (data.error) setCrawlMsg(`❌ ${data.error}`)
      else setCrawlMsg(`✅ Zona rastreada: ${data.celda} — ${data.encontrados} links encontrados, ${data.verificados} vivos, ${data.guardados} guardados${data.caidos ? `, ${data.caidos} marcados caídos` : ''}`)
      await Promise.all([loadStats(), buscar()])
    } catch (e) {
      setCrawlMsg(`❌ ${e}`)
    }
    setCrawling(false)
  }

  const maxCat = stats?.porCategoria[0]?.[1] || 1
  const maxProv = stats?.porProvincia[0]?.[1] || 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Comunidades 🌐</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginBottom: 16 }}>
            Directorio de comunidades públicas argentinas. El rastreador corre solo todos los días y el directorio crece.
          </p>
        </div>
        <button onClick={rastrearAhora} disabled={crawling}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}>
          {crawling ? '⏳ Rastreando...' : '🕷️ Rastrear ahora'}
        </button>
      </div>

      {crawlMsg && (
        <div style={{ background: crawlMsg.startsWith('✅') ? '#22c55e15' : '#ef444415', border: `1px solid ${crawlMsg.startsWith('✅') ? '#22c55e40' : '#ef444440'}`, color: crawlMsg.startsWith('✅') ? '#22c55e' : '#ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem' }}>
          {crawlMsg}
        </div>
      )}

      {/* Dashboard */}
      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              [stats.total, 'comunidades', 'var(--accent)'],
              [stats.activos, 'activas', '#22c55e'],
              [stats.nuevosHoy, 'nuevas hoy', '#3b82f6'],
              [stats.caidos, 'caídas', '#ef4444'],
              [stats.alcance >= 1000 ? `${(stats.alcance / 1000).toFixed(0)}k` : stats.alcance, 'alcance total', '#a855f7'],
            ].map(([val, lbl, color]) => (
              <div key={lbl as string} className="card" style={{ textAlign: 'center', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color as string }}>{val as number}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{lbl as string}</div>
              </div>
            ))}
          </div>

          {(stats.porCategoria.length > 0 || stats.porProvincia.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 10 }}>Por categoría</div>
                {stats.porCategoria.map(([cat, n]) => (
                  <div key={cat} onClick={() => setCategoria(categoria === cat ? '' : cat)} style={{ cursor: 'pointer', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 2 }}>
                      <span style={{ color: categoria === cat ? 'var(--accent)' : 'var(--text)', fontWeight: categoria === cat ? 700 : 400 }}>{cat}</span>
                      <span style={{ color: 'var(--muted)' }}>{n}</span>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 4, height: 6 }}>
                      <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${(n / maxCat) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 10 }}>Por provincia</div>
                {stats.porProvincia.map(([prov, n]) => (
                  <div key={prov} onClick={() => setProvincia(provincia === prov ? '' : prov)} style={{ cursor: 'pointer', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 2 }}>
                      <span style={{ color: provincia === prov ? '#3b82f6' : 'var(--text)', fontWeight: provincia === prov ? 700 : 400 }}>{prov}</span>
                      <span style={{ color: 'var(--muted)' }}>{n}</span>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 4, height: 6 }}>
                      <div style={{ background: '#3b82f6', borderRadius: 4, height: 6, width: `${(n / maxProv) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Buscador */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Buscar por nombre, descripción o ciudad..."
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.88rem' }} />
          <button onClick={buscar} disabled={loading}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            {loading ? '...' : '🔍'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button onClick={() => setPlatform('')}
            style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.73rem',
              background: !platform ? 'var(--accent)' : 'var(--bg)', color: !platform ? '#fff' : 'var(--text)' }}>
            Todas
          </button>
          {Object.entries(PLT).map(([key, cfg]) => (
            <button key={key} onClick={() => setPlatform(platform === key ? '' : key)}
              style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.73rem',
                background: platform === key ? cfg.color : 'var(--bg)', color: platform === key ? '#fff' : 'var(--text)' }}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
          {(categoria || provincia) && (
            <button onClick={() => { setCategoria(''); setProvincia('') }}
              style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid #ef444440', cursor: 'pointer', fontSize: '0.73rem', background: '#ef444415', color: '#ef4444' }}>
              ✕ {[categoria, provincia].filter(Boolean).join(' · ')}
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 10 }}>
        {total} comunidades{results.length < total ? ` (mostrando ${results.length})` : ''}
      </div>

      {results.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '0.85rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🕷️</div>
          El directorio está vacío o no hay resultados con esos filtros.
          <div style={{ fontSize: '0.78rem', marginTop: 6 }}>Ejecutá &quot;Rastrear ahora&quot; para empezar a llenarlo — cada corrida agrega una zona nueva.</div>
        </div>
      )}

      {results.map(c => {
        const cfg = PLT[c.platform] || PLT.telegram
        return (
          <div key={c.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ background: `${cfg.color}15`, color: cfg.color, borderRadius: 8, padding: '6px 10px', fontSize: '1.1rem', flexShrink: 0 }}>{cfg.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.title}</span>
                {c.status === 'caido' && <span style={{ background: '#ef444420', color: '#ef4444', borderRadius: 10, padding: '1px 8px', fontSize: '0.65rem', fontWeight: 700 }}>CAÍDO</span>}
                {typeof c.score === 'number' && (
                  <span style={{ fontWeight: 800, fontSize: '0.78rem', color: c.score >= 70 ? '#22c55e' : c.score >= 45 ? '#eab308' : '#ef4444' }}>{c.score}</span>
                )}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginBottom: 4 }}>
                {[c.categoria, c.ciudad || c.provincia, c.members ? `${c.members.toLocaleString('es-AR')} miembros` : null].filter(Boolean).join(' · ')}
              </div>
              {c.description && <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>}
            </div>
            <a href={c.link} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
              <button style={{ background: cfg.color, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                Abrir
              </button>
            </a>
          </div>
        )
      })}
    </div>
  )
}
