'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGERENCIAS = [
  '¿Qué hago hoy?',
  '¿Qué clientes tengo que contactar?',
  '¿Cómo van las ventas esta semana?',
  'Redactame un mensaje de seguimiento para un lead',
  '¿Qué leads tienen más chances de cerrar?',
  'Dame ideas para conseguir clientes B2B esta semana',
]

export default function AsistentePage() {
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
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'Sin respuesta.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error al conectar con la IA. Intentá de nuevo.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 750, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>🧠 Asistente IA</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Tu asistente personal. Conoce el negocio, tus clientes y el sistema en tiempo real.
        </p>
      </div>

      {/* Chat */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
        paddingRight: 4, marginBottom: 12,
      }}>

        {/* Bienvenida */}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧠</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>¡Hola Sebastian!</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 24 }}>
              Soy tu asistente. Conozco tus clientes, pedidos y el negocio en tiempo real.<br />
              Preguntame lo que necesites.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGERENCIAS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, border: '1px solid var(--border)',
                    background: 'var(--surface)', cursor: 'pointer', fontSize: '0.82rem',
                    color: 'var(--text)', transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensajes */}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '82%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              fontSize: '0.88rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 16px', borderRadius: '18px 18px 18px 4px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              fontSize: '0.88rem', color: 'var(--muted)',
            }}>
              <span style={{ animation: 'pulse 1s infinite' }}>⏳ Pensando...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Sugerencias rápidas (después de primer mensaje) */}
      {messages.length > 0 && !loading && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
          {['¿Qué hago ahora?', 'Redactame un mensaje', '¿Cómo van los leads?'].map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                padding: '5px 12px', borderRadius: 16, border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, flexShrink: 0,
        padding: '10px 0', borderTop: '1px solid var(--border)',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Preguntame algo sobre el negocio..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 24,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text)', fontSize: '0.88rem', outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn btn-primary"
          style={{ borderRadius: 24, padding: '10px 18px', flexShrink: 0 }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
