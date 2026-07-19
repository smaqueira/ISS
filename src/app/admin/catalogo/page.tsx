'use client'
import { useState, useEffect } from 'react'

function CompraMinima() {
  const [valor, setValor] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((arr: { key: string; value: string }[]) => {
        const map = Object.fromEntries(arr.map(r => [r.key, r.value]))
        setValor(map.COMPRA_MINIMA || '')
        setLoading(false)
      })
  }, [])

  async function guardar() {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ key: 'COMPRA_MINIMA', value: valor }]),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return null

  return (
    <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
        🛒 Compra mínima
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="Ej: $5.000 · Zona Norte · Lun-Sáb"
          style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem' }}
          onKeyDown={e => e.key === 'Enter' && guardar()}
        />
        <button onClick={guardar} className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}>
          {saved ? '✅ Guardado' : 'Guardar'}
        </button>
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 6 }}>
        Aparece en el flyer, la lista de precios y el mensaje de WhatsApp
      </div>
    </div>
  )
}

export default function CatalogoPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Catálogo WhatsApp</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Generá el flyer premium para compartir por WhatsApp</p>
      </div>

      <CompraMinima />

      {/* Cards de acción */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ fontSize: '2rem' }}>🖼️</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Imagen PNG</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Ideal para mandar por WhatsApp directo. Abre el flyer y hacé clic en <strong>PNG</strong>.
            </div>
          </div>
          <a href="/catalogo/flyer" target="_blank" className="btn btn-primary" style={{ marginTop: 'auto', justifyContent: 'center', textAlign: 'center' }}>
            🖼️ Abrir flyer → PNG
          </a>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ fontSize: '2rem' }}>📄</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Flyer PDF</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Para imprimir o compartir como archivo. Abre el flyer y hacé clic en <strong>PDF</strong>.
            </div>
          </div>
          <a href="/catalogo/flyer" target="_blank" className="btn btn-ghost" style={{ marginTop: 'auto', justifyContent: 'center', textAlign: 'center' }}>
            📄 Abrir flyer → PDF
          </a>
        </div>
      </div>

      {/* Preview iframe */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#0D1326' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Preview — /catalogo/flyer</span>
          <a href="/catalogo/flyer" target="_blank" style={{ fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none' }}>Abrir ↗</a>
        </div>
        <iframe src="/catalogo/flyer" style={{ width: '100%', height: 600, border: 'none', display: 'block' }} title="Preview catálogo" />
      </div>
    </div>
  )
}
