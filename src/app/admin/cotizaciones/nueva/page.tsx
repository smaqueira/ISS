'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string; rubro?: string; type: string; phone?: string; email?: string }
interface Product { id: string; name: string; price?: number; unit?: string }
interface Item { name: string; qty: number; unit: string; unit_price: number }

export default function NuevaCotizacionPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [items, setItems] = useState<Item[]>([{ name: '', qty: 1, unit: 'kg', unit_price: 0 }])
  const [intro, setIntro] = useState('')
  const [notes, setNotes] = useState('')
  const [validityDays, setValidityDays] = useState(7)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d || []))
    fetch('/api/products').then(r => r.json()).then(d => setProducts(d || []))
  }, [])

  const selectedClient = clients.find(c => c.id === clientId)
  const filteredClients = clients.filter(c =>
    c.type === 'b2b' &&
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 8)

  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0)

  function addItem() {
    setItems(prev => [...prev, { name: '', qty: 1, unit: 'kg', unit_price: 0 }])
  }

  function updateItem(idx: number, field: keyof Item, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function fillFromProduct(idx: number, product: Product) {
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item, name: product.name, unit: product.unit || 'kg', unit_price: product.price || 0,
    } : item))
  }

  async function generate() {
    if (!selectedClient) return
    setGenerating(true)
    const res = await fetch('/api/ai/cotizacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: selectedClient.name, rubro: selectedClient.rubro, items }),
    })
    const data = await res.json()
    setIntro(data.intro || '')
    setNotes(data.notes || '')
    setGenerating(false)
  }

  async function save() {
    if (!selectedClient || items.every(i => !i.name)) return
    setSaving(true)
    const res = await fetch('/api/cotizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_name: selectedClient.name,
        client_phone: selectedClient.phone,
        client_email: selectedClient.email,
        items: items.filter(i => i.name),
        intro, notes, validity_days: validityDays,
        status: 'enviada',
      }),
    })
    const data = await res.json()
    router.push(`/cotizacion/${data.id}`)
  }

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <a href="/admin/cotizaciones" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem' }}>← Cotizaciones</a>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Nueva cotización</h1>
      </div>

      {/* Cliente */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>1. Cliente</div>
        <input
          value={clientSearch}
          onChange={e => setClientSearch(e.target.value)}
          placeholder="Buscá un cliente B2B..."
          style={inputStyle}
        />
        {clientSearch && !selectedClient && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
            {filteredClients.length === 0 && <div style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.82rem' }}>Sin resultados</div>}
            {filteredClients.map(c => (
              <div key={c.id} onClick={() => { setClientId(c.id); setClientSearch(c.name) }}
                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9731615')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                {c.rubro && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{c.rubro}</div>}
              </div>
            ))}
          </div>
        )}
        {selectedClient && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedClient.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{selectedClient.rubro} · {selectedClient.phone || selectedClient.email || 'sin contacto'}</div>
            </div>
            <button onClick={() => { setClientId(''); setClientSearch('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>2. Productos</div>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 110px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={item.name}
                onChange={e => updateItem(idx, 'name', e.target.value)}
                placeholder="Nombre del producto"
                style={inputStyle}
                list={`products-${idx}`}
              />
              <datalist id={`products-${idx}`}>
                {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            <input value={item.qty} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)} type="number" min="0" step="0.5" placeholder="Cant." style={inputStyle} />
            <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} style={inputStyle}>
              {['kg', 'unidad', 'caja', 'docena', 'litro', 'porción'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input value={item.unit_price || ''} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} type="number" min="0" placeholder="$ precio" style={inputStyle} />
            <button onClick={() => removeItem(idx)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>−</button>
          </div>
        ))}

        {products.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>Cargados en catálogo:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {products.map(p => (
                <button key={p.id} onClick={() => {
                  const empty = items.findIndex(i => !i.name)
                  if (empty >= 0) fillFromProduct(empty, p)
                  else setItems(prev => [...prev, { name: p.name, qty: 1, unit: p.unit || 'kg', unit_price: p.price || 0 }])
                }} style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.72rem' }}>
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <button onClick={addItem} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>+ Agregar línea</button>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
            Total: ${total.toLocaleString('es-AR')}
          </div>
        </div>
      </div>

      {/* Texto IA */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>3. Texto de la propuesta</div>
          <button onClick={generate} disabled={generating || !selectedClient} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
            {generating ? '✨ Generando...' : '✨ Generar con IA'}
          </button>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Introducción</label>
          <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={3} placeholder="Presentación de la propuesta..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nota de cierre</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Vigencia, condiciones, contacto..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Válida por:</label>
          <select value={validityDays} onChange={e => setValidityDays(Number(e.target.value))} style={{ ...inputStyle, width: 'auto' }}>
            {[3, 5, 7, 10, 15, 30].map(d => <option key={d} value={d}>{d} días</option>)}
          </select>
        </div>
      </div>

      <button onClick={save} disabled={saving || !selectedClient || items.every(i => !i.name)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: '1rem' }}>
        {saving ? '⏳ Guardando...' : '📄 Crear cotización y ver PDF'}
      </button>
    </div>
  )
}
