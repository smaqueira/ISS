'use client'
import { useState, useEffect } from 'react'

interface Client {
  id: string
  name: string
  phone?: string
  type: string
  status: string
  city?: string
  rubro?: string
  updated_at?: string
  created_at?: string
}

interface BroadcastRecord {
  id: string
  channel: string
  message: string
  grupos_count: number
  sent_at: string
  results: string
}

interface Segment {
  id: string
  label: string
  icon: string
  color: string
  desc: string
  filter: (c: Client, now: Date) => boolean
  promptHint: string
  timing: string
}

const SEGMENTS: Segment[] = [
  {
    id: 'clientes_dormidos',
    label: 'Dormidos',
    icon: '😴',
    color: '#f97316',
    desc: 'Sin contacto hace más de 15 días',
    filter: (c, now) => {
      if (c.status !== 'cliente') return false
      if (!c.updated_at) return true
      const days = (now.getTime() - new Date(c.updated_at).getTime()) / 86400000
      return days > 15
    },
    promptHint: 'mensaje de reactivación, recordarles que existimos, tono cálido y sin presión, mencionar que tenemos producto fresco',
    timing: '🕐 Mejor: jueves o viernes 17-19hs',
  },
  {
    id: 'b2b_gastro',
    label: 'Gastronómicos',
    icon: '🍽️',
    color: '#3b82f6',
    desc: 'Restaurantes, hoteles, catering',
    filter: (c) => c.type === 'b2b',
    promptHint: 'mensaje profesional B2B para restaurantes y gastronómicos, mencionar disponibilidad, calidad y entrega, tono proveedor confiable',
    timing: '🕐 Mejor: lunes a miércoles 10-12hs',
  },
  {
    id: 'b2c_clientes',
    label: 'Clientes',
    icon: '👤',
    color: '#22c55e',
    desc: 'Clientes finales activos',
    filter: (c) => c.type === 'b2c' && c.status === 'cliente',
    promptHint: 'mensaje cercano y apetitoso para consumidores finales, mencionar frescura del producto, facilidad del pedido por WhatsApp',
    timing: '🕐 Mejor: jueves a sábado 17-19hs',
  },
  {
    id: 'prospectos',
    label: 'Prospectos',
    icon: '🔍',
    color: '#a855f7',
    desc: 'Contactos nuevos sin compra aún',
    filter: (c) => c.status === 'nuevo' || c.status === 'contactado' || c.status === 'interesado',
    promptHint: 'primer mensaje comercial para prospectos que todavía no compraron, generar confianza, no presionar, ofrecer una prueba o primera compra',
    timing: '🕐 Mejor: martes a jueves 10-12hs',
  },
  {
    id: 'todos',
    label: 'Todos',
    icon: '👥',
    color: '#64748b',
    desc: 'Todos los contactos con teléfono',
    filter: (c) => !!c.phone,
    promptHint: 'mensaje general de difusión, comunicar novedades o producto del día',
    timing: '🕐 Mejor: cualquier día 17-19hs',
  },
]

const TEMPLATES = [
  { label: '🐟 Producto del día', prompt: 'anuncio de producto fresco recién llegado hoy, generar urgencia y apetito' },
  { label: '📦 Novedad', prompt: 'anuncio de un producto nuevo que acabamos de incorporar al catálogo' },
  { label: '😴 Reactivación', prompt: 'mensaje para cliente que no compró hace tiempo, recordarles que existimos con algo atractivo' },
  { label: '🎉 Fin de semana', prompt: 'oferta especial de fin de semana, mariscos para el asado o cena del sábado' },
  { label: '📣 Canal WA', prompt: 'invitación a seguir el canal de WhatsApp para recibir ofertas diarias' },
]

