'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProductPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', category: '', price_retail: '', price_wholesale: '', unit: 'kg', stock: '' })
  const [loading, setLoading] = useState(false)

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price_retail: +form.price_retail, price_wholesale: +form.price_wholesale, stock: form.stock ? +form.stock : null }),
    })
    setLoading(false)
    router.push('/admin/products')
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>{label}</label>
      <input type={type} value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20 }}>Nuevo producto</h1>
      <div className="card">
        <form onSubmit={submit}>
          {field('Nombre *', 'name', 'text', 'Ej: Producto A')}
          {field('Categoría *', 'category', 'text', 'Ej: Categoría 1')}
          {field('Precio minorista *', 'price_retail', 'number', '0')}
          {field('Precio mayorista *', 'price_wholesale', 'number', '0')}
          {field('Unidad', 'unit', 'text', 'kg, unidad, caja...')}
          {field('Stock (opcional)', 'stock', 'number', '0')}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            {loading ? 'Guardando...' : 'Guardar producto'}
          </button>
        </form>
      </div>
    </div>
  )
}
