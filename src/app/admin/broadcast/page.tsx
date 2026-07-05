'use client'
import { useState, useEffect } from 'react'

type Canal = 'whatsapp' | 'telegram'

interface Client {
  id: string; name: string; phone?: string; type: string; status: string; city?: string
}

interface BroadcastRecord {
  id: string; channel: string; message: string; grupos_count: number; sent_at: string
  results: string
}

export default function BroadcastPage() {
  const [canal, setCanal] = useState<Canal>('whatsapp')

  // WhatsApp state
  const [clients, setClients] = useState<Client[]>([])
  const [filterType, setFilterType] = useState<'todos' | 'b2b' | 'b2c'>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('cliente')
  const [catalogUrl, setCatalogUrl] = useState('')

  // Shared
  const [message, setMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [idea, setIdea] = useState('')

  // Telegram state
  const [tgGrupos, setTgGrupos] = useState<{ id: string; title: string; zona: string }[]>([])
  const [tgConnected, setTgConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ enviados: number; total: number } | null>(null)
  const [history, setHistory] = useState<BroadcastRecord[]>([])

  useEffect(() => {
    setCatalogUrl(window.location.origin + '/catalogo')
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d || []))
    fetch('/api/telegram/status').then(r => r.json()).then(d => setTgConnected(d.connected))
    fetch('/api/grupos').then(r => r.json()).then(d => {
      setTgGrupos((d || []).filter((g: { platform: string; status: string }) => g.platform === 'telegram' && g.status === 'en_grupo'))
    })
    fetch('/api/telegram/bot/broadcast').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
  }, [])

  const filtered = clients.filter(c => {
    if (filterType !== 'todos' && c.type !== filterType) return false
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false
    return !!c.phone
  })

  async function generate() {
    setGenerating(true)
    if (canal === 'telegram') {
      const res = await fetch('/api/telegram/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewOnly: true, idea }),
      })
      const d = await res.json()
      setMessage(d.mensaje || '')
    } else {
      const res = await fetch('/api/ai/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, tipo: filterType, catalogUrl }),
      })
      const d = await res.json()
      setMessage(d.message || '')
    }
    setGenerating(false)
  }

  async function sendTelegram() {
    setSending(true); setSendResult(null)
    const res = await fetch('/api/telegram/bot/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    const d = await res.json()
    setSendResult({ enviados: d.enviados, total: d.total })
    fetch('/api/telegram/bot/broadcast').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
    setSending(false)
  }

  function openWhatsApp(c: Client) {
    window.open(`https://wa.me/${c.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const chip = (active: boolean, color = 'var(--accent)') => ({
    padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem',
    background: active ? color : 'var(--bg)', color: active ? '#fff' : 'var(--text)',
  })

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Broadcast</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 20 }}>
        Generá un mensaje con IA y publicalo en grupos o contactos.
      </p>

      {/* Selector de canal */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', maxWidth: 340 }}>
        <button onClick={() => { setCanal('whatsapp'); setMessage('') }}
          style={{ flex: 1, padding: '10px 8px', border: 'none', borderRight: '1px solid var(--border)',
            background: canal === 'whatsapp' ? '#25D36620' : 'var(--surface)', color: canal === 'whatsapp' ? '#25D366' : 'var(--muted)',
            fontWeight: canal === 'whatsapp' ? 700 : 400, fontSize: '0.85rem', cursor: 'pointer' }}>
          💬 WhatsApp
        </button>
        <button onClick={() => { setCanal('telegram'); setMessage('') }}
          style={{ flex: 1, padding: '10px 8px', border: 'none',
            background: canal === 'telegram' ? '#0088cc20' : 'var(--surface)', color: canal === 'telegram' ? '#0088cc' : 'var(--muted)',
            fontWeight: canal === 'telegram' ? 700 : 400, fontSize: '0.85rem', cursor: 'pointer' }}>
          ✈️ Telegram
        </button>
      </div>

      {/* WHATSAPP */}
      {canal === 'whatsapp' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>1. Público</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {(['todos', 'b2c', 'b2b'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={chip(filterType === t)}>
                  {t === 'todos' ? '👥 Todos' : t === 'b2c' ? '👤 B2C' : '🏪 B2B'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['todos', 'cliente', 'contactado', 'interesado'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={chip(filterStatus === s)}>
                  {s === 'todos' ? 'Todos' : s}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--muted)' }}>
              📱 <strong style={{ color: 'var(--text)' }}>{filtered.length} contactos</strong> con teléfono
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>2. Mensaje</div>
            <input value={idea} onChange={e => setIdea(e.target.value)} placeholder="¿Qué querés comunicar? (opcional)" style={{ ...inputStyle, marginBottom: 10 }} />
            <button onClick={generate} disabled={generating} className="btn btn-primary" style={{ marginBottom: 14 }}>
              {generating ? '✨ Generando...' : '✨ Generar con IA'}
            </button>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
              placeholder="El mensaje aparecerá acá. También podés escribir directamente."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>

          {message && filtered.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 12 }}>3. Enviá</div>
              <button onClick={() => filtered.slice(0, 10).forEach((c, i) => setTimeout(() => openWhatsApp(c), i * 800))}
                className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, marginBottom: 10 }}>
                📣 Abrir primeros {Math.min(filtered.length, 10)} en WhatsApp
              </button>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {filtered.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{c.phone}</div>
                    </div>
                    <button onClick={() => openWhatsApp(c)} style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36640', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                      💬 Enviar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* TELEGRAM */}
      {canal === 'telegram' && (
        <>
          {!tgConnected && (
            <div className="card" style={{ background: '#0088cc15', border: '1px solid #0088cc40', marginBottom: 16, fontSize: '0.85rem' }}>
              ✈️ Necesitás conectar la cuenta MTProto en <a href="/admin/telegram" style={{ color: '#0088cc', fontWeight: 600 }}>Admin → Telegram</a>.
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Grupos donde estás ({tgGrupos.length})</div>
            {tgGrupos.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                No hay grupos de Telegram con estado "en el grupo". Sumá grupos en <a href="/admin/grupos" style={{ color: '#0088cc' }}>Grupos B2C → Telegram</a>.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tgGrupos.map(g => (
                  <span key={g.id} style={{ background: '#0088cc15', color: '#0088cc', borderRadius: 16, padding: '3px 10px', fontSize: '0.75rem' }}>
                    ✈️ {g.title}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Mensaje del día</div>
            <input value={idea} onChange={e => setIdea(e.target.value)} placeholder="¿Algo especial hoy? (opcional, si no Vitto genera la oferta del día)" style={{ ...inputStyle, marginBottom: 10 }} />
            <button onClick={generate} disabled={generating} className="btn btn-primary" style={{ marginBottom: 14, background: '#0088cc', border: 'none' }}>
              {generating ? '✨ Generando...' : '✨ Generar oferta del día con Vitto'}
            </button>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
              placeholder="Vitto va a generar un mensaje vendedor con el catálogo del día. También podés escribir el tuyo."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          {message && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Publicar en {tgGrupos.length} grupos</div>
              {sendResult && (
                <div style={{ background: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '0.85rem', color: '#22c55e' }}>
                  ✅ Publicado en {sendResult.enviados}/{sendResult.total} grupos
                </div>
              )}
              <button onClick={sendTelegram} disabled={sending || tgGrupos.length === 0 || !tgConnected}
                style={{ width: '100%', background: '#0088cc', color: '#fff', border: 'none', borderRadius: 10, padding: 13, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700 }}>
                {sending ? 'Publicando...' : `✈️ Publicar ahora en ${tgGrupos.length} grupos`}
              </button>
            </div>
          )}

          {history.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Historial</div>
              {history.map(h => (
                <div key={h.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {new Date(h.sent_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span style={{ fontSize: '0.75rem', background: '#0088cc20', color: '#0088cc', borderRadius: 10, padding: '1px 8px' }}>
                      {h.grupos_count} grupos
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{h.message}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
