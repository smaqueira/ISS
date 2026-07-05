'use client'
import { useState, useEffect } from 'react'

interface Trigger {
  id: string
  type: 'dm_keyword' | 'comment_keyword' | 'welcome' | 'story_mention'
  keyword: string | null
  keyword_match: 'exact' | 'contains' | 'starts_with'
  response_message: string
  also_reply_comment: boolean
  comment_reply_text: string | null
  active: boolean
  sent_count: number
  created_at: string
}

interface DmLog {
  id: string
  trigger_type: string
  username: string | null
  trigger_text: string
  response_sent: string
  success: boolean
  error_msg: string | null
  sent_at: string
}

const TYPE_META: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  welcome:          { label: 'Bienvenida',        icon: '👋', color: '#22c55e', desc: 'Se envía cuando alguien te escribe por primera vez' },
  dm_keyword:       { label: 'Palabra clave DM',  icon: '💬', color: '#3b82f6', desc: 'Se activa cuando alguien te manda un DM con una palabra exacta' },
  comment_keyword:  { label: 'Comentario → DM',   icon: '💬', color: '#f97316', desc: 'Cuando alguien comenta una palabra, recibe un DM automático' },
  story_mention:    { label: 'Menciones story',   icon: '⭕', color: '#a855f7', desc: 'Se envía cuando alguien te menciona en una historia' },
}

const EMPTY_FORM = {
  type: 'dm_keyword' as Trigger['type'],
  keyword: '',
  keyword_match: 'contains' as Trigger['keyword_match'],
  response_message: '',
  also_reply_comment: false,
  comment_reply_text: '',
}

