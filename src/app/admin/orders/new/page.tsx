'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string; type: string; phone?: string; rubro?: string }
interface Product { id: string; name: string; price?: number | null; unit?: string | null; category?: string | null }
interface Item { product_id: string; name: string; qty: number; unit: string; unit_price: number }

const inputStyle = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem',
  width: '100%', boxSizing: 'border-box' as const,
}

export default function NuevoPedidoPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientId, setClientId] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d || []))
    fetch('/api/products').then(r => r.json()).then(d => setProducts(d || []))
  }, [])

  const selectedClient = clients.find(c => c.id === clientId)
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 8)

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category || 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0)

  function addProduct(p: Product) {
    setItems(prev => {
      const existing = prev.findIndex(i => i.product_id === p.id)
      if (existing >= 0) {
        return prev.map((i, idx) => idx === existing ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { product_id: p.id, name: p.name, qty: 1, unit: p.unit || 'kg', unit_price: p.price || 0 }]
    })
  }

  function updateItem(idx: number, field: keyof Item, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    if (!clientId || items.length === 0) return
    setSaving(true)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        status: 'pendiente',
        delivery_date: deliveryDate || null,
        notes,
        items: items.map(i => ({ product_id: i.product_id, qty: i.qty, unit_price: i.unit_price })),
      }),
    })
    const data = await res.json()
    router.push(`/admin/orders/${data.id}`)
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <a href="/admin/orders" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem' }}>← Pedidos</a>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Nuevo pedido</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Columna izquierda: cliente + resumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cliente */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Cliente</div>
            <input
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); if (!e.target.value) setClientId('') }}
              placeholder="Buscá cliente..."
              style={inputStyle}
            />
            {clientSearch && !selectedClient && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                {filteredClients.length === 0
                  ? <div style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.82rem' }}>Sin resultados</div>
                  : filteredClients.map(c => (
                    <div key={c.id} onClick={() => { setClientId(c.id); setClientSearch(c.name) }}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)15')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      {c.rubro && <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 8 }}>{c.rubro}</span>}
                    </div>
                  ))}
              </div>
            )}
            {selectedClient && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedClient.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{selectedClient.type?.toUpperCase()} {selectedClient.phone ? `· ${selectedClient.phone}` : ''}</div>
                </div>
                <button onClick={() => { setClientId(''); setClientSearch('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
              </div>
            )}
          </div>

          {/* Entrega y notas */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Detalles</div>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Fecha de entrega</label>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Dirección, instrucciones..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* Resumen */}
          {items.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Resumen del pedido</div>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <input value={item.qty} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                    type="number" min="0.5" step="0.5"
                    style={{ ...inputStyle, padding: '5px 8px', fontSize: '0.8rem', textAlign: 'center' }} />
                  <div style={{ fontSize: '0.8rem', color: item.unit_price ? 'var(--text)' : 'var(--muted)', textAlign: 'right' }}>
                    {item.unit_price ? `$${(item.qty * item.unit_price).toLocaleString('es-AR')}` : 'S/precio'}
                  </div>
                  <button onClick={() => removeItem(idx)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '0.9rem' }}>×</button>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent)' }}>${total.toLocaleString('es-AR')}</span>
              </div>
            </div>
          )}

          <button
            onClick={save}
            disabled={saving || !clientId || items.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: '1rem' }}
          >
            {saving ? '⏳ Guardando...' : '📦 Crear pedido'}
          </button>
        </div>

        {/* Columna derecha: catálogo */}
        <div className="card" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Catálogo de productos</div>
          {Object.entries(byCategory).map(([cat, prods]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{cat}</div>
              {prods.map(p => {
                const inOrder = items.find(i => i.product_id === p.id)
                return (
                  <div key={p.id} onClick={() => addProduct(p)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                      background: inOrder ? 'var(--accent)18' : 'var(--bg)',
                      border: `1px solid ${inOrder ? 'var(--accent)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!inOrder) e.currentTarget.style.background = 'var(--accent)10' }}
                    onMouseLeave={e => { if (!inOrder) e.currentTarget.style.background = 'var(--bg)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {inOrder && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>×{inOrder.qty}</span>}
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>/ {p.unit || 'kg'}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: p.price ? 'var(--accent)' : 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {p.price ? `$${Number(p.price).toLocaleString('es-AR')}` : 'S/precio'}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32, fontSize: '0.85rem' }}>Cargando productos...</div>
          )}
        </div>
      </div>
    </div>
  )
}
