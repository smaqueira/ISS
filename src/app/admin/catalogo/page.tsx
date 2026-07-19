'use client'
import { useState } from 'react'

export default function CatalogoPage() {
  const [loading, setLoading] = useState(false)
  const [ts, setTs] = useState(Date.now())

  async function descargar() {
    setLoading(true)
    const res = await fetch('/api/catalogo/imagen')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `catalogo-vittomare-${new Date().toISOString().split('T')[0]}.png`
    a.click()
    URL.revokeObjectURL(url)
    setLoading(false)
  }

  function regenerar() { setTs(Date.now()) }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Catálogo WhatsApp</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Imagen generada con los productos activos · lista para compartir</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={regenerar} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
            🔄 Actualizar preview
          </button>
          <button onClick={descargar} disabled={loading} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '10px 22px' }}>
            {loading ? '⏳ Descargando...' : '⬇️ Descargar imagen'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
        background: '#0D1326',
        boxShadow: '0 8px 32px #0006',
      }}>
        <img
          key={ts}
          src={`/api/catalogo/imagen?t=${ts}`}
          alt="Preview catálogo"
          style={{ width: '100%', display: 'block' }}
        />
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
        La imagen se genera con los productos activos en tiempo real. Si actualizás precios o fotos, presioná "Actualizar preview".
      </p>
    </div>
  )
}