export default function BroadcastPage() {
  const [canal, setCanal] = useState<'whatsapp' | 'telegram'>('whatsapp')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedSegment, setSelectedSegment] = useState<Segment>(SEGMENTS[0])
  const [message, setMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [idea, setIdea] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ enviados: number; total: number } | null>(null)
  const [tgGrupos, setTgGrupos] = useState<{ id: string; title: string }[]>([])
  const [tgConnected, setTgConnected] = useState(false)
  const [history, setHistory] = useState<BroadcastRecord[]>([])
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [catalogUrl, setCatalogUrl] = useState('')

  const now = new Date()

  useEffect(() => {
    setCatalogUrl(window.location.origin + '/catalogo')
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d || []))
    fetch('/api/telegram/status').then(r => r.json()).then(d => setTgConnected(d.connected))
    fetch('/api/grupos').then(r => r.json()).then(d => {
      setTgGrupos((d || []).filter((g: { platform: string; status: string }) => g.platform === 'telegram' && g.status === 'en_grupo'))
    })
    fetch('/api/telegram/bot/broadcast').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
  }, [])

  const filtered = clients.filter(c => !!c.phone && selectedSegment.filter(c, now))

  async function generate(customPrompt?: string) {
    setGenerating(true)
    const promptHint = customPrompt || (idea ? idea : selectedSegment.promptHint)
    if (canal === 'telegram') {
      const res = await fetch('/api/telegram/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewOnly: true, idea: promptHint }),
      })
      const d = await res.json()
      setMessage(d.mensaje || '')
    } else {
      const res = await fetch('/api/ai/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: promptHint,
          tipo: selectedSegment.id === 'b2b_gastro' ? 'b2b' : 'b2c',
          catalogUrl,
          segmento: selectedSegment.label,
        }),
      })
      const d = await res.json()
      setMessage(d.message || '')
    }
    setGenerating(false)
  }

  function personalize(msg: string, client: Client): string {
    const nombre = client.name.split(' ')[0]
    return msg.replace(/\{nombre\}/gi, nombre).replace(/\{name\}/gi, nombre)
  }

  function openWhatsApp(c: Client) {
    const msg = personalize(message, c)
    window.open(`https://wa.me/${c.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    setSentIds(prev => new Set([...prev, c.id]))
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

  const inputStyle = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', width: '100%',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>📣 Broadcast</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
          Mensajes masivos inteligentes segmentados por tipo de cliente
        </p>
      </div>

      {/* Selector canal */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', maxWidth: 300 }}>
        {([['whatsapp', '💬 WhatsApp', '#25D366'], ['telegram', '✈️ Telegram', '#0088cc']] as const).map(([c, label, color]) => (
          <button key={c} onClick={() => { setCanal(c); setMessage('') }}
            style={{
              flex: 1, padding: '10px 8px', border: 'none',
              borderRight: c === 'whatsapp' ? '1px solid var(--border)' : 'none',
              background: canal === c ? `${color}20` : 'var(--surface)',
              color: canal === c ? color : 'var(--muted)',
              fontWeight: canal === c ? 700 : 400, fontSize: '0.85rem', cursor: 'pointer',
            }}>
            {label}
          </button>
        ))}
      </div>

      {canal === 'whatsapp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Paso 1: Segmento */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>1. ¿A quién le escribís?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SEGMENTS.map(seg => (
                <button
                  key={seg.id}
                  onClick={() => { setSelectedSegment(seg); setMessage('') }}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: selectedSegment.id === seg.id ? `${seg.color}20` : 'var(--bg)',
                    borderLeft: `3px solid ${selectedSegment.id === seg.id ? seg.color : 'transparent'}`,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{seg.icon}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: selectedSegment.id === seg.id ? seg.color : 'var(--text)' }}>
                    {seg.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{seg.desc}</div>
                </button>
              ))}
            </div>

            {/* Stats del segmento */}
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: `${selectedSegment.color}10`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: '0.85rem' }}>
                <strong style={{ color: selectedSegment.color }}>{filtered.length} contactos</strong>
                <span style={{ color: 'var(--muted)' }}> en este segmento</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {selectedSegment.timing}
              </div>
            </div>
          </div>

          {/* Paso 2: Mensaje */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>2. Mensaje</div>

            {/* Templates rápidos */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 6 }}>Templates rápidos:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => generate(t.prompt)}
                    disabled={generating}
                    style={{
                      padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer',
                      fontSize: '0.78rem', transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="O describí qué querés comunicar (opcional)..."
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <button
              onClick={() => generate()}
              disabled={generating}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--accent)', color: 'white', fontWeight: 600,
                fontSize: '0.9rem', marginBottom: 14,
              }}
            >
              {generating ? '✨ Generando...' : `✨ Generar para "${selectedSegment.label}"`}
            </button>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="El mensaje aparecerá acá. Podés usar {nombre} y se reemplaza automáticamente."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
            {message && (
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>
                💡 Usá <code style={{ background: 'var(--bg)', padding: '1px 4px', borderRadius: 3 }}>{'{nombre}'}</code> para personalizar con el nombre de cada contacto
              </div>
            )}
          </div>

          {/* Paso 3: Enviar */}
          {message && filtered.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>3. Enviá</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 14 }}>
                {selectedSegment.timing} · Hacé click en cada contacto para abrir WhatsApp con el mensaje listo
              </div>

              <button
                onClick={() => filtered.slice(0, 10).forEach((c, i) => setTimeout(() => openWhatsApp(c), i * 900))}
                style={{
                  width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#25D366', color: 'white', fontWeight: 700, fontSize: '0.95rem',
                  marginBottom: 12,
                }}
              >
                📣 Abrir primeros {Math.min(filtered.length, 10)} en WhatsApp
              </button>

              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map(c => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 8,
                      background: sentIds.has(c.id) ? '#22c55e10' : 'var(--bg)',
                      border: `1px solid ${sentIds.has(c.id) ? '#22c55e30' : 'var(--border)'}`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {sentIds.has(c.id) && <span style={{ color: '#22c55e', marginRight: 4 }}>✓</span>}
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {c.phone} {c.city ? `· ${c.city}` : ''} {c.rubro ? `· ${c.rubro}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => openWhatsApp(c)}
                      style={{
                        background: sentIds.has(c.id) ? '#22c55e20' : '#25D36620',
                        color: sentIds.has(c.id) ? '#22c55e' : '#25D366',
                        border: `1px solid ${sentIds.has(c.id) ? '#22c55e40' : '#25D36640'}`,
                        borderRadius: 7, padding: '6px 14px', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 600,
                      }}
                    >
                      {sentIds.has(c.id) ? '✓ Enviado' : '💬 Enviar'}
                    </button>
                  </div>
                ))}
              </div>

              {sentIds.size > 0 && (
                <div style={{
                  marginTop: 12, padding: '8px 14px', borderRadius: 8,
                  background: '#22c55e15', fontSize: '0.82rem', color: '#22c55e', textAlign: 'center',
                }}>
                  ✅ {sentIds.size} mensaje{sentIds.size !== 1 ? 's' : ''} abierto{sentIds.size !== 1 ? 's' : ''} en WhatsApp
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TELEGRAM */}
      {canal === 'telegram' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!tgConnected && (
            <div style={{
              background: '#0088cc15', border: '1px solid #0088cc40', borderRadius: 10,
              padding: '12px 16px', fontSize: '0.85rem',
            }}>
              ✈️ Necesitás conectar la cuenta MTProto en{' '}
              <a href="/admin/telegram" style={{ color: '#0088cc', fontWeight: 600 }}>Admin → Telegram</a>.
            </div>
          )}

          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>
              Grupos donde estás ({tgGrupos.length})
            </div>
            {tgGrupos.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                No hay grupos de Telegram con estado "en el grupo". Sumá grupos en{' '}
                <a href="/admin/grupos" style={{ color: '#0088cc' }}>Grupos B2C → Telegram</a>.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tgGrupos.map(g => (
                  <span key={g.id} style={{
                    background: '#0088cc15', color: '#0088cc',
                    borderRadius: 16, padding: '3px 10px', fontSize: '0.75rem',
                  }}>
                    ✈️ {g.title}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Mensaje del día</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => generate(t.prompt)}
                  disabled={generating}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.78rem',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="¿Algo especial hoy? (opcional)"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <button
              onClick={() => generate()}
              disabled={generating}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#0088cc', color: 'white', fontWeight: 600, marginBottom: 14,
              }}
            >
              {generating ? '✨ Generando...' : '✨ Generar con IA'}
            </button>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="Vitto va a generar un mensaje vendedor con el catálogo del día."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>

          {message && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
              {sendResult && (
                <div style={{
                  background: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 12, fontSize: '0.85rem', color: '#22c55e',
                }}>
                  ✅ Publicado en {sendResult.enviados}/{sendResult.total} grupos
                </div>
              )}
              <button
                onClick={sendTelegram}
                disabled={sending || tgGrupos.length === 0 || !tgConnected}
                style={{
                  width: '100%', background: '#0088cc', color: '#fff', border: 'none',
                  borderRadius: 10, padding: 13, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700,
                }}
              >
                {sending ? 'Publicando...' : `✈️ Publicar en ${tgGrupos.length} grupos`}
              </button>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Historial</div>
              {history.map(h => (
                <div key={h.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {new Date(h.sent_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', background: '#0088cc20', color: '#0088cc',
                      borderRadius: 10, padding: '1px 8px',
                    }}>
                      {h.grupos_count} grupos
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {h.message}
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
