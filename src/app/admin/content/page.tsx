'use client'
import { useState } from 'react'

type ContentType = 'post' | 'story' | 'reel'
type BroadcastType = 'viernes' | 'quincena' | 'reactivar'

interface Generated { idea?: string; caption?: string; hashtags?: string[]; text?: string }

export default function ContentPage() {
  const [products, setProducts] = useState('')
  const [contentType, setContentType] = useState<ContentType>('post')
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('viernes')
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Generated | null>(null)
  const [tab, setTab] = useState<'instagram' | 'broadcast'>('instagram')

  async function generate() {
    setLoading(true)
    setResult(null)
    const endpoint = tab === 'instagram' ? 'instagram' : 'broadcast'
    const body = tab === 'instagram'
      ? { type: endpoint, products: products.split(',').map(p => p.trim()), content_type: contentType }
      : { type: endpoint, products: products.split(',').map(p => p.trim()), broadcast_type: broadcastType, client_name: clientName }

    const res = await fetch('/api/ai/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  const tabStyle = (t: string) => ({
    padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', border: 'none',
    background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'white' : 'var(--muted)',
  })

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Contenido IA</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>Generá posts para Instagram o mensajes de broadcast con un click.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('instagram')} onClick={() => setTab('instagram')}>📸 Instagram</button>
        <button style={tabStyle('broadcast')} onClick={() => setTab('broadcast')}>📢 Broadcast WhatsApp</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>
            Productos/servicios disponibles (separados por coma)
          </label>
          <input value={products} onChange={e => setProducts(e.target.value)} placeholder="Producto 1, Producto 2, Producto 3"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }} />
        </div>

        {tab === 'instagram' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Formato</label>
            <select value={contentType} onChange={e => setContentType(e.target.value as ContentType)}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }}>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="reel">Reel</option>
            </select>
          </div>
        )}

        {tab === 'broadcast' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Tipo de mensaje</label>
              <select value={broadcastType} onChange={e => setBroadcastType(e.target.value as BroadcastType)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }}>
                <option value="viernes">Viernes — novedades del finde</option>
                <option value="quincena">Quincena — oferta especial</option>
                <option value="reactivar">Reactivar cliente inactivo</option>
              </select>
            </div>
            {broadcastType === 'reactivar' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Nombre del cliente</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Juan"
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }} />
              </div>
            )}
          </>
        )}

        <button onClick={generate} disabled={loading || !products} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          {loading ? '🤖 Generando...' : '✨ Generar con IA'}
        </button>
      </div>

      {result && (
        <div className="card">
          {result.idea && <><div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>IDEA VISUAL</div><p style={{ marginBottom: 16, fontSize: '0.9rem' }}>{result.idea}</p></>}
          {result.caption && <><div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>CAPTION</div><p style={{ marginBottom: 16, fontSize: '0.9rem', lineHeight: 1.6 }}>{result.caption}</p></>}
          {result.hashtags && <><div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>HASHTAGS</div><p style={{ color: '#3b82f6', fontSize: '0.85rem' }}>{result.hashtags.map((h: string) => `#${h}`).join(' ')}</p></>}
          {result.text && <><div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>MENSAJE WHATSAPP</div><p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{result.text}</p></>}
        </div>
      )}
    </div>
  )
}
