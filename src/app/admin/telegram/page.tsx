'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Tab = 'conexion' | 'chats' | 'buscar'
type ConnectStep = 'idle' | 'phone' | 'code' | 'done'

interface Chat { id: string; name: string; type: 'user' | 'group' | 'channel'; unreadCount: number }
interface Msg  { id: string; text: string; date: number; out: boolean }
interface Group { id: string; title: string; type: string; username: string | null; link: string | null; participantsCount: number | null }

const TG = '#0088cc'
const tgBg = '#0088cc15'

export default function TelegramPage() {
  const [tab, setTab] = useState<Tab>('conexion')
  const [status, setStatus] = useState<{ connected: boolean; phone?: string; name?: string } | null>(null)
  const [step, setStep] = useState<ConnectStep>('idle')
  const [phone, setPhone] = useState('+54')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [chats, setChats] = useState<Chat[]>([])
  const [selChat, setSelChat] = useState<Chat | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [reply, setReply] = useState('')
  const [sendBusy, setSendBusy] = useState(false)
  const msgsEnd = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [searching, setSearching] = useState(false)

  const loadStatus = useCallback(async () => {
    const r = await fetch('/api/telegram/status')
    const d = await r.json()
    setStatus(d)
    if (d.connected) setStep('done')
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function sendPhone() {
    setBusy(true); setErr('')
    const r = await fetch('/api/telegram/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
    const d = await r.json()
    if (d.ok) setStep('code')
    else setErr(d.error || 'Error enviando código')
    setBusy(false)
  }

  async function sendCode() {
    setBusy(true); setErr('')
    const r = await fetch('/api/telegram/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
    const d = await r.json()
    if (d.ok) { setStep('done'); loadStatus() }
    else setErr(d.error || 'Código incorrecto')
    setBusy(false)
  }

  async function disconnect() {
    setBusy(true)
    await fetch('/api/telegram/disconnect', { method: 'POST' })
    setStep('idle'); setStatus({ connected: false }); setChats([]); setSelChat(null); setMsgs([])
    setBusy(false)
  }

  async function loadChats() {
    const r = await fetch('/api/telegram/chats')
    if (r.ok) setChats(await r.json())
  }

  async function loadMsgs(chat: Chat) {
    setSelChat(chat); setMsgs([])
    const r = await fetch(`/api/telegram/messages?chatId=${chat.id}&type=${chat.type}`)
    if (r.ok) { const d = await r.json(); setMsgs(d) }
    setTimeout(() => msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  useEffect(() => {
    if (tab === 'chats' && status?.connected) loadChats()
  }, [tab, status?.connected])

  async function doSend() {
    if (!reply.trim() || !selChat) return
    setSendBusy(true)
    await fetch('/api/telegram/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: selChat.id, type: selChat.type, text: reply }),
    })
    setReply(''); loadMsgs(selChat)
    setSendBusy(false)
  }

  async function searchGroups() {
    if (!query.trim()) return
    setSearching(true); setGroups([])
    const r = await fetch(`/api/telegram/search?q=${encodeURIComponent(query)}`)
    if (r.ok) setGroups(await r.json())
    setSearching(false)
  }

  const chip = (active: boolean) => ({
    padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem',
    background: active ? TG : 'var(--bg)', color: active ? '#fff' : 'var(--text)', fontWeight: active ? 600 : 400,
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Telegram</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginBottom: 16 }}>
        Chat embebido con MTProto — el número de empresa no necesita la app de Telegram instalada.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['conexion', 'chats', 'buscar'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={chip(tab === t)}>
            {t === 'conexion' ? '🔗 Conexión' : t === 'chats' ? '💬 Chats' : '🔍 Buscar grupos'}
          </button>
        ))}
      </div>

      {/* CONEXIÓN */}
      {tab === 'conexion' && (
        <div className="card" style={{ maxWidth: 480 }}>
          {step === 'done' && status?.connected ? (
            <>
              <div style={{ background: tgBg, border: `1px solid ${TG}40`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: TG, marginBottom: 4 }}>✅ Conectado</div>
                <div style={{ fontSize: '0.85rem' }}>{status.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{status.phone}</div>
              </div>
              <button onClick={disconnect} disabled={busy} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem' }}>
                {busy ? 'Desconectando...' : '🔌 Desconectar'}
              </button>
            </>
          ) : step === 'code' ? (
            <>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
                Telegram te envió un código al número <strong>{phone}</strong>. Ingresalo abajo.
              </div>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="12345"
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '1rem', letterSpacing: 4, textAlign: 'center', marginBottom: 12 }} />
              {err && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 8 }}>{err}</div>}
              <button onClick={sendCode} disabled={busy || !code} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {busy ? 'Verificando...' : '✅ Verificar código'}
              </button>
              <button onClick={() => setStep('phone')} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                ← Cambiar número
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
                Ingresá el número de teléfono de la empresa (con código de país).
              </div>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 9 11 1234 5678"
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.95rem', marginBottom: 12 }} />
              {err && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 8 }}>{err}</div>}
              <button onClick={sendPhone} disabled={busy || phone.length < 8} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {busy ? 'Enviando...' : '📲 Enviar código'}
              </button>
            </>
          )}
        </div>
      )}

      {/* CHATS */}
      {tab === 'chats' && (
        !status?.connected ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            Primero conectá una cuenta en la pestaña Conexión.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12, height: 'calc(100vh - 220px)', minHeight: 400 }}>
            {/* Lista de chats */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Conversaciones
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {chats.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center' }}>Cargando chats...</div>
                ) : chats.map(c => (
                  <div key={c.id} onClick={() => loadMsgs(c)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      background: selChat?.id === c.id ? tgBg : 'transparent',
                      borderLeft: selChat?.id === c.id ? `3px solid ${TG}` : '3px solid transparent' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                      {c.type === 'user' ? '👤' : c.type === 'group' ? '👥' : '📢'} {c.type}
                      {c.unreadCount > 0 && <span style={{ marginLeft: 6, background: TG, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '0.65rem' }}>{c.unreadCount}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel de mensajes */}
            <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!selChat ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Seleccioná una conversación
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.9rem' }}>
                    {selChat.name}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {msgs.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.out ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%', background: m.out ? TG : 'var(--card)', color: m.out ? '#fff' : 'var(--text)',
                          borderRadius: m.out ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          padding: '8px 12px', fontSize: '0.85rem',
                          border: m.out ? 'none' : '1px solid var(--border)',
                        }}>
                          {m.text}
                          <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                            {new Date(m.date * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={msgsEnd} />
                  </div>
                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                    <input value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && doSend()}
                      placeholder="Escribí un mensaje..." style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem' }} />
                    <button onClick={doSend} disabled={sendBusy || !reply.trim()} style={{ background: TG, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                      {sendBusy ? '...' : '➤'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* BUSCAR GRUPOS */}
      {tab === 'buscar' && (
        !status?.connected ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            Primero conectá una cuenta en la pestaña Conexión.
          </div>
        ) : (
          <div>
            <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchGroups()}
                placeholder="Ej: pescaderia palermo, vecinos belgrano..."
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }} />
              <button onClick={searchGroups} disabled={searching || !query.trim()} className="btn btn-primary">
                {searching ? 'Buscando...' : '🔍 Buscar'}
              </button>
            </div>

            {groups.length > 0 && groups.map(g => (
              <div key={g.id} className="card" style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ background: tgBg, color: TG, borderRadius: 8, padding: '8px 10px', fontSize: '1.2rem', flexShrink: 0 }}>
                  {g.type === 'canal' ? '📢' : '👥'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {g.type}{g.participantsCount ? ` · ${g.participantsCount.toLocaleString()} miembros` : ''}
                  </div>
                  {g.username && <div style={{ fontSize: '0.72rem', color: TG }}>@{g.username}</div>}
                </div>
                {g.link && (
                  <a href={g.link} target="_blank" rel="noreferrer">
                    <button style={{ background: tgBg, color: TG, border: `1px solid ${TG}40`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      ✈️ Abrir
                    </button>
                  </a>
                )}
              </div>
            ))}

            {groups.length === 0 && !searching && query && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 30, fontSize: '0.85rem' }}>
                No se encontraron grupos. Probá con otro término.
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
