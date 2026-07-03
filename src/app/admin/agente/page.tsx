'use client'
import { useState, useEffect } from 'react'

interface AgentLog {
  id: string
  turno: string
  accion: string
  detalle: string
  cantidad: number
  created_at: string
}

const TURNO_COLOR: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  mañana:  { bg: '#f9731615', color: '#f97316', label: 'Mañana',  icon: '🌅' },
  mediodia: { bg: '#eab30815', color: '#eab308', label: 'Mediodía', icon: '☀️' },
  tarde:   { bg: '#a855f715', color: '#a855f7', label: 'Tarde',   icon: '🌆' },
}

export default function AgentePage() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/agent/logs')
    setLogs(await res.json())
    setLoading(false)
  }

  const [lastResult, setLastResult] = useState<string | null>(null)

  async function runNow(turno: string) {
    setRunning(turno)
    setLastResult(null)
    try {
      const res = await fetch(`/api/agent/run?turno=${turno}`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setLastResult(`❌ Error: ${data.error}`)
      } else {
        const acciones = data.actions || []
        setLastResult(acciones.length > 0
          ? `✅ Completado:\n${acciones.join('\n')}`
          : '⚠️ Ejecutado pero sin acciones — revisá que las claves Serper y Groq estén configuradas en Configuración')
      }
    } catch (e) {
      setLastResult(`❌ Error de conexión: ${e}`)
    }
    await load()
    setRunning(null)
  }

  // Agrupar logs por fecha
  const byDate: Record<string, AgentLog[]> = {}
  for (const log of logs) {
    const date = new Date(log.created_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(log)
  }

  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString())
  const totalImportadosHoy = todayLogs.filter(l => l.accion === 'prospección').reduce((s, l) => s + l.cantidad, 0)
  const emailsHoy = todayLogs.filter(l => l.accion === 'emails').reduce((s, l) => s + l.cantidad, 0)

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Agente autónomo</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Trabaja solo 3 veces por día. Prospección, seguimientos y alertas automáticas.
      </p>

      {/* Estado hoy */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{totalImportadosHoy}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>prospectos importados hoy</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e' }}>{emailsHoy}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>emails enviados hoy</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>{todayLogs.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>acciones realizadas hoy</div>
        </div>
      </div>

      {/* Ejecutar manualmente */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Ejecutar ahora</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 14 }}>
          Normalmente corre automático. Podés ejecutar cualquier turno manualmente para probarlo.
        </p>
        {lastResult && (
          <div style={{ background: lastResult.startsWith('✅') ? '#22c55e15' : '#ef444415', border: `1px solid ${lastResult.startsWith('✅') ? '#22c55e40' : '#ef444440'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: '0.82rem', whiteSpace: 'pre-line', color: lastResult.startsWith('✅') ? '#22c55e' : '#ef4444' }}>
            {lastResult}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { id: 'manana', label: '🌅 Turno mañana', desc: 'Prospección + tareas' },
            { id: 'mediodia', label: '☀️ Turno mediodía', desc: 'Escalado + consejos IA' },
            { id: 'tarde', label: '🌆 Turno tarde', desc: 'Emails + inactivos' },
          ].map(t => (
            <button key={t.id} onClick={() => runNow(t.id)} disabled={!!running} className="btn btn-ghost" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 16px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{running === t.id ? '⏳ Ejecutando...' : t.label}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Horarios */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Horarios automáticos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { hora: '8:00am', turno: 'mañana', icon: '🌅', acciones: ['Busca negocios nuevos en 2 zonas + 2 rubros rotando cada día', 'Importa al CRM los que tienen score ≥ 60 y teléfono o web', 'Genera tareas prioritarias del día', 'Manda briefing por Telegram'] },
            { hora: '12:00pm', turno: 'mediodia', icon: '☀️', acciones: ['Detecta leads sin contactar por más de 2 días → urgente', 'Alerta sobre clientes interesados sin actividad reciente', 'La IA analiza el pipeline y da un consejo accionable'] },
            { hora: '6:00pm', turno: 'tarde', icon: '🌆', acciones: ['Envía emails automáticos de seguimiento (día 3 y día 7)', 'Marca como inactivos los que llevan 14+ días sin respuesta', 'Manda resumen del día por Telegram'] },
          ].map(t => (
            <div key={t.turno} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 70, fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>{t.hora}</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.85rem' }}>{t.icon} Turno {t.turno}</div>
                {t.acciones.map((a, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 3 }}>· {a}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log de actividad */}
      <div>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.95rem' }}>Historial de actividad</div>

        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30 }}>Cargando...</div>}

        {!loading && logs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🤖</div>
            <div>El agente todavía no ejecutó ningún turno.</div>
            <div style={{ fontSize: '0.8rem', marginTop: 6 }}>Ejecutá el turno mañana manualmente para probar.</div>
          </div>
        )}

        {Object.entries(byDate).map(([date, dateLogs]) => (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--muted)', marginBottom: 10 }}>
              {date === today ? '📅 Hoy' : date}
            </div>
            {dateLogs.map(log => {
              const t = TURNO_COLOR[log.turno] || TURNO_COLOR['mañana']
              return (
                <div key={log.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 16px' }}>
                  <div style={{ background: t.bg, color: t.color, borderRadius: 8, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {t.icon} {t.label}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2, textTransform: 'capitalize' }}>{log.accion}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{log.detalle}</div>
                  </div>
                  {log.cantidad > 0 && (
                    <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem', flexShrink: 0 }}>+{log.cantidad}</div>
                  )}
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
                    {new Date(log.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
