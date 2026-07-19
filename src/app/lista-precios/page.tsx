import { getBlueMarketCatalog as getBlueMarketProducts } from '@/lib/bluemarket'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price)
}

export default async function ListaPreciosPage() {
  const products = await getBlueMarketProducts()
  const db = await createClient()
  const { data: settings } = await db.from('settings').select('key, value').in('key', ['COMPANY_NAME', 'COMPANY_WHATSAPP', 'COMPANY_LOGO_URL'])
  const s = Object.fromEntries((settings || []).map((r: { key: string; value: string }) => [r.key, r.value]))

  const nombre = s.COMPANY_NAME || 'Lista de Precios'
  const whatsapp = s.COMPANY_WHATSAPP || ''
  const logo = s.COMPANY_LOGO_URL || ''
  const fecha = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  const categorias = [...new Set((products || []).map(p => p.category || 'General'))].sort()

  return (
    <div id="lista-precios" style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #0D1326' }}>
        <div>
          {logo && <img src={logo} alt={nombre} style={{ height: 56, objectFit: 'contain', marginBottom: 6, display: 'block' }} />}
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0D1326' }}>{nombre}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>Lista de precios · {fecha}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b' }}>
          <div style={{ fontWeight: 600, color: '#0D1326', marginBottom: 2 }}>Precios sujetos a cambio</div>
          <div>sin previo aviso</div>
          {whatsapp && <div style={{ marginTop: 6, color: '#25D366', fontWeight: 600 }}>WhatsApp: +{whatsapp}</div>}
        </div>
      </div>

      {/* Productos por categoría */}
      {categorias.map(cat => {
        const items = (products || []).filter(p => (p.category || 'General') === cat)
        if (!items.length) return null
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e2e8f0' }}>
              {cat}
            </div>
            {items.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#0D1326', fontSize: '0.9rem' }}>{p.name}</span>
                  {p.unit && <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 6 }}>/ {p.unit}</span>}
                  {p.featured && <span style={{ marginLeft: 8, fontSize: '0.65rem', background: '#f97316', color: 'white', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>DESTACADO</span>}
                </div>
                <div style={{ fontWeight: 700, color: p.price ? '#0D1326' : '#64748b', fontSize: '0.9rem', whiteSpace: 'nowrap', marginLeft: 16 }}>
                  {p.price ? formatPrice(p.price) : 'Consultar'}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {(!products || products.length === 0) && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Catálogo no disponible</div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
        Lista generada automáticamente · Productos con stock disponible
        {whatsapp && <span> · Pedidos por WhatsApp +{whatsapp}</span>}
      </div>
    </div>
  )
}
