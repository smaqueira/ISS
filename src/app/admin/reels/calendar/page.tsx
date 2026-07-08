'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Reel } from '@/lib/reels/types'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADO_COLOR: Record<string, string> = {
  borrador: '#94a3b8', generando: '#f59e0b', listo: '#22c55e', publicado: '#3b82f6', error: '#ef4444',
}

export default function ReelsCalendarPage() {
  const [reels, setReels] = useState<Reel[]>([])
  const [today] = useState(new Date())
  const [current, setCurrent] = useState(new Date())
  const [view, setView] = useState<'mes' | 'semana'>('mes')

  const load = useCallback(async () => {
    const res = await fetch('/api/reels')
    if (res.ok) setReels(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  // Reels con fecha (programado_at o publicado_at)
  const reelsByDate: Record<string, Reel[]> = {}
  for (const r of reels) {
    const date = r.programado_at || r.publicado_at
    if (date) {
      const key = date.split('T')[0]
      reelsByDate[key] = [...(reelsByDate[key] || []), r]
    }
  }

  function monthDays() {
    const year = current.getFullYear()
    const month = current.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  function weekDays() {
    const start = new Date(current)
    start.setDate(current.getDate() - current.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  function dateKey(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const cells = monthDays()
  const weekd = weekDays()

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>📅 Calendario de Reels</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Visualizá y organizá publicaciones programadas.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['mes', 'semana'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: view === v ? 'var(--accent)' : 'transparent',
              color: view === v ? '#fff' : 'var(--muted)',
              cursor: 'pointer', fontSize: '0.82rem',
            }}>{v}</button>
          ))}
          <Link href="/admin/reels" style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.82rem' }}>
            ← Biblioteca
          </Link>
        </div>
      </div>

      {/* Nav mes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <button onClick={() => { const d = new Date(current); d.setMonth(d.getMonth() - 1); setCurrent(d) }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--muted)' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{MESES[current.getMonth()]} {current.getFullYear()}</span>
        <button onClick={() => { const d = new Date(current); d.setMonth(d.getMonth() + 1); setCurrent(d) }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--muted)' }}>›</button>
        <button onClick={() => setCurrent(new Date(today))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.78rem' }}>Hoy</button>
      </div>

      {view === 'mes' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DIAS.map(d => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Celdas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ minHeight: 90, borderRight: i % 7 !== 6 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }} />

              const key = dateKey(current.getFullYear(), current.getMonth(), day)
              const dayReels = reelsByDate[key] || []
              const isToday = key === dateKey(today.getFullYear(), today.getMonth(), today.getDate())

              return (
                <div key={i} style={{
                  minHeight: 90, padding: 6,
                  borderRight: i % 7 !== 6 ? '1px solid var(--border)' : 'none',
                  borderBottom: '1px solid var(--border)',
                  background: isToday ? 'var(--accent)08' : 'transparent',
                }}>
                  <div style={{
                    fontSize: '0.78rem', fontWeight: isToday ? 800 : 400,
                    color: isToday ? 'var(--accent)' : 'var(--muted)',
                    marginBottom: 4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: isToday ? 'var(--accent)20' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {day}
                  </div>
                  {dayReels.map(r => (
                    <Link key={r.id} href={`/admin/reels/${r.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{
                        fontSize: '0.65rem', padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                        background: `${ESTADO_COLOR[r.estado]}20`, color: ESTADO_COLOR[r.estado],
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.titulo}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'semana' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {weekd.map(d => {
              const isToday = d.toDateString() === today.toDateString()
              return (
                <div key={d.toISOString()} style={{ padding: 10, textAlign: 'center', borderRight: '1px solid var(--border)', background: isToday ? 'var(--accent)08' : 'transparent' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{DIAS[d.getDay()]}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: isToday ? 800 : 400, color: isToday ? 'var(--accent)' : 'var(--text)' }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 300 }}>
            {weekd.map(d => {
              const key = d.toISOString().split('T')[0]
              const dayReels = reelsByDate[key] || []
              return (
                <div key={key} style={{ padding: 8, borderRight: '1px solid var(--border)', minHeight: 300 }}>
                  {dayReels.map(r => (
                    <Link key={r.id} href={`/admin/reels/${r.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{
                        fontSize: '0.72rem', padding: '5px 7px', borderRadius: 6, marginBottom: 5,
                        background: `${ESTADO_COLOR[r.estado]}20`, color: ESTADO_COLOR[r.estado], borderLeft: `2px solid ${ESTADO_COLOR[r.estado]}`,
                      }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titulo}</div>
                        <div style={{ opacity: 0.7 }}>{r.plataforma}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reels sin fecha */}
      {reels.filter(r => !r.programado_at && !r.publicado_at && r.estado === 'listo').length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>Listos sin programar</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {reels.filter(r => !r.programado_at && !r.publicado_at && r.estado === 'listo').map(r => (
              <Link key={r.id} href={`/admin/reels/${r.id}`} style={{
                textDecoration: 'none', fontSize: '0.78rem', padding: '5px 10px', borderRadius: 8,
                background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e30',
              }}>
                {r.titulo}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
