'use client'
import { useState, useEffect } from 'react'
import ChatWidget from '@/components/catalogo/ChatWidget'

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

interface CompanySettings {
  COMPANY_NAME?: string
  COMPANY_LOGO_URL?: string
  COMPANY_WHATSAPP?: string
  COMPANY_INSTAGRAM?: string
  COMPANY_SLOGAN?: string
}

export default function CatalogoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<CompanySettings>({})
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetch('/api/catalog').then(r => r.json()).then(setProducts)
    fetch('/api/settings/public').then(r => r.json()).then((data: { key: string; value: string }[]) => {
      if (Array.isArray(data)) {
        const map = Object.fromEntries(data.map(r => [r.key, r.value]))
        setSettings(map)
      }
    })
  }, [])

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, qty: 1 }]
    })
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.product.id !== id))
  }

  function sendOrder() {
    if (!name || cart.length === 0) return
    const lines = cart.map(i => `• ${i.qty}x ${i.product.name}${i.product.price ? ` ($${i.product.price} c/u)` : ''}`)
    const total = cart.reduce((sum, i) => sum + (i.product.price || 0) * i.qty, 0)
    const msg = [
      `Hola! Quiero hacer un pedido 🛒`,
      ``,
      `*Nombre:* ${name}`,
      address ? `*Dirección:* ${address}` : '',
      ``,
      `*Productos:*`,
      ...lines,
      total > 0 ? `\n*Total estimado:* $${total.toLocaleString('es-AR')}` : '',
    ].filter(l => l !== undefined).join('\n')

    const phone = settings.COMPANY_WHATSAPP?.replace(/\D/g, '') || ''
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    setSent(true)
  }

  const categories = [...new Set(products.map(p => p.category || 'General'))]
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0)

  const accent = '#f97316'

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1e2433', borderBottom: '1px solid #2d3748', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        {settings.COMPANY_LOGO_URL && (
          <img src={settings.COMPANY_LOGO_URL} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{settings.COMPANY_NAME || 'Catálogo'}</div>
          {settings.COMPANY_SLOGAN && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{settings.COMPANY_SLOGAN}</div>}
        </div>
        {totalItems > 0 && (
          <div style={{ background: accent, borderRadius: 20, padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600 }}>
            🛒 {totalItems}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {/* Banner Vitto */}
        <a href="https://t.me/vittomare_bot" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg, #0088cc15, #0088cc25)', border: '1px solid #0088cc40', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
            <div style={{ background: '#0088cc', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>✈️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0' }}>Hablá con Vitto</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Consultá precios, disponibilidad y pedidos por Telegram</div>
            </div>
            <div style={{ background: '#0088cc', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Chatear →
            </div>
          </div>
        </a>

        {/* Banner Canal WhatsApp */}
        <a href="https://whatsapp.com/channel/0029VbDMYoq8KMqmyZpDKN3e" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg, #25D36612, #25D36622)', border: '1px solid #25D36640', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
            <div style={{ background: '#25D366', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>📣</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#e2e8f0' }}>Canal de ofertas en WhatsApp</div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Las ofertas del día, antes que nadie</div>
            </div>
            <div style={{ background: '#25D366', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Seguir →
            </div>
          </div>
        </a>

        {/* Productos */}
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, color: '#94a3b8', marginBottom: 12 }}>{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.filter(p => (p.category || 'General') === cat).map(p => {
                const inCart = cart.find(i => i.product.id === p.id)
                return (
                  <div key={p.id} style={{ background: '#1e2433', border: '1px solid #2d3748', borderRadius: 12, overflow: 'hidden', display: 'flex', gap: 0 }}>
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} style={{ width: 90, height: 90, objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ padding: '12px 14px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>{p.description}</div>}
                        {p.price && (
                          <div style={{ color: accent, fontWeight: 700 }}>
                            ${p.price.toLocaleString('es-AR')}
                            {p.unit && <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem' }}> / {p.unit}</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        {inCart ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => removeFromCart(p.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>−</button>
                            <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                            <button onClick={() => addToCart(p)} style={{ background: `${accent}20`, color: accent, border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem' }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(p)} style={{ background: accent, color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                            + Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 60 }}>
            Cargando productos...
          </div>
        )}

        {/* Carrito / Pedido */}
        {cart.length > 0 && (
          <div style={{ background: '#1e2433', border: `1px solid ${accent}40`, borderRadius: 14, padding: 20, marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '1rem' }}>Tu pedido</div>
            {cart.map(i => (
              <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6, color: '#e2e8f0' }}>
                <span>{i.qty}x {i.product.name}</span>
                {i.product.price && <span style={{ color: accent, fontWeight: 600 }}>${(i.product.price * i.qty).toLocaleString('es-AR')}</span>}
              </div>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid #2d3748', margin: '14px 0' }} />
            <div style={{ marginBottom: 10 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre *" style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: '0.9rem', marginBottom: 8, boxSizing: 'border-box' }} />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección de entrega (opcional)" style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            {sent ? (
              <div style={{ background: '#22c55e20', color: '#22c55e', borderRadius: 8, padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                ✅ ¡Pedido enviado por WhatsApp!
              </div>
            ) : (
              <button onClick={sendOrder} disabled={!name} style={{ width: '100%', background: '#25D366', color: 'white', border: 'none', borderRadius: 10, padding: '13px', fontSize: '0.95rem', fontWeight: 700, cursor: name ? 'pointer' : 'not-allowed', opacity: name ? 1 : 0.5 }}>
                📲 Enviar pedido por WhatsApp
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.72rem', marginTop: 40, paddingBottom: 20 }}>
          {settings.COMPANY_NAME} · {settings.COMPANY_WHATSAPP}
          {settings.COMPANY_INSTAGRAM && <span> · @{settings.COMPANY_INSTAGRAM}</span>}
        </div>
      </div>

      {/* Chat con IA */}
      <ChatWidget companyName={settings.COMPANY_NAME} />
    </div>
  )
}
