'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Detalle { label: string; puntos: number }
interface Opp {
  id: string; titulo: string; fragmento: string | null; url: string | null; fuente: string | null
  producto_nombre: string | null; match_pct: number | null; intencion: string | null
  score: number | null; score_detalle: Detalle[] | null; explicacion: string | null; accion: string | null
  cantidad: string | null; unidad: string | null; ubicacion: string | null; tipo_comprador: string | null
  urgencia: string | null; presupuesto: string | null; necesidad: string | null
  estado: string; feedback: string | null; created_at: string; publicado_en: string | null
}
interface Metricas { nuevas: number; alta_intencion: number; match_promedio: number; hoy: number }

const NIVEL = (s: number) => s >= 80 ? { icon: '🔥', label: 'Muy alta', color: '#ef4444' }
  : s >= 60 ? { icon: '🔴', label: 'Alta', color: '#f97316' }
  : s >= 40 ? { icon: '🟡', label: 'Media', color: '#eab308' }
  : { icon: '⚪', label: 'Baja', color: '#94a3b8' }

const ESTADOS = ['nueva', 'revisada', 'contactar', 'contactada', 'respondio', 'negociacion', 'venta', 'descartada', 'no_relevante', 'sin_respuesta', 'perdida']
const ESTADO_LABEL: Record<string, string> = {
  nueva: 'Nueva', revisada: 'Revisada', contactar: 'Contactar', contactada: 'Contactada',
  respondio: 'Respondió', negociacion: 'Negociación', venta: 'Venta', descartada: 'Descartada',
  no_relevante: 'No relevante', sin_respuesta: 'Sin respuesta', perdida: 'Perdida',
}

