'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { RealJob } from '@/lib/reels/types'

const ESTADO_COLOR: Record<string, string> = {
  esperando: '#94a3b8', procesando: '#f59e0b', finalizado: '#22c55e', error: '#ef4444',
}

const TIPO_ICON: Record<string, string> = {
  script: '📝', video: '🎬', thumbnail: '🖼️', publicacion: '📤',
}

export default function ReelsQueuePage() {
  const [jobs, setJobs] = useState<RealJob[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/reels/jobs')
    if (res.ok) setJobs(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000) // refrescar cada 5s para ver progreso
    return () => clearInterval(iv)
  }, [load])

  const processing = jobs.filter(j => j.estado === 'procesando')
  const waiting = jobs.filter(j => j.estado === 'esperando')
  const done = jobs.filter(j => j.estado === 'finalizado')
  const errors = jobs.filter(j => j.estado === 'error')

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>⏳ Cola de Procesamiento</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Jobs de generación IA, renders y publicaciones. Se actualiza cada 5 segundos.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.82rem' }}>
            🔄 Refrescar
          </button>
          <Link href="/admin/reels" style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.82rem' }}>
            ← Biblioteca
          </Link>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Procesando', value: processing.length, color: '#f59e0b' },
          { label: 'En espera', value: waiting.length, color: '#94a3b8' },
          { label: 'Completados', value: done.length, color: '#22c55e' },
          { label: 'Errores', value: errors.length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '10px 8px' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Cargando cola...</div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700 }}>Cola vacía</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>No hay jobs pendientes ni en proceso.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jobs.map(job => (
            <div key={job.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{TIPO_ICON[job.tipo] || '⚙️'}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{job.tipo}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>·</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{job.proveedor}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                  reel: {job.reel_id.slice(0, 8)}...
                </div>
                {job.error && (
                  <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>⚠️ {job.error}</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                  background: `${ESTADO_COLOR[job.estado]}20`, color: ESTADO_COLOR[job.estado],
                }}>
                  {job.estado === 'procesando' ? '⏳ ' : ''}{job.estado}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                  {new Date(job.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
