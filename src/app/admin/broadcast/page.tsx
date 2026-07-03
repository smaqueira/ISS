'use client'
import { useState, useEffect } from 'react'

interface Client {
  id: string
  name: string
  phone?: string
  type: string
  status: string
  city?: string
}

export default function BroadcastPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filterType, setFilterType] = useState<'todos' | 'b2b' | 'b2c'>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('cliente')
  const [message, setMessage] = useState('')
  const [catalogUrl, setCatalogUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [idea, setIdea] = useState('')

  useEffect(() => {
    setCatalogUrl(window.location.origin + '/catalogo')
    fetch('/api/clients').then(r => r.json()).then(data => setClients(data || []))
  }, [])

  const filtered = clients.filter(c => {
    if (filterType !== 'todos' && c.type !== filterType) return false
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false
    return !!c.phone
  })

  async function generate() {
    setGenerating(true)
    const res = await fetch('/api/ai/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, tipo: filterType, catalogUrl }),
    })
    const data = await res.json()
    setMessage(data.message || '')
    setGenerating(false)
  }

  function openWhatsApp(client: Client) {
    const url = `https://wa.me/${client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  function openAll() {
    const withPhone = filtered.slice(0, 10)
    withPhone.forEach((c, i) => setTimeout(() => openWhatsApp(c), i * 800))
  }

  const chipStyle = (active: boolean) => ({
    padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem',
    background: active ? 'var(--accent)' : 'var(--bg)', color: active ? 'white' : 'var(--text)',
  })
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Broadcast</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Generá un mensaje con IA y envialo a todos tus contactos por WhatsApp.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>1. Seleccioná el público</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['todos', 'b2c', 'b2b'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={chipStyle(filterType === t)}>
              {t === 'todos' ? '👥 Todos' : t === 'b2c' ? '👤 Particulares (B2C)' : '🏪 Negocios (B2B)'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['todos', 'cliente', 'contactado', 'interesado', 'nuevo'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={chipStyle(filterStatus === s)}>
              {s === 'todos' ? 'Todos los estados' : s}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>
          📱 <strong style={{ color: 'var(--text)' }}>{filtered.length} contactos</strong> con teléfono van a recibir este mensaje
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>2. Generá el mensaje con IA</div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>¿Qué querés comunicar? (opcional)</label>
          <input value={idea} onChange={e => setIdea(e.target.value)} placeholder="Ej: promoción de fin de semana, producto nuevo, descuento especial..." style={inputStyle} />
        </div>
        <button onClick={generate} disabled={generating} className="btn btn-primary" style={{ marginBottom: 14 }}>
          {generating ? '✨ Generando...' : '✨ Generar mensaje con IA'}
        </button>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Mensaje (podés editarlo)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={6}
            placeholder="El mensaje generado por IA aparecerá acá. También podés escribir directamente."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>
        {message && (
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 6 }}>
            {message.length} caracteres · {message.split('\n').length} líneas
          </div>
        )}
      </div>

      {message && filtered.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>3. Enviá</div>

          <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.78rem', color: '#f59e0b' }}>
            💡 WhatsApp no permite envío masivo automático. Abrí cada contacto de a uno o usá el botón de abrir todos (abre hasta 10 a la vez con 0.8s de intervalo).
          </div>

          <div style={{ marginBottom: 14 }}>
            <button onClick={openAll} disabled={!message} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: '0.95rem', marginBottom: 10 }}>
              📣 Abrir primeros {Math.min(filtered.length, 10)} contactos en WhatsApp
            </button>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center' }}>
              Si tenés más de 10, repetí el proceso filtrando por zona o estado
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{c.phone} · {c.city || 'sin zona'}</div>
                </div>
                <button onClick={() => openWhatsApp(c)} style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36640', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  💬 Enviar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
