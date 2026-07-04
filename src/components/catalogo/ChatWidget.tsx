'use client'
import { useState, useRef, useEffect } from 'react'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget({ companyName }: { companyName?: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, typing, open])

  async function send() {
    const text = input.trim()
    if (!text || typing) return
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setInput('')
    setTyping(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'assistant', content: data.reply || 'Consultanos por WhatsApp 🙌' }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'No pude responder. Escribinos por WhatsApp 🙌' }])
    }
    setTyping(false)
  }

  const accent = '#f97316'

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 100,
            background: accent, color: 'white', border: 'none', borderRadius: '50%',
            width: 58, height: 58, fontSize: '1.5rem', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
          💬
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 100,
          width: 'min(360px, calc(100vw - 40px))', height: 480,
          background: '#1e2433', border: '1px solid #2d3748', borderRadius: 16,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{ background: accent, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>💬 {companyName || 'Asistente'}</div>
              <div style={{ color: '#ffffffcc', fontSize: '0.7rem' }}>Preguntá por productos y precios</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', marginTop: 20 }}>
                👋 ¡Hola! Preguntame por los productos, precios o cómo hacer tu pedido.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                background: m.role === 'user' ? accent : '#2d3748',
                color: m.role === 'user' ? 'white' : '#e2e8f0',
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding: '9px 13px', fontSize: '0.84rem', lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}
            {typing && (
              <div style={{ alignSelf: 'flex-start', background: '#2d3748', color: '#94a3b8', borderRadius: 14, padding: '9px 13px', fontSize: '0.84rem' }}>
                escribiendo...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #2d3748', padding: 10, display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="Escribí tu consulta..."
              style={{ flex: 1, background: '#0f1117', border: '1px solid #2d3748', borderRadius: 10, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' }}
            />
            <button onClick={send} disabled={typing || !input.trim()}
              style={{ background: accent, color: 'white', border: 'none', borderRadius: 10, padding: '0 16px', cursor: 'pointer', fontWeight: 700, opacity: typing || !input.trim() ? 0.5 : 1 }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
