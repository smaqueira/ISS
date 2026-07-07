'use client'
import { useState, useEffect } from 'react'

interface Metrics {
  totalClients: number
  nuevos: number
  contactados: number
  cerrados: number
  frios: number
  b2b: number
  b2c: number
  clientsThisWeek: number
  conversionRate: number
  contactRate: number
  channelCounts: Record<string, number>
  avgDailyActivity: number
  ordersByStatus: Record<string, number>
  configured: { hasGmail: boolean; hasWhatsApp: boolean; hasCustomerBot: boolean; hasGroq: boolean; hasResend: boolean }
}

interface AnalysisData {
  ok: boolean
  metrics: Metrics
  analysis: string
  ts: string
}

const CANAL_ICON: Record<string, string> = {
  whatsapp: '💬', email: '📧', telegram: '✈️', instagram: '📸', web: '🌐', sistema: '⚙️',
}

export default function MejorasPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    setData(null)
    try {
      const res = await fetch('/api/agent/mejoras')
      const json = await res.json()
      setData(json)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { run() }, [])

  const m = data?.metrics

  return (
    <div style={{ maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>🔮 Agente de Mejoras</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            Conoce el negocio de Vitto Mare y analiza el sistema en tiempo real para proponer acciones concretas.
          </p>
        </div>
        <button onClick={run} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {loading ? '⏳ Analizando...' : '🔄 Nuevo análisis'}
        </button>
      </div>

      {m && (
        <>
          {/* KPIs principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total clientes', value: m.totalClients, color: 'var(--accent)', sub: `${m.b2b} B2B · ${m.b2c} B2C` },
              { label: 'Nuevos esta semana', value: m.clientsThisWeek, color: '#8b5cf6', sub: 'últimos 7 días' },
              { label: 'Sin contactar', value: m.nuevos, color: '#f59e0b', sub: 'oportunidad inmediata' },
              { label: 'Contactados', value: m.contactados, color: '#22c55e', sub: `${m.contactRate}% del total` },
              { label: 'Cerrados', value: m.cerrados, color: '#3b82f6', sub: `${m.conversionRate}% conversión` },
              { label: 'Fríos (+30 días)', value: m.frios, color: '#94a3b8', sub: 'a reactivar' },
              { label: 'Actividad diaria', value: m.avgDailyActivity, color: '#ec4899', sub: 'interacc. promedio' },
              { label: 'Pedidos', value: Object.values(m.ordersByStatus).reduce((a, b) => a + b, 0), color: '#14b8a6', sub: '30 días' },
            ].map(stat => (
              <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value ?? 0}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{stat.label}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: 2 }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Canales + Configuración */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="card">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 10 }}>
                Canales activos (30 días)
              </div>
              {Object.keys(m.channelCounts).length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Sin actividad registrada</div>
              )}
              {Object.entries(m.channelCounts).sort((a, b) => b[1] - a[1]).map(([ch, count]) => {
                const max = Math.max(...Object.values(m.channelCounts))
                return (
                  <div key={ch} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                      <span>{CANAL_ICON[ch] || '📡'} {ch}</span>
                      <span style={{ fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: 4, background: 'var(--accent)', borderRadius: 2, width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 10 }}>
                Estado de integraciónes
              </div>
              {[
                { label: 'Gmail (captura emails)', ok: m.configured.hasGmail },
                { label: 'Bot cliente vittomare_bot', ok: m.configured.hasCustomerBot },
                { label: 'IA Groq', ok: m.configured.hasGroq },
                { label: 'Resend (email outbound)', ok: m.configured.hasResend },
                { label: 'WhatsApp Business API', ok: m.configured.hasWhatsApp },
                { label: 'Instagram DMs', ok: false },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: '0.8rem' }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: c.ok ? '#22c55e' : '#ef4444',
                    boxShadow: c.ok ? '0 0 5px #22c55e' : 'none',
                  }} />
                  <span style={{ color: c.ok ? 'var(--text)' : 'var(--muted)' }}>{c.label}</span>
                  {!c.ok && <span style={{ fontSize: '0.65rem', color: '#ef4444', marginLeft: 'auto' }}>pendiente</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Análisis IA */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 52, color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>🔮</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--text)' }}>Analizando Vitto Mare...</div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.7 }}>
            Revisando clientes, canales, conversión y configuración<br />
            para proponer las acciones más impactantes
          </div>
        </div>
      )}

      {!loading && data?.analysis && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>📋 Recomendaciones para Vitto Mare</div>
            {data.ts && (
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                Análisis del {new Date(data.ts).toLocaleDateString('es-AR')} a las {new Date(data.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.9, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {data.analysis}
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
          <div>No se pudo obtener el análisis. Intentá de nuevo.</div>
        </div>
      )}
    </div>
  )
}
