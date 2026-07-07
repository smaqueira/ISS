'use client'
import { useState, useEffect } from 'react'

interface Metrics {
  totalClients: number
  nuevos: number
  contactados: number
  cerrados: number
  frios: number
  channelCounts: Record<string, number>
  recentActivity: number
  ordersByStatus: Record<string, number>
  configured: { hasGmail: boolean; hasWhatsApp: boolean; hasCustomerBot: boolean; hasGroq: boolean }
}

interface AnalysisData {
  ok: boolean
  metrics: Metrics
  analysis: string
  ts: string
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
    } catch {
      // ignore
    }
    setLoading(false)
  }

  useEffect(() => { run() }, [])

  const m = data?.metrics

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>🤖 Agente de Mejoras</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            Analiza el estado real del sistema y propone mejoras priorizadas por impacto.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
        >
          {loading ? '⏳ Analizando...' : '🔄 Actualizar análisis'}
        </button>
      </div>

      {/* Métricas actuales */}
      {m && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total clientes', value: m.totalClients, color: 'var(--accent)' },
            { label: 'Sin contactar', value: m.nuevos, color: '#f59e0b' },
            { label: 'Contactados', value: m.contactados, color: '#22c55e' },
            { label: 'Cerrados', value: m.cerrados, color: '#3b82f6' },
            { label: 'Fríos', value: m.frios, color: '#94a3b8' },
            { label: 'Actividad 48hs', value: m.recentActivity, color: '#8b5cf6' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color }}>{stat.value ?? 0}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Estado de configuración */}
      {m && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Gmail', ok: m.configured.hasGmail },
            { label: 'WhatsApp API', ok: m.configured.hasWhatsApp },
            { label: 'Bot cliente', ok: m.configured.hasCustomerBot },
            { label: 'IA (Groq)', ok: m.configured.hasGroq },
          ].map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.ok ? '#22c55e' : '#ef4444', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: c.ok ? 'var(--text)' : 'var(--muted)' }}>{c.label}</span>
            </div>
          ))}
          {m.channelCounts && Object.entries(m.channelCounts).map(([ch, count]) => (
            <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', marginLeft: 'auto' }}>
              <span style={{ color: 'var(--muted)' }}>{ch}:</span>
              <span style={{ fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Análisis IA */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🤖</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Analizando el sistema...</div>
          <div style={{ fontSize: '0.82rem' }}>Revisando clientes, canales, configuración y actividad reciente</div>
        </div>
      )}

      {!loading && data?.analysis && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>📋 Análisis y recomendaciones</div>
            {data.ts && (
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                {new Date(data.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
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