function hace(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export default function RadarDemanda() {
  const [opps, setOpps] = useState<Opp[]>([])
  const [met, setMet] = useState<Metricas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [escaneando, setEscaneando] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Opp | null>(null)
  const [resumen, setResumen] = useState<{ vender: Record<string, unknown> | null; resumenHoy: Record<string, unknown> } | null>(null)

  const cargar = useCallback(async (busqueda?: string) => {
    setCargando(true)
    try {
      const url = busqueda ? `/api/demanda/oportunidades?q=${encodeURIComponent(busqueda)}` : '/api/demanda/oportunidades'
      const r = await fetch(url); const d = await r.json()
      setOpps(d.oportunidades || []); setMet(d.metricas || null)
    } finally { setCargando(false) }
  }, [])

  useEffect(() => {
    cargar()
    fetch('/api/demanda/resumen').then(r => r.json()).then(setResumen).catch(() => {})
  }, [cargar])

  async function escanear() {
    setEscaneando(true)
    try {
      const r = await fetch('/api/demanda/scan', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'No se pudo escanear'); return }
      alert(`Radar ejecutado:\n\n${d.oportunidades} oportunidades nuevas\n${d.ruido_descartado} señales descartadas (ruido)\n${d.revisadas} resultados revisados`)
      cargar()
      fetch('/api/demanda/resumen').then(r => r.json()).then(setResumen).catch(() => {})
    } finally { setEscaneando(false) }
  }

  async function actualizar(id: string, patch: { estado?: string; feedback?: string }) {
    const r = await fetch(`/api/demanda/oportunidades/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (r.ok) {
      const d = await r.json()
      setOpps(prev => prev.map(o => o.id === id ? { ...o, ...d } : o))
      setSel(prev => prev && prev.id === id ? { ...prev, ...d } : prev)
    }
  }

  const v = resumen?.vender as { producto?: string; oportunidades?: number; porComprador?: Record<string, number>; variacionPct?: number | null; intencionPromedio?: string; narrativa?: string } | null
  const rh = resumen?.resumenHoy as { encontradas?: number; altaIntencion?: number; muyAlta?: number; conProducto?: number; productoTop?: string; zonaTop?: string; clienteTop?: string } | undefined

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: -0.5 }}>📡 RADAR DE DEMANDA</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>¿Quién está buscando comprar lo que vendés?</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/demanda/productos" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>📦 Qué vendo</Link>
          <Link href="/admin/demanda/configuracion" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>⚙️ Configuración</Link>
          <button onClick={escanear} disabled={escaneando} className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {escaneando ? '⏳ Buscando…' : '📡 Activar radar'}
          </button>
        </div>
      </div>

      {/* Métricas */}
      {met && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { l: 'Oportunidades nuevas', v: met.nuevas, c: 'var(--accent)' },
            { l: 'Alta intención', v: met.alta_intencion, c: '#ef4444' },
            { l: 'Coincidencia promedio', v: `${met.match_promedio}%`, c: '#22c55e' },
            { l: 'Detectadas hoy', v: met.hoy, c: '#7EC8C8' },
          ].map(m => (
            <div key={m.l} className="card" style={{ textAlign: 'center', padding: '12px 10px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ¿Qué debería vender hoy? */}
      {v?.producto && (
        <div className="card" style={{ marginBottom: 18, border: '1px solid var(--accent)', background: 'var(--accent)08' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            ¿Qué deberías vender hoy?
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900 }}>{v.producto}</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{v.oportunidades} oportunidades (7 días)</span>
            {v.variacionPct != null && (
              <span style={{ fontWeight: 800, color: v.variacionPct >= 0 ? '#22c55e' : '#ef4444', fontSize: '0.9rem' }}>
                {v.variacionPct >= 0 ? '↑' : '↓'} {Math.abs(v.variacionPct)}%
              </span>
            )}
          </div>
          {v.porComprador && (
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6 }}>
              {Object.entries(v.porComprador).map(([k, n]) => `${n} ${k}`).join(' · ')}
              {v.intencionPromedio && ` · Intención promedio: ${v.intencionPromedio}`}
            </div>
          )}
          {v.narrativa && <div style={{ fontSize: '0.85rem', marginTop: 8, lineHeight: 1.5 }}>{v.narrativa}</div>}
        </div>
      )}

      {/* Búsqueda en lenguaje natural */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') cargar(q) }}
          placeholder='Ej: "restaurantes de Zona Norte buscando langostinos"'
          style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: '0.85rem' }} />
        <button onClick={() => cargar(q)} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>🔎 Buscar</button>
        {q && <button onClick={() => { setQ(''); cargar() }} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>✕</button>}
      </div>

      {/* Lista */}
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
        Mejores oportunidades
      </div>

      {cargando ? <div style={{ color: 'var(--muted)', padding: 20 }}>⏳ Cargando…</div>
        : opps.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            Todavía no hay oportunidades. Cargá <Link href="/admin/demanda/productos" style={{ color: 'var(--accent)' }}>qué vendés</Link>, revisá la <Link href="/admin/demanda/configuracion" style={{ color: 'var(--accent)' }}>configuración</Link> y tocá <strong>Activar radar</strong>.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {opps.map(o => {
              const n = NIVEL(o.score || 0)
              return (
                <div key={o.id} className="card" style={{ borderLeft: `4px solid ${n.color}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
                  onClick={() => setSel(o)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.05rem', color: n.color }}>{n.icon} {o.score}/100</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 8px' }}>
                      {ESTADO_LABEL[o.estado] || o.estado}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.35 }}>{o.titulo.slice(0, 90)}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {o.ubicacion && <span>📍 {o.ubicacion}</span>}
                    {o.producto_nombre && <span>🎯 {o.producto_nombre}</span>}
                    {o.tipo_comprador && <span>🏢 {o.tipo_comprador}</span>}
                    {o.urgencia === 'alta' && <span style={{ color: '#f97316' }}>⚡ Urgente</span>}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Detectado {hace(o.created_at)}</div>
                </div>
              )
            })}
          </div>
        )}

      {sel && <DetalleOportunidad o={sel} onClose={() => setSel(null)} onUpdate={actualizar} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function DetalleOportunidad({ o, onClose, onUpdate }: {
  o: Opp; onClose: () => void; onUpdate: (id: string, p: { estado?: string; feedback?: string }) => void
}) {
  const [mensaje, setMensaje] = useState('')
  const [generando, setGenerando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const n = NIVEL(o.score || 0)

  async function generar() {
    setGenerando(true)
    try {
      const r = await fetch('/api/demanda/mensaje', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id }),
      })
      const d = await r.json()
      setMensaje(d.mensaje || d.error || '')
    } finally { setGenerando(false) }
  }

  const dato = (l: string, v: string | null) => (
    <div style={{ fontSize: '0.82rem' }}>
      <span style={{ color: 'var(--muted)' }}>{l}: </span>
      <strong>{v || <span style={{ color: 'var(--muted)', fontWeight: 400 }}>No identificado</span>}</strong>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 900, color: n.color }}>{n.icon} {o.score}/100 · {n.label}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{o.titulo}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {dato('Producto', o.producto_nombre)}
          {dato('Cliente', o.tipo_comprador)}
          {dato('Ubicación', o.ubicacion)}
          {dato('Cantidad', o.cantidad ? `${o.cantidad}${o.unidad ? ' ' + o.unidad : ''}` : null)}
          {dato('Intención', o.intencion)}
          {dato('Urgencia', o.urgencia)}
          {dato('Presupuesto', o.presupuesto)}
          {dato('Coincidencia', o.match_pct != null ? `${o.match_pct}%` : null)}
        </div>

        {o.explicacion && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>¿Por qué es una oportunidad?</div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>{o.explicacion}</div>
          </div>
        )}

        {Array.isArray(o.score_detalle) && o.score_detalle.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {o.score_detalle.filter(d => d.puntos !== 0).map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{d.label}</span>
                <span style={{ fontWeight: 700, color: d.puntos > 0 ? '#22c55e' : '#ef4444' }}>{d.puntos > 0 ? '+' : ''}{d.puntos}</span>
              </div>
            ))}
          </div>
        )}

        {o.fragmento && (
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Texto detectado</div>
            <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--muted)', lineHeight: 1.5 }}>“{o.fragmento.slice(0, 300)}”</div>
            {o.url && <a href={o.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Ver fuente original ↗</a>}
          </div>
        )}

        {o.accion && (
          <div style={{ fontSize: '0.82rem', background: '#22c55e12', border: '1px solid #22c55e44', borderRadius: 8, padding: '8px 12px', color: '#22c55e', fontWeight: 600 }}>
            ✅ {o.accion}
          </div>
        )}

        {/* Mensaje sugerido */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {!mensaje ? (
            <button onClick={generar} disabled={generando} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}>
              {generando ? '⏳ Escribiendo…' : '✍️ Generar contacto'}
            </button>
          ) : (
            <>
              <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={4}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box', lineHeight: 1.5 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => { navigator.clipboard.writeText(mensaje); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
                  className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8rem' }}>{copiado ? '✓ Copiado' : '📋 Copiar'}</button>
                <button onClick={generar} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>↻</button>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 4 }}>Revisalo antes de enviarlo. El sistema nunca envía solo.</div>
            </>
          )}
        </div>

        {/* Estado y feedback */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 5 }}>Estado</div>
            <select value={o.estado} onChange={e => onUpdate(o.id, { estado: e.target.value })}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: '0.85rem' }}>
              {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 5 }}>
              ¿Sirvió? — la IA aprende de esto
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { k: 'relevante', l: '👍 Relevante', c: '#22c55e' },
                { k: 'no_relevante', l: '👎 No relevante', c: '#ef4444' },
                { k: 'venta', l: '✅ Venta', c: '#22c55e' },
                { k: 'no_sirve', l: '❌ No sirve', c: '#ef4444' },
              ].map(f => (
                <button key={f.k} onClick={() => onUpdate(o.id, { feedback: f.k })}
                  style={{
                    flex: 1, minWidth: 110, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    border: `1px solid ${o.feedback === f.k ? f.c : 'var(--border)'}`,
                    background: o.feedback === f.k ? f.c + '22' : 'transparent',
                    color: o.feedback === f.k ? f.c : 'var(--muted)',
                  }}>{f.l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
