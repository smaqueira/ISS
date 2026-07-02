'use client'
import { useState, useEffect } from 'react'

const TIPOS = [
  { id: 'flyer', label: '🎯 Flyer de oferta', desc: 'Precio tachado, descuento destacado.', size: '1080x1080' },
  { id: 'story', label: '📱 Historia de Instagram', desc: 'Formato vertical 9:16.', size: '1080x1920' },
  { id: 'whatsapp', label: '💬 Banner para WhatsApp', desc: 'Imagen horizontal para broadcasts.', size: '1280x720' },
  { id: 'showcase', label: '🌟 Showcase de producto', desc: 'Foto elegante sobre fondo neutro.', size: '1080x1080' },
]

export default function ImagesPage() {
  const [products, setProducts] = useState('')
  const [selectedTipo, setSelectedTipo] = useState(TIPOS[0])
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]))
        if (map.COMPANY_LOGO_URL) setLogoUrl(map.COMPANY_LOGO_URL)
      }
    })
  }, [])

  async function generate() {
    if (!products) return
    setLoading(true)
    setImageUrl(null)
    const [w, h] = selectedTipo.size.split('x').map(Number)
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products, tipo: selectedTipo.id, width: w, height: h }),
    })
    const data = await res.json()
    setImageUrl(data.url)
    setLoading(false)
  }

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Generador de imágenes IA</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>Solo poné el producto — la IA hace el resto.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>¿Qué producto querés mostrar?</label>
          <input value={products} onChange={e => setProducts(e.target.value)} placeholder="Ej: salmón fresco, mariscos, atún..." style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>Tipo de imagen</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TIPOS.map(t => (
              <button key={t.id} onClick={() => setSelectedTipo(t)} style={{
                padding: '10px 12px', borderRadius: 10, border: `2px solid ${selectedTipo.id === t.id ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', textAlign: 'left', background: selectedTipo.id === t.id ? 'var(--accent)15' : 'var(--bg)',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 3 }}>{t.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t.desc}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--accent)', marginTop: 4 }}>{t.size}px</div>
              </button>
            ))}
          </div>
        </div>
        <button onClick={generate} disabled={loading || !products} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: '0.95rem' }}>
          {loading ? '🎨 Generando...' : '✨ Generar imagen'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          🎨 Generando imagen, puede tardar 15-20 segundos...
        </div>
      )}

      {imageUrl && !loading && (
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 10 }}>{selectedTipo.label} — {selectedTipo.size}px</div>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <img src={imageUrl} alt="Imagen generada" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
            {logoUrl && (
              <img src={logoUrl} alt="Logo" style={{
                position: 'absolute', bottom: 16, right: 16,
                width: '18%', objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
              }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <a href={imageUrl} download="imagen.jpg" target="_blank" rel="noreferrer" style={{ flex: 1 }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>⬇️ Descargar</button>
            </a>
            <button onClick={generate} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>🔄 Regenerar</button>
          </div>
          {!logoUrl && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 8 }}>Subí tu logo en Configuración para que aparezca en las imágenes.</p>}
        </div>
      )}
    </div>
  )
}
