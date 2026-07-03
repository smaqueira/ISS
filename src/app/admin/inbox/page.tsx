'use client'
import { useState, useEffect, useRef } from 'react'

interface TelegramMessage {
  id: string
  chat_id: string
  from_name: string
  text: string
  direction: 'in' | 'out'
  is_group: boolean
  created_at: string
}

interface Chat {
  chat_id: string
  from_name: string
  is_group: boolean
  last_message: string
  last_at: string
  unread: number
  messages: TelegramMessage[]
}

export default function InboxPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [selected, setSelected] = useState<Chat | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    const iv = setInterval(load, 10000) // polling cada 10s
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected])

  async function load() {
    const res = await fetch('/api/telegram/messages')
    const data: Chat[] = await res.json()
    setChats(data)
    if (selected) {
      const updated = data.find(c => c.chat_id === selected.chat_id)
      if (updated) setSelected(updated)
    }
    setLoading(false)
  }

  async function send() {
    if (!reply.trim() || !selected || sending) return
    setSending(true)
    await fetch('/api/telegram/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: selected.chat_id, text: reply }),
    })
    setReply('')
    await load()
    setSending(false)
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 40px)', gap: 0, overflow: 'hidden' }}>

      {/* Lista de chats */}
      <div style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            ✈️ Inbox Telegram
            {totalUnread > 0 && <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: '0.7rem', padding: '1px 7px', fontWeight: 700 }}>{totalUnread}</span>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30, fontSize: '0.85rem' }}>Cargando...</div>}
          {!loading && chats.length === 0 && (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30, fontSize: '0.82rem' }}>
              No hay mensajes aún.<br />
              <span style={{ fontSize: '0.75rem' }}>Configurá el webhook para empezar a recibir.</span>
            </div>
          )}
          {chats.map(chat => (
            <div
              key={chat.chat_id}
              onClick={() => setSelected(chat)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: selected?.chat_id === chat.chat_id ? '#f9731610' : 'transparent',
                borderLeft: selected?.chat_id === chat.chat_id ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {chat.is_group ? '👥' : '👤'} {chat.from_name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{formatDate(chat.last_at)}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'space-between' }}>
                <span>{chat.last_message?.slice(0, 35)}{(chat.last_message?.length || 0) > 35 ? '...' : ''}</span>
                {chat.unread > 0 && <span style={{ background: '#25D366', color: 'white', borderRadius: 20, fontSize: '0.65rem', padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>{chat.unread}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversación */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header del chat */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              {selected.is_group ? '👥' : '👤'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selected.from_name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>chat_id: {selected.chat_id}</div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '70%', padding: '8px 12px', borderRadius: msg.direction === 'out' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.direction === 'out' ? 'var(--accent)' : 'var(--surface)',
                  border: msg.direction === 'out' ? 'none' : '1px solid var(--border)',
                  fontSize: '0.87rem', lineHeight: 1.4,
                }}>
                  {msg.direction === 'in' && msg.from_name !== selected.from_name && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 3 }}>{msg.from_name}</div>
                  )}
                  <div>{msg.text}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{formatTime(msg.created_at)}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input de respuesta */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--surface)' }}>
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Escribí tu respuesta..."
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '9px 16px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
            />
            <button onClick={send} disabled={sending || !reply.trim()} style={{
              background: sending || !reply.trim() ? 'var(--border)' : 'var(--accent)',
              color: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40,
              cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer', fontSize: '1.1rem', flexShrink: 0,
            }}>
              {sending ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem' }}>✈️</div>
          <div style={{ fontWeight: 600 }}>Seleccioná una conversación</div>
          <div style={{ fontSize: '0.82rem', textAlign: 'center', maxWidth: 280 }}>
            Los mensajes que recibas en el bot de Telegram van a aparecer acá.
          </div>
        </div>
      )}
    </div>
  )
}
