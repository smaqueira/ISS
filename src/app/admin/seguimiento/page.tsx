'use client'
import { useState, useEffect } from 'react'

interface Prospecto {
  id: string
  name: string
  phone: string
  type: string
  status: string
  rubro: string | null
  city: string | null
  notes: string | null
  score: number
  diasSinContacto: number
  prioridad: 'urgente' | 'alta' | 'media'
  accion: string
  vencido: boolean
}

const PRIORIDAD_META = {
  urgente: { label: 'Urgente',  color: '#ef4444', bg: '#ef444415', icon: '🔴' },
  alta:    { label: 'Alta',     color: '#f97316', bg: '#f9731615', icon: '🟡' },
  media:   { label: 'Media',    color: '#64748b', bg: '#64748b15', icon: '⚪' },
}

const ACCION_META: Record<string, { label: string; tip: string }> = {
  'primer contacto': { label: 'Primer contacto', tip: 'Todavía no lo contactaste — es el momento' },
  'seguimiento':     { label: 'Seguimiento',      tip: 'Ya lo contactaste pero no respondió' },
  'cerrar':          { label: 'Cerrar venta',     tip: 'Mostró interés — seguí mientras está caliente' },
}

export default function SeguimientoPage() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Prospecto | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [generando, setGenerando] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/followup')
    const data = await res.json()
    setProspectos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function generarMensaje(p: Prospecto) {
    setGenerando(true)
    setMensaje('')
    const res = await fetch(`/api/followup?mensaje=1&id=${p.id}`)
    const data = await res.json()
    setMensaje(data.mensaje || '')
    setGenerando(false)
  }

  function openWhatsApp(p: Prospecto) {
    const phone = p.phone.replace(/\D/g, '')
    const text = mensaje || ''
    window.open(`https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`, '_blank')
  }

  function copy() {
    navigator.clipboard.writeText(mensaje)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const urgentes = prospectos.filter(p => p.prioridad === 'urgente')
  const altos    = prospectos.filter(p => p.prioridad === 'alta')
  const medios   = prospectos.filter(p => p.prioridad === 'media')

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🔔 Seguimiento</h1>
        <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
          Prospectos que necesitan atención hoy
        </p>
      </div>

      {/* Stats */}
      {!loading && prospectos.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Urgentes',  value: urgentes.length, color: '#ef4444' },
            { label: 'Seguimiento', value: altos.length,  color: '#f97316' },
            { label: 'Primer contacto', value: medios.length, color: '#64748b' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', borderRadius: 10, padding: '12px 20px',
              borderTop: `3px solid ${s.color}`, flex: 1, textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 60 }}>Cargando...</div>
      )}

      {!loading && prospectos.length === 0 && (
        <div style={{
          background: 'var(--surface)', borderRadius: 12, padding: 60,
          textAlign: 'center', color: 'var(--muted)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>✅</div>
          <div style={{ fontWeight: 600 }}>Todo al día</div>
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>No hay prospectos que necesiten seguimiento ahora</div>
        </div>
      )}

      {/* Lista de prospectos */}
      {!loading && prospectos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {prospectos.map(p => {
            const prio = PRIORIDAD_META[p.prioridad]
            const accion = ACCION_META[p.accion]
            return (
              <div
                key={p.id}
                onClick={() => { setSelected(p); setMensaje('') }}
                style={{
                  background: 'var(--surface)', borderRadius: 12, padding: '14px 18px',
                  cursor: 'pointer', borderLeft: `4px solid ${prio.color}`,
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center',
                  transition: 'opacity 0.15s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{p.name}</span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: prio.bg, color: prio.color,
                    }}>
                      {prio.icon} {prio.label}
                    </span>
                    {p.vencido && (
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
                        background: '#ef444420', color: '#ef4444',
                      }}>
                        Muy vencido
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: 12 }}>
                    {p.rubro && <span>🍽️ {p.rubro}</span>}
                    {p.city && <span>📍 {p.city}</span>}
                    <span>📱 {p.phone}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                    {accion.tip} · <strong style={{ color: prio.color }}>{p.diasSinContacto} días sin contacto</strong>
                  </div>
                </div>

                <button
                  onClick={e => { e.stopPropagation(); setSelected(p); generarMensaje(p) }}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: '#25D36620', color: '#25D366', fontWeight: 600, fontSize: '0.82rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  💬 Contactar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Panel lateral */}
      {selected && (
        <div
          style={{
            position: 'fixed', inset: 0, background: '#00000070',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1000,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', width: 420, height: '100vh',
              overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
            }}
          >
            {/* Header del panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selected.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                  {selected.rubro} {selected.city ? `· ${selected.city}` : ''}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}
              >✕</button>
            </div>

            {/* Info */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: PRIORIDAD_META[selected.prioridad].icon + ' ' + PRIORIDAD_META[selected.prioridad].label, color: PRIORIDAD_META[selected.prioridad].color },
                { label: selected.type.toUpperCase(), color: selected.type === 'b2b' ? '#3b82f6' : '#22c55e' },
                { label: `${selected.diasSinContacto} días sin contacto`, color: '#f97316' },
              ].map(b => (
                <span key={b.label} style={{
                  fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20,
                  background: `${b.color}20`, color: b.color, fontWeight: 600,
                }}>
                  {b.label}
                </span>
              ))}
            </div>

            {selected.notes && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: '0.83rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                📝 {selected.notes}
              </div>
            )}

            {/* Generador de mensaje */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }}>
                💬 Mensaje de {ACCION_META[selected.accion]?.label || 'seguimiento'}
              </div>

              <button
                onClick={() => generarMensaje(selected)}
                disabled={generando}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: generando ? 'var(--border)' : 'var(--accent)',
                  color: 'white', fontWeight: 600, marginBottom: 12,
                }}
              >
                {generando ? '✨ Generando...' : '✨ Generar mensaje con IA'}
              </button>

              {mensaje && (
                <>
                  <textarea
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                    rows={7}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: '0.85rem', resize: 'vertical',
                      fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={copy}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
                        cursor: 'pointer', background: 'var(--bg)',
                        color: copied ? '#22c55e' : 'var(--text)', fontSize: '0.85rem', fontWeight: 600,
                      }}
                    >
                      {copied ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                    <button
                      onClick={() => openWhatsApp(selected)}
                      style={{
                        flex: 2, padding: '9px', borderRadius: 8, border: 'none',
                        cursor: 'pointer', background: '#25D366',
                        color: 'white', fontSize: '0.85rem', fontWeight: 700,
                      }}
                    >
                      💬 Abrir en WhatsApp
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
