'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGERENCIAS = [
  '¿Qué hago ahora?',
  '¿Qué clientes contactar hoy?',
  'Redactame un mensaje de seguimiento',
  '¿Cómo van los leads?',
]

export default function AsistenteWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const content = text || input.trim()
    if (!content || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(m => [...m, { role: 'assistant', content: `❌ ${data.error || `Error ${res.status}`}` }])
      } else {
        const actions: string[] = data.actions || []
        // Limpiar cualquier XML de tool calls que el modelo haya incluido en el texto
        const reply = (data.reply || '').replace(/<function>[\s\S]*?<\/function>/g, '').trim()
        const actionsText = actions.length ? `\n\n${actions.join('\n')}` : ''
        const content = reply + actionsText || 'Acción completada.'
        setMessages(m => [...m, { role: 'assistant', content }])
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `❌ Error al conectar: ${e}` }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? 'var(--surface)' : 'var(--accent)',
          border: '2px solid var(--accent)',
          cursor: 'pointer', fontSize: '1.4rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Asistente IA"
      >
        {open ? '✕' : '🧠'}
      </button>

      {/* Drawer */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 998,
          width: 360, height: 520,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontSize: '1.2rem' }}>🧠</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Asistente IA</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Datos en tiempo real</div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem' }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {messages.length === 0 && (
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 10 }}>Sugerencias:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGERENCIAS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg)', cursor: 'pointer', fontSize: '0.8rem',
                        color: 'var(--text)', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%', padding: '8px 12px', fontSize: '0.82rem', lineHeight: 1.6,
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '8px 12px', borderRadius: '14px 14px 14px 4px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  fontSize: '0.8rem', color: 'var(--muted)',
                }}>
                  ⏳ Pensando...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Preguntame algo..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 20,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: '0.82rem', outline: 'none',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                padding: '8px 14px', borderRadius: 20, border: 'none',
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--border)',
                color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontSize: '0.82rem', fontWeight: 600, flexShrink: 0,
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
