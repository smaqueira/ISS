'use client'
import { useState } from 'react'

type ContentTask =
  | 'copy_whatsapp' | 'copy_instagram_caption' | 'copy_historia'
  | 'copy_estado_wa' | 'hashtags' | 'carrusel_textos' | 'copy_instagram_bio'
  | 'imagen_producto' | 'imagen_lifestyle' | 'imagen_promocional'
  | 'flyer_diseno' | 'presentacion'

interface TaskDef {
  id: ContentTask
  label: string
  icon: string
  canal: string
  tipo: 'texto' | 'imagen' | 'diseno'
  descripcion: string
}

const TASKS: TaskDef[] = [
  // WhatsApp
  { id: 'copy_whatsapp',        label: 'Mensaje WhatsApp',      icon: '💬', canal: 'WhatsApp',   tipo: 'texto',  descripcion: 'Mensaje listo para enviar a clientes o grupos' },
  { id: 'copy_estado_wa',       label: 'Estado WhatsApp',       icon: '📸', canal: 'WhatsApp',   tipo: 'texto',  descripcion: 'Texto para el estado de WhatsApp Business' },
  // Instagram
  { id: 'copy_instagram_caption', label: 'Caption Instagram',   icon: '📝', canal: 'Instagram',  tipo: 'texto',  descripcion: '3 variantes de caption con emojis y CTA' },
  { id: 'copy_historia',        label: 'Historia Instagram',    icon: '⭕', canal: 'Instagram',   tipo: 'texto',  descripcion: 'Texto y estructura para una historia' },
  { id: 'copy_instagram_bio',   label: 'Bio Instagram',         icon: '✏️', canal: 'Instagram',  tipo: 'texto',  descripcion: '3 opciones de bio de 150 caracteres' },
  { id: 'hashtags',             label: 'Hashtags',              icon: '#️⃣', canal: 'Instagram',  tipo: 'texto',  descripcion: '20 hashtags estratégicos para tu nicho' },
  { id: 'carrusel_textos',      label: 'Carrusel (textos)',     icon: '🔄', canal: 'Instagram',   tipo: 'texto',  descripcion: 'Textos para 6 slides de carrusel' },
  // Imágenes
  { id: 'imagen_producto',      label: 'Imagen producto',       icon: '🖼️', canal: 'ChatGPT',   tipo: 'imagen', descripcion: 'Prompt para foto de producto en ChatGPT' },
  { id: 'imagen_lifestyle',     label: 'Imagen lifestyle',      icon: '🌅', canal: 'ChatGPT',   tipo: 'imagen', descripcion: 'Prompt para escena de estilo de vida' },
  { id: 'imagen_promocional',   label: 'Imagen promocional',    icon: '🎯', canal: 'Canva AI',  tipo: 'imagen', descripcion: 'Prompt para imagen con oferta o promoción' },
  // Diseño
  { id: 'flyer_diseno',         label: 'Flyer (instrucciones)', icon: '📄', canal: 'Canva',     tipo: 'diseno', descripcion: 'Instrucciones detalladas para armar en Canva' },
  { id: 'presentacion',         label: 'Presentación B2B',      icon: '📊', canal: 'Gamma',     tipo: 'diseno', descripcion: 'Prompt para presentación comercial en Gamma' },
]

const CANAL_COLOR: Record<string, string> = {
  WhatsApp: '#22c55e',
  Instagram: '#e1306c',
  'ChatGPT': '#10a37f',
  'Canva AI': '#7c3aed',
  'Canva': '#7c3aed',
  'Gamma': '#f97316',
}

const OBJETIVOS = [
  'Vender más este finde',
  'Conseguir nuevos clientes',
  'Llegar a restaurantes (B2B)',
  'Mostrar el producto recién llegado',
  'Liquidar stock',
  'Fidelizar clientes actuales',
  'Generar consultas',
  'Posicionar la marca',
]

interface Result {
  herramienta: string
  url: string
  freeTier: string
  limitacion: string
  formato: string
  prompt: string
  configuracion: Record<string, string>
  alternativa?: { herramienta: string; url: string; cuando: string }
  tips: string[]
  contenido: string | null
}

