'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Reel, ReelCategory, ReelObjective, ReelPlatform } from '@/lib/reels/types'

const CATEGORIAS: ReelCategory[] = ['pescados', 'mariscos', 'sushi', 'seleccion', 'recetas', 'general']
const OBJETIVOS: ReelObjective[] = ['venta', 'branding', 'educacion', 'promocion', 'oferta', 'novedad']
const PLATAFORMAS: ReelPlatform[] = ['instagram', 'tiktok', 'facebook', 'todos']

const ESTADO_COLOR: Record<string, string> = {
  borrador: '#94a3b8', generando: '#f59e0b', listo: '#22c55e', publicado: '#3b82f6', error: '#ef4444',
}

export default function ReelEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [reel, setReel] = useState<Reel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Editable fields
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [productoNombre, setProductoNombre] = useState('')
  const [categoria, setCategoria] = useState<ReelCategory>('general')
  const [objetivo, setObjetivo] = useState<ReelObjective>('venta')
  const [plataforma, setPlataforma] = useState<ReelPlatform>('instagram')
  const [cta, setCta] = useState('')
  const [hashtagsText, setHashtagsText] = useState('')
  const [notas, setNotas] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/reels/${id}`)
    if (res.ok) {
      const data: Reel = await res.json()
      setReel(data)
      setTitulo(data.titulo)
      setDescripcion(data.descripcion)
      setProductoNombre(data.producto_nombre || '')
      setCategoria(data.categoria)
      setObjetivo(data.objetivo)
      setPlataforma(data.plataforma)
      setCta(data.cta)
      setHashtagsText((data.hashtags || []).join(' '))
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/reels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo, descripcion, producto_nombre: productoNombre,
        categoria, objetivo, plataforma, cta,
        hashtags: hashtagsText.split(/\s+/).filter(h => h.startsWith('#')),
      }),
    })
    await load()
    setSaving(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    await fetch(`/api/reels/${id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        producto_nombre: productoNombre,
        categoria, objetivo, plataforma,
        notas_adicionales: notas || undefined,
      }),
    })
    await load()
    setGenerating(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este reel?')) return
    setDeleting(true)
    await fetch(`/api/reels/${id}`, { method: 'DELETE' })
    router.push('/admin/reels')
  }

  const sInput: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)' }}>Cargando...</div>
  if (!reel) return <div style={{ textAlign: 'center', padding: 80 }}>Reel no encontrado. <Link href="/admin/reels">Volver</Link></div>

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: '0.82rem', color: 'var(--muted)' }}>
        <Link href="/admin/reels" style={{ color: 'var(--accent)', textDecoration: 'none' }}>🎬 Reels</Link>
        <span>/</span>
        <span>{reel.titulo}</span>
        <span style={{
          marginLeft: 'auto', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 20,
          background: `${ESTADO_COLOR[reel.estado]}20`, color: ESTADO_COLOR[reel.estado], fontWeight: 600,
        }}>
          {reel.estado === 'generando' ? '⏳ ' : ''}{reel.estado}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

        {/* Panel izquierdo: editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.92rem' }}>✏️ Datos del Reel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Título</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} style={sInput} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Descripción (caption para publicación)</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ ...sInput, height: 80, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Producto / tema</label>
                <input value={productoNombre} onChange={e => setProductoNombre(e.target.value)} style={sInput} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Categoría</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value as ReelCategory)} style={{ ...sInput, cursor: 'pointer' }}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Objetivo</label>
                  <select value={objetivo} onChange={e => setObjetivo(e.target.value as ReelObjective)} style={{ ...sInput, cursor: 'pointer' }}>
                    {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Plataforma</label>
                  <select value={plataforma} onChange={e => setPlataforma(e.target.value as ReelPlatform)} style={{ ...sInput, cursor: 'pointer' }}>
                    {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CTA</label>
                <input value={cta} onChange={e => setCta(e.target.value)} style={sInput} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Hashtags (separados por espacio)</label>
                <textarea value={hashtagsText} onChange={e => setHashtagsText(e.target.value)} style={{ ...sInput, height: 60, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  {saving ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
                <button onClick={handleDelete} disabled={deleting} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid #ef4444',
                  background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem',
                }}>
                  {deleting ? 'Eliminando...' : '🗑 Eliminar'}
                </button>
              </div>
            </div>
          </div>

          {/* Script generado */}
          {reel.script && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.92rem' }}>📝 Script generado por IA</div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Gancho (primeros 3s)</div>
                <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b' }}>
                  {reel.script.gancho}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Guión completo</div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {reel.script.guion_completo}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Escenas ({reel.script.escenas?.length || 0})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(reel.script.escenas || []).map(s => (
                    <div key={s.orden} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>#{s.orden}</span>
                        <span style={{ color: 'var(--muted)' }}>{s.duracion}s</span>
                        {s.camara && <span style={{ color: 'var(--muted)' }}>· {s.camara}</span>}
                      </div>
                      <div style={{ marginBottom: s.texto_pantalla ? 4 : 0 }}>{s.descripcion}</div>
                      {s.texto_pantalla && (
                        <div style={{ color: '#f59e0b', fontStyle: 'italic', fontSize: '0.78rem' }}>Texto: "{s.texto_pantalla}"</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Voz sugerida</div>
                  <div style={{ fontSize: '0.82rem' }}>{reel.script.voz_sugerida}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Música sugerida</div>
                  <div style={{ fontSize: '0.82rem' }}>{reel.script.musica_sugerida}</div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Prompt para video IA (Kling / Pika / Runway)</div>
                <div style={{
                  background: '#3b82f610', border: '1px solid #3b82f630', borderRadius: 8,
                  padding: '10px 14px', fontSize: '0.78rem', fontFamily: 'monospace', lineHeight: 1.7,
                }}>
                  {reel.script.prompt_video}
                </div>
              </div>

              {reel.script.fliki_script && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Script para Fliki.ai</div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(reel.script!.fliki_script!); alert('¡Copiado! Pegalo en Fliki.') }}
                      style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 6, border: '1px solid #8b5cf6', background: '#8b5cf610', color: '#8b5cf6', cursor: 'pointer' }}
                    >
                      📋 Copiar para Fliki
                    </button>
                  </div>
                  <div style={{
                    background: '#8b5cf610', border: '1px solid #8b5cf630', borderRadius: 8,
                    padding: '10px 14px', fontSize: '0.78rem', fontFamily: 'monospace', lineHeight: 1.9, whiteSpace: 'pre-wrap',
                  }}>
                    {reel.script.fliki_script}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel derecho: acciones y meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.92rem' }}>⚡ Acciones</div>

            {reel.estado !== 'generando' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Notas para regenerar (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} style={{ ...sInput, height: 60, resize: 'vertical', fontSize: '0.8rem' }} placeholder="Ej: Hacé el gancho más agresivo, enfocate en el precio..." />
              </div>
            )}

            <button onClick={handleGenerate} disabled={generating || reel.estado === 'generando'} className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }}>
              {generating || reel.estado === 'generando' ? '⏳ Generando script...' : '✨ Regenerar con IA'}
            </button>

            {reel.estado === 'listo' && (
              <button
                onClick={() => fetch(`/api/reels/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'publicado', publicado_at: new Date().toISOString() }) }).then(load)}
                style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1px solid #22c55e', background: '#22c55e20', cursor: 'pointer', color: '#22c55e', fontSize: '0.85rem', fontWeight: 600 }}
              >
                ✅ Marcar como publicado
              </button>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.88rem' }}>📊 Metadata</div>
            {[
              { label: 'Creado', value: new Date(reel.created_at).toLocaleDateString('es-AR') },
              { label: 'Actualizado', value: new Date(reel.updated_at).toLocaleDateString('es-AR') },
              { label: 'Duración', value: reel.duracion ? `${reel.duracion}s` : '—' },
              { label: 'IA usada', value: reel.ai_provider || '—' },
              { label: 'Publicado', value: reel.publicado_at ? new Date(reel.publicado_at).toLocaleDateString('es-AR') : '—' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>{m.label}</span>
                <span style={{ fontWeight: 500 }}>{m.value}</span>
              </div>
            ))}
          </div>

          {reel.hashtags?.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.88rem' }}>🏷️ Hashtags ({reel.hashtags.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {reel.hashtags.map(h => (
                  <span key={h} style={{
                    fontSize: '0.7rem', padding: '3px 7px', borderRadius: 12,
                    background: 'var(--accent)20', color: 'var(--accent)', fontWeight: 500,
                  }}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(reel.script?.subtitulos?.length ?? 0) > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.88rem' }}>💬 Subtítulos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reel.script?.subtitulos?.map((s, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', padding: '4px 8px', background: 'var(--bg)', borderRadius: 6 }}>{s}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