export default function InstagramDMPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [logs, setLogs] = useState<DmLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [tab, setTab] = useState<'reglas' | 'logs' | 'setup'>('reglas')

  useEffect(() => { load() }, [])

  async function load() {
    const [tRes, lRes] = await Promise.all([
      fetch('/api/instagram-dm/triggers'),
      fetch('/api/instagram-dm/logs'),
    ])
    setTriggers(await tRes.json())
    setLogs(await lRes.json())
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const method = editing ? 'PATCH' : 'POST'
    const body = editing ? { id: editing, ...form } : form
    await fetch('/api/instagram-dm/triggers', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    load()
  }

  async function toggle(trigger: Trigger) {
    await fetch('/api/instagram-dm/triggers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: trigger.id, active: !trigger.active }),
    })
    setTriggers(prev => prev.map(t => t.id === trigger.id ? { ...t, active: !t.active } : t))
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta regla?')) return
    await fetch('/api/instagram-dm/triggers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTriggers(prev => prev.filter(t => t.id !== id))
  }

  function startEdit(trigger: Trigger) {
    setEditing(trigger.id)
    setForm({
      type: trigger.type,
      keyword: trigger.keyword || '',
      keyword_match: trigger.keyword_match,
      response_message: trigger.response_message,
      also_reply_comment: trigger.also_reply_comment,
      comment_reply_text: trigger.comment_reply_text || '',
    })
    setShowForm(true)
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/instagram`
    : '/api/webhooks/instagram'

  const totalSent = triggers.reduce((s, t) => s + (t.sent_count || 0), 0)
  const activeTriggers = triggers.filter(t => t.active).length

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
              📸 DMs automáticos de Instagram
            </h1>
            <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
              Respuestas automáticas a DMs, comentarios y menciones
            </p>
          </div>
          {tab === 'reglas' && (
            <button
              onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY_FORM) }}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: '0.9rem',
              }}
            >
              + Nueva regla
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Reglas activas', value: activeTriggers, color: '#22c55e' },
            { label: 'DMs enviados', value: totalSent, color: '#3b82f6' },
            { label: 'Últimas 24hs', value: logs.filter(l => new Date(l.sent_at) > new Date(Date.now() - 86400000)).length, color: '#f97316' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', borderRadius: 10, padding: '12px 20px',
              borderTop: `3px solid ${s.color}`, flex: 1, textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {([
          { id: 'reglas', label: '⚡ Reglas' },
          { id: 'logs', label: '📋 Historial' },
          { id: 'setup', label: '🔧 Configuración' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--muted)',
              fontWeight: tab === t.id ? 600 : 400, fontSize: '0.875rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: REGLAS */}
      {tab === 'reglas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <div style={{ color: 'var(--muted)', padding: 20 }}>Cargando...</div>}

          {!loading && triggers.length === 0 && (
            <div style={{
              background: 'var(--surface)', borderRadius: 12, padding: 40,
              textAlign: 'center', color: 'var(--muted)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🤖</div>
              <div>No hay reglas todavía. Creá la primera.</div>
            </div>
          )}

          {triggers.map(trigger => {
            const meta = TYPE_META[trigger.type]
            return (
              <div key={trigger.id} style={{
                background: 'var(--surface)', borderRadius: 12, padding: 16,
                borderLeft: `4px solid ${trigger.active ? meta.color : 'var(--border)'}`,
                opacity: trigger.active ? 1 : 0.6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: `${meta.color}20`, color: meta.color,
                      }}>
                        {meta.label}
                      </span>
                      {trigger.keyword && (
                        <span style={{
                          fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20,
                          background: 'var(--bg)', color: 'var(--muted)', fontFamily: 'monospace',
                        }}>
                          "{trigger.keyword}"
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        · {trigger.sent_count} enviados
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.83rem', color: 'var(--text)', background: 'var(--bg)',
                      padding: '8px 12px', borderRadius: 8, whiteSpace: 'pre-wrap',
                      maxHeight: 80, overflow: 'hidden',
                    }}>
                      {trigger.response_message.length > 160
                        ? trigger.response_message.slice(0, 160) + '...'
                        : trigger.response_message}
                    </div>
                    {trigger.also_reply_comment && trigger.comment_reply_text && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                        💬 También responde públicamente: "{trigger.comment_reply_text}"
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                    {/* Toggle activo/inactivo */}
                    <button
                      onClick={() => toggle(trigger)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: trigger.active ? '#22c55e20' : 'var(--bg)',
                        color: trigger.active ? '#22c55e' : 'var(--muted)',
                        fontSize: '0.78rem', fontWeight: 600,
                      }}
                    >
                      {trigger.active ? '● Activa' : '○ Pausada'}
                    </button>
                    <button
                      onClick={() => startEdit(trigger)}
                      style={{
                        padding: '6px 10px', borderRadius: 6, border: 'none',
                        cursor: 'pointer', background: 'var(--bg)', color: 'var(--muted)', fontSize: '0.8rem',
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => remove(trigger.id)}
                      style={{
                        padding: '6px 10px', borderRadius: 6, border: 'none',
                        cursor: 'pointer', background: '#ef444420', color: '#ef4444', fontSize: '0.8rem',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB: LOGS */}
      {tab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.length === 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              Todavía no se enviaron DMs automáticos
            </div>
          )}
          {logs.map(log => {
            const meta = TYPE_META[log.trigger_type] || { icon: '💬', color: '#888', label: log.trigger_type }
            return (
              <div key={log.id} style={{
                background: 'var(--surface)', borderRadius: 10, padding: '12px 16px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                borderLeft: `3px solid ${log.success ? meta.color : '#ef4444'}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      @{log.username || log.trigger_type}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', padding: '1px 6px', borderRadius: 20,
                      background: `${meta.color}20`, color: meta.color,
                    }}>
                      {meta.label || log.trigger_type}
                    </span>
                    {!log.success && (
                      <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>❌ {log.error_msg}</span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                      {new Date(log.sent_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Trigger: "{log.trigger_text}"
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB: SETUP */}
      {tab === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>🔧 Configuración en Meta for Developers</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  paso: '1',
                  titulo: 'Crear una App en Meta for Developers',
                  desc: 'Ir a developers.facebook.com → Mis Apps → Crear App → Tipo: Business',
                  link: 'https://developers.facebook.com',
                  linkLabel: 'Abrir Meta for Developers →',
                },
                {
                  paso: '2',
                  titulo: 'Agregar producto: Instagram Graph API',
                  desc: 'En tu App → Agregar productos → Instagram Graph API',
                },
                {
                  paso: '3',
                  titulo: 'Configurar el webhook',
                  desc: 'Webhooks → Instagram → Configurar → Callback URL:',
                  code: webhookUrl,
                  codeLabel: 'Verify Token: (el que cargues en Configuración)',
                  subDesc: 'Suscribirse a: messages, comments, mentions',
                },
                {
                  paso: '4',
                  titulo: 'Obtener el Access Token',
                  desc: 'Herramientas → Explorador de la API Graph → Generar token con permisos: instagram_basic, instagram_manage_messages, instagram_manage_comments, pages_messaging',
                },
                {
                  paso: '5',
                  titulo: 'Cargar credenciales',
                  desc: 'Ir a Configuración → sección Instagram y cargar: Access Token, Page ID, Verify Token',
                  link: '/admin/settings',
                  linkLabel: 'Ir a Configuración →',
                },
              ].map(step => (
                <div key={step.paso} style={{
                  display: 'flex', gap: 14, padding: 14,
                  background: 'var(--bg)', borderRadius: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {step.paso}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{step.titulo}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{step.desc}</div>
                    {step.code && (
                      <div style={{
                        fontFamily: 'monospace', fontSize: '0.78rem', background: '#00000030',
                        padding: '6px 10px', borderRadius: 6, marginTop: 6, wordBreak: 'break-all',
                      }}>
                        {step.code}
                      </div>
                    )}
                    {step.codeLabel && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{step.codeLabel}</div>
                    )}
                    {step.subDesc && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{step.subDesc}</div>
                    )}
                    {step.link && (
                      <a href={step.link} target={step.link.startsWith('http') ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: 'var(--accent)', display: 'inline-block', marginTop: 6 }}>
                        {step.linkLabel}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#22c55e15', borderRadius: 12, padding: 16, borderLeft: '4px solid #22c55e' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>✅ Todo gratis</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              La Instagram Graph API es gratuita. No hay límite de DMs automáticos.
              La única limitación: solo podés responder dentro de las primeras 24 horas
              después de que el usuario te escribe. Para los comentarios y menciones no hay restricción de tiempo.
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulario nueva/editar regla */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: '#00000080',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>
              {editing ? 'Editar regla' : 'Nueva regla automática'}
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Tipo de disparador</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(TYPE_META).map(([value, meta]) => (
                  <button
                    key={value}
                    onClick={() => setForm(f => ({ ...f, type: value as Trigger['type'] }))}
                    style={{
                      padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: form.type === value ? `${meta.color}20` : 'var(--bg)',
                      borderLeft: `3px solid ${form.type === value ? meta.color : 'transparent'}`,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: form.type === value ? 600 : 400, color: form.type === value ? meta.color : 'var(--text)' }}>
                      {meta.icon} {meta.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{meta.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Keyword (solo para dm_keyword y comment_keyword) */}
            {(form.type === 'dm_keyword' || form.type === 'comment_keyword') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Palabra clave que activa la respuesta
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={form.keyword}
                    onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                    placeholder="Ej: PRECIO, INFO, CATÁLOGO..."
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: '0.9rem',
                    }}
                  />
                  <select
                    value={form.keyword_match}
                    onChange={e => setForm(f => ({ ...f, keyword_match: e.target.value as Trigger['keyword_match'] }))}
                    style={{
                      padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: '0.82rem',
                    }}
                  >
                    <option value="contains">Contiene</option>
                    <option value="exact">Exacta</option>
                    <option value="starts_with">Empieza con</option>
                  </select>
                </div>
              </div>
            )}

            {/* Mensaje de respuesta */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Mensaje DM a enviar
              </label>
              <textarea
                value={form.response_message}
                onChange={e => setForm(f => ({ ...f, response_message: e.target.value }))}
                placeholder="Hola! Gracias por escribirnos 👋..."
                rows={6}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: '0.88rem', resize: 'vertical',
                  lineHeight: 1.5, boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>
                {form.response_message.length}/1000 · Los DMs de Instagram tienen límite de 1000 caracteres
              </div>
            </div>

            {/* Respuesta pública al comentario */}
            {form.type === 'comment_keyword' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.also_reply_comment}
                    onChange={e => setForm(f => ({ ...f, also_reply_comment: e.target.checked }))}
                  />
                  <span style={{ fontSize: '0.85rem' }}>También responder públicamente al comentario</span>
                </label>
                {form.also_reply_comment && (
                  <input
                    value={form.comment_reply_text}
                    onChange={e => setForm(f => ({ ...f, comment_reply_text: e.target.value }))}
                    placeholder="Ej: ¡Te mandamos la info por DM! 📩"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: '0.88rem', boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => { setShowForm(false); setEditing(null) }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !form.response_message || ((form.type === 'dm_keyword' || form.type === 'comment_keyword') && !form.keyword)}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--accent)', color: 'white', fontWeight: 600,
                }}
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear regla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