export default function MarketingPage() {
  const [selectedTask, setSelectedTask] = useState<TaskDef | null>(null)
  const [form, setForm] = useState({
    producto: '',
    objetivo: OBJETIVOS[0],
    tono: 'cercano' as 'formal' | 'cercano' | 'urgente' | 'aspiracional',
    audiencia: 'b2c' as 'b2c' | 'b2b',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const NEGOCIO = 'Vitto Mare'

  async function generate() {
    if (!selectedTask || !form.producto) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: selectedTask.id,
          negocio: NEGOCIO,
          producto: form.producto,
          objetivo: form.objetivo,
          tono: form.tono,
          canal: selectedTask.canal,
          audiencia: form.audiencia,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const byCanal = TASKS.reduce<Record<string, TaskDef[]>>((acc, t) => {
    if (!acc[t.canal]) acc[t.canal] = []
    acc[t.canal].push(t)
    return acc
  }, {})

  // Group for display
  const groups = [
    { label: 'WhatsApp', tasks: byCanal['WhatsApp'] || [] },
    { label: 'Instagram', tasks: byCanal['Instagram'] || [] },
    { label: 'Imágenes IA', tasks: [...(byCanal['ChatGPT'] || []), ...(byCanal['Canva AI'] || [])] },
    { label: 'Diseño y Presentaciones', tasks: [...(byCanal['Canva'] || []), ...(byCanal['Gamma'] || [])] },
  ]

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          📣 Marketing IA
        </h1>
        <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
          Generá contenido listo para usar — solo herramientas gratuitas
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

        {/* Panel izquierdo: selector de tarea */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.tasks.map(task => {
                  const active = selectedTask?.id === task.id
                  const color = CANAL_COLOR[task.canal] || 'var(--accent)'
                  return (
                    <button
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setResult(null) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: active ? `${color}20` : 'var(--surface)',
                        borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{task.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400, color: active ? color : 'var(--text)' }}>
                          {task.label}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{task.descripcion}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Panel derecho: formulario + resultado */}
        <div>
          {!selectedTask ? (
            <div style={{
              background: 'var(--surface)', borderRadius: 12, padding: 40,
              textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>👈</div>
              <div style={{ fontSize: '0.95rem' }}>Seleccioná qué tipo de contenido querés generar</div>
              <div style={{ fontSize: '0.8rem', marginTop: 8 }}>Todos los prompts son listos para copiar y pegar en la herramienta correspondiente</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Header de la tarea */}
              <div style={{
                background: 'var(--surface)', borderRadius: 12, padding: 20,
                borderLeft: `4px solid ${CANAL_COLOR[selectedTask.canal] || 'var(--accent)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: '1.4rem' }}>{selectedTask.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{selectedTask.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      Herramienta: <strong style={{ color: CANAL_COLOR[selectedTask.canal] }}>{selectedTask.canal}</strong>
                      {selectedTask.tipo === 'imagen' && ' — el prompt se genera para pegar directo en la IA'}
                      {selectedTask.tipo === 'texto' && ' — el texto se genera acá mismo con IA'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                    ¿Qué producto o servicio querés promocionar?
                  </label>
                  <input
                    value={form.producto}
                    onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}
                    placeholder="Ej: Langostinos frescos, Vieiras del día, Caja surtida de mariscos..."
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                      Objetivo
                    </label>
                    <select
                      value={form.objetivo}
                      onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg)',
                        color: 'var(--text)', fontSize: '0.85rem',
                      }}
                    >
                      {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                      Audiencia
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['b2c', 'b2b'] as const).map(a => (
                        <button
                          key={a}
                          onClick={() => setForm(f => ({ ...f, audiencia: a }))}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                            background: form.audiencia === a ? 'var(--accent)' : 'var(--bg)',
                            color: form.audiencia === a ? 'white' : 'var(--muted)',
                            fontWeight: form.audiencia === a ? 600 : 400,
                          }}
                        >
                          {a === 'b2c' ? '👤 Clientes' : '🍽️ Gastro'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                    Tono de comunicación
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      { v: 'cercano', l: '😊 Cercano' },
                      { v: 'urgente', l: '⚡ Urgente' },
                      { v: 'aspiracional', l: '✨ Premium' },
                      { v: 'formal', l: '👔 Formal' },
                    ] as const).map(({ v, l }) => (
                      <button
                        key={v}
                        onClick={() => setForm(f => ({ ...f, tono: v }))}
                        style={{
                          padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                          background: form.tono === v ? 'var(--accent)' : 'var(--bg)',
                          color: form.tono === v ? 'white' : 'var(--muted)',
                          fontWeight: form.tono === v ? 600 : 400,
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generate}
                  disabled={loading || !form.producto}
                  style={{
                    padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: loading || !form.producto ? 'var(--border)' : 'var(--accent)',
                    color: 'white', fontWeight: 600, fontSize: '0.95rem',
                    transition: 'all 0.15s',
                  }}
                >
                  {loading ? '⏳ Generando...' : `✨ Generar ${selectedTask.label}`}
                </button>
              </div>

              {/* Resultado */}
              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Herramienta recomendada */}
                  <div style={{
                    background: 'var(--surface)', borderRadius: 12, padding: 16,
                    borderTop: `3px solid ${CANAL_COLOR[selectedTask.canal] || 'var(--accent)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>🛠️ {result.herramienta}</div>
                        <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: 2 }}>✓ {result.freeTier}</div>
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem',
                          background: CANAL_COLOR[selectedTask.canal] || 'var(--accent)',
                          color: 'white', textDecoration: 'none', fontWeight: 600,
                        }}
                      >
                        Abrir →
                      </a>
                    </div>
                    {result.limitacion && (
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#f59e0b15', padding: '6px 10px', borderRadius: 6 }}>
                        ⚠️ {result.limitacion}
                      </div>
                    )}
                  </div>

                  {/* Contenido generado (para copy tasks) */}
                  {result.contenido && (
                    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>✅ Contenido generado</div>
                        <button
                          onClick={() => copy(result.contenido!, 'contenido')}
                          style={{
                            padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: copied === 'contenido' ? '#22c55e' : 'var(--accent)',
                            color: 'white', fontSize: '0.8rem', fontWeight: 600,
                          }}
                        >
                          {copied === 'contenido' ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                      </div>
                      <pre style={{
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontSize: '0.88rem', lineHeight: 1.6, margin: 0,
                        color: 'var(--text)', background: 'var(--bg)',
                        padding: 14, borderRadius: 8,
                      }}>
                        {result.contenido}
                      </pre>
                    </div>
                  )}

                  {/* Prompt para IA externa (para imagen/diseño tasks) */}
                  {selectedTask.tipo !== 'texto' && result.prompt && (
                    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          📋 Prompt para {result.herramienta}
                        </div>
                        <button
                          onClick={() => copy(result.prompt, 'prompt')}
                          style={{
                            padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: copied === 'prompt' ? '#22c55e' : 'var(--accent)',
                            color: 'white', fontSize: '0.8rem', fontWeight: 600,
                          }}
                        >
                          {copied === 'prompt' ? '✓ Copiado' : '📋 Copiar prompt'}
                        </button>
                      </div>
                      <div style={{
                        fontSize: '0.85rem', lineHeight: 1.6,
                        color: 'var(--text)', background: 'var(--bg)',
                        padding: 14, borderRadius: 8, fontFamily: 'monospace',
                      }}>
                        {result.prompt}
                      </div>
                      {result.formato && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 8 }}>
                          📐 Configuración: {result.formato}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Configuración */}
                  {Object.keys(result.configuracion || {}).length > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10 }}>⚙️ Configuración recomendada</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(result.configuracion).map(([k, v]) => (
                          <div key={k} style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem',
                            background: 'var(--bg)', color: 'var(--muted)',
                          }}>
                            <strong>{k}:</strong> {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternativa */}
                  {result.alternativa && (
                    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>
                        💡 Alternativa gratuita
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{result.alternativa.herramienta}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{result.alternativa.cuando}</div>
                        </div>
                        <a
                          href={result.alternativa.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          Abrir →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {result.tips?.length > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10 }}>🎯 Tips pro</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {result.tips.map((tip, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', gap: 8 }}>
                            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>→</span>
                            {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
