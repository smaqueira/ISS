'use client'
import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  description?: string
  price?: number
  unit?: string
  category?: string
  image_url?: string
  active: boolean
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [catalogUrl, setCatalogUrl] = useState('')
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: 'kg', category: 'General', image_url: '' })

  useEffect(() => {
    setCatalogUrl(window.location.origin + '/catalogo')
    load()
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/products')
    setProducts(await res.json())
    setLoading(false)
  }

  async function add() {
    if (!form.name) return
    setAdding(true)
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: form.price ? parseFloat(form.price) : null, active: true }),
    })
    setForm({ name: '', description: '', price: '', unit: 'kg', category: 'General', image_url: '' })
    await load()
    setAdding(false)
  }

  async function toggle(p: Product) {
    await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    })
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    load()
  }

  function copyLink() {
    navigator.clipboard.writeText(catalogUrl)
    alert('Link copiado!')
  }

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Productos del catálogo</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 20 }}>Lo que cargues acá aparece en tu página pública para compartir.</p>

      {/* Link del catálogo */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Link público del catálogo</div>
          <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.9rem' }}>{catalogUrl}</div>
        </div>
        <button onClick={copyLink} className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }}>📋 Copiar link</button>
        <a href="/catalogo" target="_blank" rel="noreferrer">
          <button className="btn btn-primary">👁️ Ver catálogo</button>
        </a>
      </div>

      {/* Agregar producto */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>+ Agregar producto</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nombre *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Producto 1" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Categoría</label>
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="General" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Precio</label>
            <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1500" type="number" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Unidad</label>
            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={inputStyle}>
              <option value="kg">kg</option>
              <option value="unidad">unidad</option>
              <option value="docena">docena</option>
              <option value="caja">caja</option>
              <option value="litro">litro</option>
              <option value="porción">porción</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Descripción</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción corta del producto" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>URL de imagen (opcional)</label>
          <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
        </div>
        <button onClick={add} disabled={adding || !form.name} className="btn btn-primary">
          {adding ? 'Guardando...' : '+ Agregar al catálogo'}
        </button>
      </div>

      {/* Lista de productos */}
      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Cargando...</div>
      ) : products.length === 0 ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No hay productos. Agregá el primero.</div>
      ) : (
        products.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center', opacity: p.active ? 1 : 0.5 }}>
            {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.category} · {p.unit}</div>
              {p.price && <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem' }}>${p.price.toLocaleString('es-AR')}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggle(p)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                {p.active ? '🟢 Activo' : '⚫ Inactivo'}
              </button>
              <button onClick={() => remove(p.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
                🗑️
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
