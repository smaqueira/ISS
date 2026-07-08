'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Reel, ReelCategory, ReelObjective, ReelPlatform } from '@/lib/reels/types'

const ESTADO_COLOR: Record<string, string> = {
  borrador: '#94a3b8',
  generando: '#f59e0b',
  listo: '#22c55e',
  publicado: '#3b82f6',
  error: '#ef4444',
}

const PLATAFORMA_ICON: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', todos: '📡',
}

const CATEGORIAS: ReelCategory[] = ['pescados', 'mariscos', 'sushi', 'seleccion', 'recetas', 'general']
const OBJETIVOS: ReelObjective[] = ['venta', 'branding', 'educacion', 'promocion', 'oferta', 'novedad']
const PLATAFORMAS: ReelPlatform[] = ['instagram', 'tiktok', 'facebook', 'todos']

interface Stats { total: number; publicados: number; pendientes: number; programados: number }

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterEstado, setFilterEstado] = useState('')

  // Form state
  const [titulo, setTitulo] = useState('')
  const [productoNombre, setProductoNombre] = useState('')
  const [categoria, setCategoria] = useState<ReelCategory>('general')
  const [objetivo, setObjetivo] = useState<ReelObjective>('venta')
  const [plataforma, setPlataforma] = useState<ReelPlatform>('instagram')
  const [cta, setCta] = useState('Pedí en vittomare.com 🐟')
  const [notas, setNotas] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [reelsRes, statsRes] = await Promise.all([
      fetch(`/api/reels${filterEstado ? `?estado=${filterEstado}` : ''}`),
      fetch('/api/reels?stats=1'),
    ])
    if (reelsRes.ok) setReels(await reelsRes.json())
    if (statsRes.ok) setStats(await statsRes.json())
    setLoading(false)
  }, [filterEstado])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setCreating(true)
    const res = await fetch('/api/reels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, producto_nombre: productoNombre, categoria, objetivo, plataforma, cta }),
    })
    if (res.ok) {
      const reel: Reel = await res.json()
      // Auto-generar script con IA
      fetch(`/api/reels/${reel.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_nombre: productoNombre, categoria, objetivo, plataforma, notas_adicionales: notas }),
      })
      setShowForm(false)
      setTitulo(''); setProductoNombre(''); setNotas('')
      await load()
    }
    setCreating(false)
  }

  const sInput: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box',
  }
  const sSelect: React.CSSProperties = { ...sInput, cursor: 'pointer' }

  return (
    <div style={{ maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>🎬 Reels con IA</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Generá, organizá y publicá Reels para Instagram, TikTok y Facebook con IA.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/reels/calendar" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: 8, textDecoration: 'none', fontSize: '0.85rem' }}>
            📅 Calendario
          </Link>
          <Link href="/admin/reels/queue" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: 8, textDecoration: 'none', fontSize: '0.85rem' }}>
            ⏳ Cola
          </Link>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            + Nuevo Reel
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--accent)' },
            { label: 'Publicados', value: stats.publicados, color: '#3b82f6' },
            { label: 'Listos/Borrador', value: stats.pendientes, color: '#22c55e' },
            { label: 'Programados', value: stats.programados, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form crear reel */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)' }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>✨ Nuevo Reel con IA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Título del reel</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} style={sInput} placeholder="Ej: Langostinos frescos del día" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Producto / tema principal</label>
              <input value={productoNombre} onChange={e => setProductoNombre(e.target.value)} style={sInput} placeholder="Ej: Langostinos jumbo" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Categoría</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value as ReelCategory)} style={sSelect}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Objetivo</label>
              <select value={objetivo} onChange={e => setObjetivo(e.target.value as ReelObjective)} style={sSelect}>
                {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Plataforma</label>
              <select value={plataforma} onChange={e => setPlataforma(e.target.value as ReelPlatform)} style={sSelect}>
                {PLATAFORMAS.map(p => <option key={p} value={p}>{PLATAFORMA_ICON[p]} {p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CTA (llamada a la acción)</label>
            <input value={cta} onChange={e => setCta(e.target.value)} style={sInput} placeholder="Pedí en vittomare.com 🐟" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Notas adicionales para la IA (opcional)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} style={{ ...sInput, height: 70, resize: 'vertical' }} placeholder="Ej: Destacar frescura, entrega en el día, diferenciarse de delivery genérico..." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={creating || !titulo || !productoNombre} className="btn btn-primary">
              {creating ? '⏳ Creando...' : '✨ Crear y generar script con IA'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Cancelar
            </button>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 8 }}>
            ✨ La IA generará gancho, guión, escenas, hashtags y prompt de video automáticamente.
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['', 'borrador', 'generando', 'listo', 'publicado', 'error'].map(e => (
          <button key={e} onClick={() => setFilterEstado(e)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)',
            background: filterEstado === e ? 'var(--accent)' : 'transparent',
            color: filterEstado === e ? '#fff' : 'var(--muted)',
            cursor: 'pointer', fontSize: '0.78rem',
          }}>
            {e ? `● ${e}` : 'Todos'}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.78rem' }}>
          🔄
        </button>
      </div>

      {/* Tabla de reels */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Cargando reels...</div>
      ) : reels.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎬</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No hay reels todavía</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>Creá tu primer Reel y la IA generará el guión completo.</div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Crear primer Reel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reels.map(reel => (
            <Link key={reel.id} href={`/admin/reels/${reel.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                {/* Thumbnail placeholder */}
                <div style={{
                  width: 54, height: 54, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #0D1326, #1a2a4a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem',
                }}>
                  {PLATAFORMA_ICON[reel.plataforma] || '🎬'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reel.titulo}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{reel.categoria}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>·</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{reel.objetivo}</span>
                    {reel.duracion && <>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>·</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{reel.duracion}s</span>
                    </>}
                    {reel.producto_nombre && <>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>·</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>{reel.producto_nombre}</span>
                    </>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                    background: `${ESTADO_COLOR[reel.estado]}20`,
                    color: ESTADO_COLOR[reel.estado],
                  }}>
                    {reel.estado === 'generando' ? '⏳ ' : ''}{reel.estado}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                    {new Date(reel.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
