'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CalendarItem {
  id: string
  fecha: string
  dia_semana: string
  dia_num: number
  audiencia: string
  canal: string
  tipo: string
  hora: string
  razon: string
  tematica: string
  hook: string
  cta: string
  notas: string | null
  status: 'pendiente' | 'publicado' | 'saltado'
}

const STATUS_META = {
  pendiente:  { label: 'Pendiente', color: '#64748b', bg: '#64748b15' },
  publicado:  { label: 'Publicado', color: '#22c55e', bg: '#22c55e15' },
  saltado:    { label: 'Saltado',   color: '#f97316', bg: '#f9731615' },
}

const AUDIENCIA_COLOR: Record<string, string> = {
  b2b:   '#3b82f6',
  b2c:   '#22c55e',
  todos: '#a855f7',
}

const CANAL_ICON: Record<string, string> = {
  WhatsApp:              '💬',
  Instagram:             '📸',
  'WhatsApp + Instagram': '💬📸',
  Telegram:              '✈️',
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(12, 0, 0, 0)
  return d
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday.getTime() + 6 * 86400000)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('es-AR', opts)} — ${sunday.toLocaleDateString('es-AR', opts)}`
}

export default function CalendarioPage() {
  const router = useRouter()
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [productos, setProductos] = useState('')
  const [selected, setSelected] = useState<CalendarItem | null>(null)
  const [notas, setNotas] = useState('')
  const [savingNotas, setSavingNotas] = useState(false)

  useEffect(() => { loadWeek() }, [currentMonday])

  async function loadWeek() {
    setLoading(true)
    const weekStart = currentMonday.toISOString().split('T')[0]
    const res = await fetch(`/api/marketing/calendar?week=${weekStart}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function generate() {
    setGenerating(true)
    const weekStart = currentMonday.toISOString().split('T')[0]
    const res = await fetch('/api/marketing/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, productos }),
    })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setGenerating(false)
  }

  async function updateStatus(item: CalendarItem, status: CalendarItem['status']) {
    const res = await fetch('/api/marketing/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status }),
    })
    const updated = await res.json()
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    if (selected?.id === updated.id) setSelected(updated)
  }

  async function saveNotas(item: CalendarItem) {
    setSavingNotas(true)
    const res = await fetch('/api/marketing/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, notas }),
    })
    const updated = await res.json()
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelected(updated)
    setSavingNotas(false)
  }

  function goToMarketing(item: CalendarItem) {
    const task = item.audiencia === 'b2b' ? 'copy_whatsapp' : item.canal.includes('Instagram') ? 'copy_instagram_caption' : 'copy_whatsapp'
    router.push(`/admin/marketing?task=${task}&idea=${encodeURIComponent(item.tematica)}`)
  }

  const weekStart = currentMonday.toISOString().split('T')[0]
  const published = items.filter(i => i.status === 'publicado').length
  const pending = items.filter(i => i.status === 'pendiente').length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>📅 Calendario de contenido</h1>
            <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
              Plan semanal generado por IA según audiencia y estacionalidad
            </p>
          </div>

          {/* Navegación de semana */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setCurrentMonday(d => new Date(d.getTime() - 7 * 86400000))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)' }}
            >←</button>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
              {formatWeekLabel(currentMonday)}
            </div>
            <button
              onClick={() => setCurrentMonday(d => new Date(d.getTime() + 7 * 86400000))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)' }}
            >→</button>
          </div>
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 16px', fontSize: '0.82rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>{published}</span>
              <span style={{ color: 'var(--muted)' }}> publicados</span>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 16px', fontSize: '0.82rem' }}>
              <span style={{ color: '#64748b', fontWeight: 700 }}>{pending}</span>
              <span style={{ color: 'var(--muted)' }}> pendientes</span>
            </div>
          </div>
        )}
      </div>

      {/* Generador */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>
          {items.length === 0 ? '✨ Generá el plan de esta semana' : '🔄 Regenerar plan'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={productos}
            onChange={e => setProductos(e.target.value)}
            placeholder="Productos destacados esta semana (opcional) — ej: langostinos, vieiras, merluza"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: '0.88rem',
            }}
          />
          <button
            onClick={generate}
            disabled={generating}
            style={{
              padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: generating ? 'var(--border)' : 'var(--accent)',
              color: 'white', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap',
            }}
          >
            {generating ? '⏳ Generando...' : '✨ Generar semana'}
          </button>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 8 }}>
          La IA considera: día de la semana, estación del año, audiencia óptima por día y canal recomendado
        </div>
      </div>

      {/* Calendario */}
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Cargando...</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{
          background: 'var(--surface)', borderRadius: 12, padding: 60,
          textAlign: 'center', color: 'var(--muted)',
          border: '2px dashed var(--border)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: '0.95rem', marginBottom: 4 }}>No hay plan para esta semana</div>
          <div style={{ fontSize: '0.8rem' }}>Hacé click en "Generar semana" para que la IA arme el calendario</div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => {
            const statusMeta = STATUS_META[item.status]
            const isToday = item.fecha === new Date().toISOString().split('T')[0]
            const audColor = AUDIENCIA_COLOR[item.audiencia] || '#64748b'

            return (
              <div
                key={item.id}
                onClick={() => { setSelected(item); setNotas(item.notas || '') }}
                style={{
                  background: 'var(--surface)', borderRadius: 12, padding: '14px 18px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderLeft: `4px solid ${isToday ? 'var(--accent)' : statusMeta.color}`,
                  opacity: item.status === 'saltado' ? 0.5 : 1,
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr auto',
                  gap: 16, alignItems: 'center',
                }}
              >
                {/* Día */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isToday ? 'var(--accent)' : 'var(--text)' }}>
                    {isToday && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', display: 'block' }}>HOY</span>}
                    {item.dia_semana}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    {new Date(item.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                    🕐 {item.hora}
                  </div>
                </div>

                {/* Contenido */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: `${audColor}20`, color: audColor,
                    }}>
                      {item.audiencia.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {CANAL_ICON[item.canal] || '📱'} {item.canal}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>· {item.tipo}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{item.tematica}</div>
                  {item.hook && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                      "{item.hook}"
                    </div>
                  )}
                </div>

                {/* Status + acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: statusMeta.bg, color: statusMeta.color,
                  }}>
                    {statusMeta.label}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {item.status !== 'publicado' && (
                      <button
                        onClick={e => { e.stopPropagation(); updateStatus(item, 'publicado') }}
                        style={{
                          padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: '#22c55e20', color: '#22c55e', fontSize: '0.72rem', fontWeight: 600,
                        }}
                      >
                        ✓ Publicado
                      </button>
                    )}
                    {item.status !== 'saltado' && (
                      <button
                        onClick={e => { e.stopPropagation(); updateStatus(item, 'saltado') }}
                        style={{
                          padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'var(--bg)', color: 'var(--muted)', fontSize: '0.72rem',
                        }}
                      >
                        Saltar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Panel de detalle */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selected.dia_semana}</div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}
              >✕</button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: selected.canal, color: '#3b82f6' },
                { label: selected.audiencia.toUpperCase(), color: AUDIENCIA_COLOR[selected.audiencia] },
                { label: `🕐 ${selected.hora}`, color: '#64748b' },
              ].map(b => (
                <span key={b.label} style={{
                  fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20,
                  background: `${b.color}20`, color: b.color, fontWeight: 600,
                }}>
                  {b.label}
                </span>
              ))}
            </div>

            {/* Contenido */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>TEMÁTICA</div>
              <div style={{ fontWeight: 600 }}>{selected.tematica}</div>
            </div>

            {selected.hook && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>GANCHO</div>
                <div style={{
                  background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
                  fontSize: '0.88rem', fontStyle: 'italic', lineHeight: 1.5,
                }}>
                  "{selected.hook}"
                </div>
              </div>
            )}

            {selected.cta && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>CTA</div>
                <div style={{ fontSize: '0.88rem' }}>{selected.cta}</div>
              </div>
            )}

            {selected.razon && (
              <div style={{
                background: `${AUDIENCIA_COLOR[selected.audiencia] || '#64748b'}10`,
                borderRadius: 8, padding: '10px 14px',
                fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5,
              }}>
                💡 {selected.razon}
              </div>
            )}

            {/* Notas */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 6 }}>NOTAS</div>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Agregá notas, ideas o cambios..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: '0.85rem', resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => saveNotas(selected)}
                disabled={savingNotas}
                style={{
                  marginTop: 8, padding: '7px 16px', borderRadius: 7, border: 'none',
                  cursor: 'pointer', background: 'var(--accent)', color: 'white',
                  fontSize: '0.82rem', fontWeight: 600,
                }}
              >
                {savingNotas ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
              <button
                onClick={() => goToMarketing(selected)}
                style={{
                  padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: '0.9rem',
                }}
              >
                ✨ Generar contenido para este día
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                {selected.status !== 'publicado' && (
                  <button
                    onClick={() => updateStatus(selected, 'publicado')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#22c55e20', color: '#22c55e', fontWeight: 600, fontSize: '0.85rem',
                    }}
                  >
                    ✓ Marcar publicado
                  </button>
                )}
                {selected.status !== 'pendiente' && (
                  <button
                    onClick={() => updateStatus(selected, 'pendiente')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                      cursor: 'pointer', background: 'transparent', color: 'var(--muted)', fontSize: '0.85rem',
                    }}
                  >
                    Volver a pendiente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
