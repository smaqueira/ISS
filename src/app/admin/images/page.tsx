'use client'
import { useState } from 'react'

const TIPOS = [
  {
    id: 'flyer',
    label: '🎯 Flyer de oferta',
    desc: 'Precio tachado, descuento destacado. Ideal para post de Instagram.',
    size: '1080x1080',
    prompt: (products: string, detail: string) =>
      `Commercial promotional flyer for ${products}. Bold discount offer, price crossed out, new price highlighted. Professional product photography, vibrant colors, clean modern design, Argentine market style. ${detail}`,
  },
  {
    id: 'story',
    label: '📱 Historia de Instagram',
    desc: 'Formato vertical 9:16. Diseño llamativo para stories.',
    size: '1080x1920',
    prompt: (products: string, detail: string) =>
      `Instagram story vertical format for ${products}. Eye-catching design, swipe up call to action, bold typography, gradient background, mobile-first layout. ${detail}`,
  },
  {
    id: 'whatsapp',
    label: '💬 Banner para WhatsApp',
    desc: 'Imagen horizontal para mandar en broadcasts.',
    size: '1280x720',
    prompt: (products: string, detail: string) =>
      `WhatsApp promotional banner for ${products}. Horizontal layout, clear message, product image on right, text on left, professional clean design, friendly tone. ${detail}`,
  },
  {
    id: 'showcase',
    label: '🌟 Showcase de producto',
    desc: 'Imagen elegante del producto sobre fondo neutro.',
    size: '1080x1080',
    prompt: (products: string, detail: string) =>
      `Elegant product showcase photography of ${products}. Clean white or dark background, professional studio lighting, premium quality, minimalist composition, high-end commercial photography. ${detail}`,
  },
]

export default function ImagesPage() {
  const [products, setProducts] = useState('')
  const [detail, setDetail] = useState('')
  const [selectedTipo, setSelectedTipo] = useState(TIPOS[0])
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  async function generate() {
    if (!products) return
    setLoading(true)
    setImageUrl(null)

    const [w, h] = selectedTipo.size.split('x').map(Number)
    const prompt = selectedTipo.prompt(products, detail)

    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products, prompt, width: w, height: h }),
    })
    const data = await res.json()
    setImageUrl(data.url)
    setLoading(false)
  }

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Generador de imágenes IA</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>Creá imágenes profesionales para redes y WhatsApp en segundos.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Productos / servicios</label>
          <input value={products} onChange={e => setProducts(e.target.value)} placeholder="Producto 1, Producto 2..." style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>Detalle adicional (opcional)</label>
          <input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Colores, estilo, mensaje especial..." style={inputStyle} />
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
          <img
            src={imageUrl}
            alt="Imagen generada"
            style={{ width: '100%', borderRadius: 10, display: 'block', marginBottom: 12 }}
            onLoad={() => setLoading(false)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={imageUrl} download="imagen.jpg" target="_blank" rel="noreferrer" style={{ flex: 1 }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>⬇️ Descargar</button>
            </a>
            <button onClick={generate} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>🔄 Regenerar</button>
          </div>
        </div>
      )}
    </div>
  )
}
