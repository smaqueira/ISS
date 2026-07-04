'use client'
import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  description?: string | null
  price?: number | null
  unit?: string | null
  category?: string | null
  image_url?: string | null
  featured?: boolean
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog').then(r => r.json()).then(data => {
      setProducts(data || [])
      setLoading(false)
    })
  }, [])

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>Productos</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{products.length} productos desde BlueMarket</p>
        </div>
        <a href="https://panel.vittomare.com" target="_blank" rel="noreferrer">
          <button className="btn btn-primary">Gestionar en BlueMarket →</button>
        </a>
      </div>

      <div className="card" style={{ marginBottom: 20, background: '#1e3a5f20', border: '1px solid #3b82f620', padding: '12px 16px', fontSize: '0.82rem', color: 'var(--muted)' }}>
        Los productos se gestionan en <strong>panel.vittomare.com</strong>. Lo que cargues ahí aparece automáticamente acá, en el catálogo público y en el chatbot.
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Cargando...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          No hay productos disponibles. Agregá productos en <a href="https://panel.vittomare.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>panel.vittomare.com</a>
        </div>
      ) : (
        products.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
            {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.category || 'Sin categoría'} · {p.unit}</div>
              {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.description}</div>}
            </div>
            {p.price != null && (
              <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                ${p.price.toLocaleString('es-AR')}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
