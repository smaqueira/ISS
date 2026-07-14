'use client'
import { useState } from 'react'

interface CronResult {
  ok?: boolean
  error?: string
  [key: string]: unknown
}

const CRONS = [
  {
    label: 'Prospección B2B',
    icon: '🎯',
    path: '/api/cron/prospecting',
    desc: 'Busca restaurantes, sushi bars y hoteles en Buenos Aires con teléfono o web',
    color: '#f59e0b',
  },
  {
    label: 'Grupos WhatsApp (gruposwsp)',
    icon: '💬',
    path: '/api/cron/gruposwsp-crawl',
    desc: 'Rastrea directorio gruposwsp.com buscando grupos de Argentina por ventas, gastronomía y negocios',
    color: '#25d366',
  },
  {
    label: 'Seguimiento clientes',
    icon: '🔔',
    path: '/api/cron/followup',
    desc: 'Detecta clientes sin contacto y envía recordatorio al admin',
    color: '#3b82f6',
  },
  {
    label: 'Tareas de la mañana',
    icon: '🌅',
    path: '/api/cron/manana',
    desc: 'Resumen matutino de leads, tareas y oportunidades del día',
    color: '#f97316',
  },
  {
    label: 'Tareas de ventas',
    icon: '💰',
    path: '/api/cron/ventas',
    desc: 'Propuestas de acción de ventas para el mediodía',
    color: '#22c55e',
  },
  {
    label: 'Tareas de la tarde',
    icon: '🌇',
    path: '/api/cron/tarde',
    desc: 'Cierre del día, pendientes y preparación para mañana',
    color: '#8b5cf6',
  },
  {
    label: 'Fidelización',
    icon: '⭐',
    path: '/api/cron/fidelizacion',
    desc: 'Recalcula scores, etiqueta VIP/frecuente y marca clientes fríos',
    color: '#ec4899',
  },
  {
    label: 'Webhooks bots',
    icon: '🤖',
    path: '/api/cron/setup-webhooks',
    desc: 'Re-registra los webhooks de Telegram para ventas_vitto_bot y vittomare_bot',
    color: '#14b8a6',
  },
  {
    label: 'Comunidades',
    icon: '🌐',
    path: '/api/cron/community-crawl',
    desc: 'Crawlea directorios de comunidades de Argentina y verifica links',
    color: '#94a3b8',
  },
]

export default function SistemaPage() {
  const [results, setResults] = useState<Record<string, CronResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function runCron(path: string, label: string) {
    setLoading(l => ({ ...l, [path]: true }))
    setResults(r => ({ ...r, [path]: null }))
    try {
      const res = await fetch(path)
      const json = await res.json()
      setResults(r => ({ ...r, [path]: json }))
    } catch (err) {
      setResults(r => ({ ...r, [path]: { ok: false, error: String(err) } }))
    }
    setLoading(l => ({ ...l, [path]: false }))
  }

  async function runAll() {
    for (const cron of CRONS) {
      runCron(cron.path, cron.label)
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>⚙️ Panel del Sistema</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            Todas las tareas automáticas — corren solas según el horario, o podés ejecutarlas manualmente.
          </p>
        </div>
        <button onClick={runAll} className="btn btn-primary">
          ▶ Correr todas
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CRONS.map(cron => {
          const res = results[cron.path]
          const isLoading = loading[cron.path]

          return (
            <div key={cron.path} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: `${cron.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem',
              }}>
                {cron.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{cron.label}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
                    {cron.path}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: res ? 8 : 0 }}>
                  {cron.desc}
                </div>

                {res && (
                  <div style={{
                    fontSize: '0.75rem', fontFamily: 'monospace', padding: '8px 10px', borderRadius: 6, marginTop: 6,
                    background: res.ok === false ? '#ef444415' : '#22c55e15',
                    border: `1px solid ${res.ok === false ? '#ef444430' : '#22c55e30'}`,
                    color: res.ok === false ? '#ef4444' : '#22c55e',
                    lineHeight: 1.7,
                  }}>
                    {res.ok === false
                      ? `❌ Error: ${res.error}`
                      : Object.entries(res)
                          .filter(([k]) => k !== 'ok')
                          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                          .join('  ·  ') || '✅ OK'
                    }
                  </div>
                )}
              </div>

              <button
                onClick={() => runCron(cron.path, cron.label)}
                disabled={isLoading}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 8,
                  border: `1px solid ${cron.color}50`, background: `${cron.color}15`,
                  color: cron.color, cursor: isLoading ? 'default' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 600, opacity: isLoading ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {isLoading ? '⏳ Corriendo...' : '▶ Correr'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
