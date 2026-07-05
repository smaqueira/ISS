'use client'
import { useState, useEffect, useRef } from 'react'

interface UnifiedMessage {
  id: string
  canal: string
  canal_icon: string
  direction: 'in' | 'out'
  client_name: string
  text: string
  created_at: string
}

interface Conversation {
  id: string
  client_id: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  client_type: string
  client_status: string | null
  client_rubro: string | null
  client_city: string | null
  canales: string[]
  last_message: string
  last_at: string
  last_canal: string
  last_canal_icon: string
  unread: number
  messages: UnifiedMessage[]
  ig_user_id?: string
}

const CANAL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  email: '#3b82f6',
  telegram: '#229ED9',
}

const CANAL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'Email',
  telegram: 'Telegram',
}

const FILTROS = [
  { id: 'todos', label: 'Todos', icon: '📥' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'email', label: 'Email', icon: '📧' },
]

export default function InboxPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [generando, setGenerando] = useState(false)
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected])

  async function load() {
    setLoading(true)
    const params = filtro !== 'todos' ? `?canal=${filtro}` : ''
    const res = await fetch(`/api/inbox${params}`)
    const data = await res.json()
    setConvs(Array.isArray(data) ? data : [])
    if (selected) {
      const updated = (Array.isArray(data) ? data : []).find((c: Conversation) => c.id === selected.id)
      if (updated) setSelected(updated)
    }
    setLoading(false)
  }

  async function generarRespuesta(conv: Conversation) {
    setGenerando(true)
    setReply('')
    const res = await fetch('/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: conv.client_name,
        client_type: conv.client_type,
        last_message: conv.last_message,
        canal: CANAL_LABELS[conv.last_canal] || conv.last_canal,
        rubro: conv.client_rubro,
      }),
    })
    const data = await res.json()
    setReply(data.reply || '')
    setGenerando(false)
  }

  function openWhatsApp(conv: Conversation) {
    if (!conv.client_phone) return
    const phone = conv.client_phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}${reply ? `?text=${encodeURIComponent(reply)}` : ''}`, '_blank')
  }

  function openEmail(conv: Conversation) {
    if (!conv.client_email) return
    window.open(`mailto:${conv.client_email}?body=${encodeURIComponent(reply)}`, '_blank')
  }

  function copy() {
    navigator.clipboard.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(iso: string) {
    if (!iso) return ''
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  function formatTime(iso: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  const totalUnread = convs.reduce((s, c) => s + c.unread, 0)
  const canalesActivos = [...new Set(convs.flatMap(c => c.canales))]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 40px)', gap: 0, overflow: 'hidden' }}>

      {/* Sidebar: lista de conversaciones */}
      <div style={{ width: 300, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            📥 Inbox
            {totalUnread > 0 && (
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: '0.68rem', padding: '2px 8px', fontWeight: 700 }}>
                {totalUnread}
              </span>
            )}
          </div>

          {/* Filtros de canal */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FILTROS.map(f => {
              const activo = f.id === 'todos' || canalesActivos.includes(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  style={{
                    padding: '3px 10px', borderRadius: 20, border: 'none', cursor: activo ? 'pointer' : 'default',
                    background: filtro === f.id ? 'var(--accent)' : 'var(--bg)',
                    color: filtro === f.id ? 'white' : activo ? 'var(--text)' : 'var(--border)',
                    fontSize: '0.72rem', fontWeight: filtro === f.id ? 700 : 400,
                    opacity: activo ? 1 : 0.4,
                  }}
                >
                  {f.icon} {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30, fontSize: '0.85rem' }}>Cargando...</div>
          )}
          {!loading && convs.length === 0 && (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40, fontSize: '0.82rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📭</div>
              Sin mensajes en los últimos 7 días
            </div>
          )}
          {convs.map(conv => (
            <div
              key={conv.id}
              onClick={() => { setSelected(conv); setReply('') }}
              style={{
                padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: selected?.id === conv.id ? '#f9731610' : 'transparent',
                borderLeft: selected?.id === conv.id ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: '0.75rem' }}>{conv.client_type === 'b2b' ? '🏢' : '👤'}</span>
                  {conv.client_name}
                </div>
                <div style={{ fontSize: '0.67rem', color: 'var(--muted)', flexShrink: 0 }}>{formatDate(conv.last_at)}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  <span style={{ marginRight: 4 }}>{conv.last_canal_icon}</span>
                  {conv.last_message?.slice(0, 40)}{(conv.last_message?.length || 0) > 40 ? '…' : ''}
                </div>
                {conv.unread > 0 && (
                  <span style={{
                    background: CANAL_COLORS[conv.last_canal] || 'var(--accent)', color: 'white',
                    borderRadius: 20, fontSize: '0.63rem', padding: '1px 6px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {conv.unread}
                  </span>
                )}
              </div>

              {conv.canales.length > 1 && (
                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                  {conv.canales.map(c => (
                    <span key={c} style={{
                      fontSize: '0.62rem', padding: '1px 5px', borderRadius: 10,
                      background: `${CANAL_COLORS[c] || '#666'}20`,
                      color: CANAL_COLORS[c] || '#666', fontWeight: 600,
                    }}>
                      {CANAL_LABELS[c] || c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panel de conversación */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: CANAL_COLORS[selected.last_canal] || 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0,
              }}>
                {selected.client_type === 'b2b' ? '🏢' : '👤'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {selected.client_name}
                  <span style={{
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
                    background: selected.client_type === 'b2b' ? '#3b82f620' : '#22c55e20',
                    color: selected.client_type === 'b2b' ? '#3b82f6' : '#22c55e', fontWeight: 600,
                  }}>
                    {selected.client_type?.toUpperCase()}
                  </span>
                  {selected.client_status && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>· {selected.client_status}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                  {selected.client_rubro && <span>🍽️ {selected.client_rubro}</span>}
                  {selected.client_city && <span>📍 {selected.client_city}</span>}
                  {selected.client_phone && <span>📱 {selected.client_phone}</span>}
                  {selected.client_email && <span>✉️ {selected.client_email}</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {selected.canales.map(c => (
                <span key={c} style={{
                  fontSize: '0.75rem', padding: '4px 10px', borderRadius: 20,
                  background: `${CANAL_COLORS[c]}20`, color: CANAL_COLORS[c], fontWeight: 700,
                }}>
                  {CANAL_LABELS[c] || c}
                </span>
              ))}
              {selected.client_id && (
                <a
                  href={`/admin/clients?id=${selected.client_id}`}
                  style={{
                    fontSize: '0.75rem', padding: '4px 10px', borderRadius: 20,
                    background: 'var(--bg)', color: 'var(--muted)', fontWeight: 600,
                    textDecoration: 'none', border: '1px solid var(--border)',
                  }}
                >
                  Ver cliente →
                </a>
              )}
            </div>
          </div>

          {/* Timeline de mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.messages
              .slice()
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '72%', padding: '9px 13px',
                    borderRadius: msg.direction === 'out' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.direction === 'out'
                      ? `${CANAL_COLORS[msg.canal] || 'var(--accent)'}18`
                      : 'var(--surface)',
                    border: `1px solid ${(CANAL_COLORS[msg.canal] || '#ccc')}30`,
                    fontSize: '0.86rem', lineHeight: 1.5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.7rem' }}>{msg.canal_icon}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                        {CANAL_LABELS[msg.canal] || msg.canal}
                        {msg.direction === 'out' ? ' · enviado' : ' · recibido'}
                      </span>
                    </div>
                    <div>{msg.text}</div>
                    <div style={{ fontSize: '0.63rem', opacity: 0.5, marginTop: 4, textAlign: 'right' }}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            <div ref={bottomRef} />
          </div>

          {/* Panel de respuesta */}
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <button
                onClick={() => generarRespuesta(selected)}
                disabled={generando}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: generando ? 'var(--border)' : 'var(--accent)',
                  color: 'white', fontWeight: 600, fontSize: '0.82rem',
                }}
              >
                {generando ? '✨ Generando...' : '✨ Sugerir respuesta IA'}
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                basado en el último mensaje recibido
              </span>
            </div>

            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Escribí tu respuesta o generá una con IA..."
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: '0.88rem', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                onClick={copy}
                disabled={!reply}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                  cursor: reply ? 'pointer' : 'not-allowed', background: 'var(--bg)',
                  color: copied ? '#22c55e' : 'var(--text)', fontSize: '0.82rem', fontWeight: 600,
                  opacity: reply ? 1 : 0.5,
                }}
              >
                {copied ? '✓ Copiado' : '📋 Copiar'}
              </button>

              {selected.client_phone && (
                <button
                  onClick={() => openWhatsApp(selected)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: reply ? '#25D366' : '#25D36640',
                    color: 'white', fontSize: '0.82rem', fontWeight: 700,
                  }}
                >
                  💬 {reply ? 'Responder por WhatsApp' : 'Abrir WhatsApp'}
                </button>
              )}

              {selected.client_email && (
                <button
                  onClick={() => openEmail(selected)}
                  disabled={!reply}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    cursor: reply ? 'pointer' : 'not-allowed',
                    background: reply ? '#3b82f6' : 'var(--border)',
                    color: 'white', fontSize: '0.82rem', fontWeight: 700,
                    opacity: reply ? 1 : 0.5,
                  }}
                >
                  📧 Responder por Email
                </button>
              )}

              {selected.ig_user_id && !selected.client_phone && !selected.client_email && (
                <button
                  disabled
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    cursor: 'not-allowed', background: '#E1306C30',
                    color: '#E1306C', fontSize: '0.82rem', fontWeight: 700,
                  }}
                >
                  📸 IG (pendiente configuración)
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: 'var(--muted)' }}>
          <div style={{ fontSize: '3rem' }}>📥</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Inbox inteligente</div>
          <div style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
            Todos los mensajes de WhatsApp, Instagram y Email en un solo lugar.
            <br />Seleccioná una conversación para responder.
          </div>
          {canalesActivos.length > 0 && (
            <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
              {canalesActivos.map(canal => (
                <div key={canal} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem' }}>
                    {canal === 'whatsapp' ? '💬' : canal === 'instagram' ? '📸' : canal === 'email' ? '📧' : '✈️'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: CANAL_COLORS[canal] || 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
                    {CANAL_LABELS[canal] || canal}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
