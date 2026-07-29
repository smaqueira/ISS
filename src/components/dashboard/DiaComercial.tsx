'use client'
import { useEffect, useState, useCallback } from 'react'

interface Obj { id: string; label: string; modulo: string; tipo: 'auto' | 'manual'; target: number; actual: number; done: boolean; frac: number }
interface Data { fecha: string; objetivos: Obj[]; pendientes: Obj[]; score: number; cerrable: boolean; scoreModulos: { nombre: string; score: number }[] }

function horaAR(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(11, 16)
}

export default function DiaComercial() {
  const [data, setData] = useState<Data | null>(null)
  const [hora, setHora] = useState(horaAR())
  const [plan, setPlan] = useState<string>('')
  const [generando, setGenerando] = useState(false)
  const [mayoristas, setMayoristas] = useState<{ key: string; label: string; contactados: number; ok: boolean }[]>([])

  async function generarPlan() {
    setGenerando(true)
    try {
      const r = await fetch('/api/dia/plan')
      const d = await r.json()
      setPlan(d.plan || ('⚠️ ' + (d.error || 'No se pudo generar')))
    } catch { setPlan('⚠️ No se pudo generar el plan.') }
    finally { setGenerando(false) }
  }

  const cargar = useCallback(() => {
    fetch('/api/dia').then(r => r.json()).then(setData).catch(() => {})
    fetch('/api/dia/mayoristas').then(r => r.json()).then(d => setMayoristas(d.rubros || [])).catch(() => {})
  }, [])
  useEffect(() => {
    cargar()
    const t = setInterval(() => { setHora(horaAR()); cargar() }, 60000)
    return () => clearInterval(t)
  }, [cargar])

  async function toggle(id: string) {
    setData(prev => prev ? { ...prev, objetivos: prev.objetivos.map(o => o.id === id ? { ...o, done: !o.done, actual: o.done ? 0 : 1, frac: o.done ? 0 : 1 } : o) } : prev)
    await fetch('/api/dia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ check: id }) })
    cargar()
  }

  if (!data) return <div style={{ color: 'var(--muted)', padding: 20 }}>⏳ Cargando el día…</div>

  const color = data.score >= 90 ? '#22c55e' : data.score >= 60 ? '#f59e0b' : '#ef4444'
  const modulos = [...new Set(data.objetivos.map(o => o.modulo))]

  return (
    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Encabezado tono directo */}
      <div style={{ border: `2px solid ${color}`, borderRadius: 12, padding: '16px 18px', background: `${color}0f` }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: 1 }}>SON LAS {hora} HS</div>
        {data.cerrable ? (
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e', marginTop: 4 }}>✅ DÍA COMERCIAL COMPLETADO ({data.score}%)</div>
        ) : (
          <>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444', marginTop: 4 }}>NO SE PUEDE CERRAR EL DÍA COMERCIAL</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginTop: 10, marginBottom: 4 }}>TAREAS SIN CUMPLIR:</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {data.pendientes.map(o => (
                <li key={o.id} style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                  NO {o.label.replace(/^\d+ /, '').toLowerCase()}{o.tipo === 'auto' ? ` (${o.actual}/${o.target})` : ''}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Score */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.6rem', fontWeight: 900, color, lineHeight: 1 }}>{data.score}%</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: 1 }}>SCORE DEL DÍA · objetivo 90%</div>
        </div>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.scoreModulos.map(m => (
            <div key={m.nombre} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', width: 90, color: 'var(--muted)', textTransform: 'uppercase' }}>{m.nombre}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${m.score}%`, height: '100%', background: m.score >= 90 ? '#22c55e' : m.score >= 60 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <span style={{ fontSize: '0.72rem', width: 34, textAlign: 'right', fontWeight: 700 }}>{m.score}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Módulo Mayoristas: ¿contactaste hoy cada rubro? */}
      {mayoristas.length > 0 && (
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Mayoristas — ¿contactaste hoy?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mayoristas.map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: m.ok ? '#22c55e' : '#ef4444', width: 42 }}>{m.ok ? 'SÍ' : 'NO'}</span>
                <a href={`/admin/clients?rubro=${encodeURIComponent(m.label)}`} style={{ flex: 1, color: 'var(--text)', textDecoration: 'none' }}>{m.label}</a>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{m.contactados} contactados</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan del día con IA */}
      <div style={{ border: '1px solid var(--accent)55', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>🧠 Plan del día (IA)</span>
          <button onClick={generarPlan} disabled={generando} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            {generando ? 'Pensando…' : plan ? '↻ Regenerar' : 'Generar plan'}
          </button>
        </div>
        {plan && (
          <div style={{ marginTop: 10, fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{plan}</div>
        )}
        {!plan && <div style={{ marginTop: 6, fontSize: '0.76rem', color: 'var(--muted)' }}>Te arma el plan de hoy priorizado por facturación, según tu estado, stock y clientes a reactivar.</div>}
      </div>

      {/* Objetivos por módulo */}
      {modulos.map(mod => (
        <div key={mod} className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{mod}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.objetivos.filter(o => o.modulo === mod).map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                {o.tipo === 'manual' ? (
                  <input type="checkbox" checked={o.done} onChange={() => toggle(o.id)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                ) : (
                  <span style={{ fontSize: '1rem' }}>{o.done ? '✅' : '⬜'}</span>
                )}
                <span style={{ flex: 1, color: o.done ? 'var(--muted)' : 'var(--text)', textDecoration: o.done ? 'line-through' : 'none' }}>{o.label}</span>
                {o.tipo === 'auto' && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: o.done ? '#22c55e' : '#ef4444' }}>{o.actual}/{o.target}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Regla de oro */}
      <div style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <strong style={{ color: '#C9A96E' }}>REGLA DE ORO:</strong> Vitto Mare no es una pescadería, es una empresa gastronómica premium.
        Toda tarea que no ayude a <strong>facturar</strong>, <strong>conseguir clientes</strong> o <strong>fortalecer la marca</strong> se descarta.
        El objetivo no son los likes: es <strong>facturar</strong> y construir <strong>clientes recurrentes</strong>. Mañana a las 00:00 todo vuelve a 0.
      </div>
    </div>
  )
}
