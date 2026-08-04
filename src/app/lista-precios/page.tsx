import { getBlueMarketCatalog as getBlueMarketProducts } from '@/lib/bluemarket'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { calcMayorista, type MayCfg } from '@/lib/precios'

export const dynamic = 'force-dynamic'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price)
}

export default async function ListaPreciosPage({ searchParams }: {
  searchParams: Promise<{ tipo?: string; print?: string }>
}) {
  const { tipo } = await searchParams
  const esMayorista = tipo === 'mayorista' // por defecto = MINORISTA (la pública)

  // La lista MAYORISTA es privada: solo el admin logueado puede verla (se comparte
  // como imagen/PDF, nunca como link público).
  if (esMayorista) {
    const store = await cookies()
    if (store.get('iss_session')?.value !== 'admin') {
      return (
        <div style={{ maxWidth: 480, margin: '80px auto', padding: 32, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, color: '#0D1326' }}>Lista no disponible</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 6 }}>Esta lista es privada.</div>
        </div>
      )
    }
  }

  const products = await getBlueMarketProducts()
  const db = await createClient()
  const { data: settings } = await db.from('settings').select('key, value').in('key', [
    'COMPANY_NAME', 'COMPANY_WHATSAPP', 'COMPANY_LOGO_URL',
    'COMPRA_MINIMA', 'COMPRA_MINIMA_MINORISTA', 'DESCUENTO_MAYORISTA', 'DESCUENTOS_MAYORISTA_POR_PRODUCTO',
  ])
  const s = Object.fromEntries((settings || []).map((r: { key: string; value: string }) => [r.key, r.value]))

  const nombre = s.COMPANY_NAME || 'Lista de Precios'
  const whatsapp = s.COMPANY_WHATSAPP || ''
  const logo = s.COMPANY_LOGO_URL || ''

  // Minorista (pública) = precio de BlueMarket por kilo, tal cual.
  // Mayorista (privada) = precio/kg mayorista × kilos de la caja (por producto);
  // si el producto no tiene precio/kg cargado, usa el descuento general sobre el minorista.
  const descuentoGeneral = Math.min(90, Math.max(0, Number(s.DESCUENTO_MAYORISTA) || 0))
  let mapa: Record<string, MayCfg> = {}
  try { const m = JSON.parse(s.DESCUENTOS_MAYORISTA_POR_PRODUCTO || '{}'); if (m && typeof m === 'object') mapa = m } catch { /* ignore */ }
  const compraMinima = esMayorista ? (s.COMPRA_MINIMA || '') : (s.COMPRA_MINIMA_MINORISTA || '')

  function renderPrecio(p: { id: string | number; price: number | null }) {
    if (!p.price) return <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>Consultar</span>
    if (!esMayorista) return <span>{formatPrice(p.price)}</span>
    const may = calcMayorista(p.price, mapa[String(p.id)], descuentoGeneral)
    if (may.porCaja) return (
      <div style={{ textAlign: 'right' }}>
        <div>{formatPrice(may.boxTotal)}</div>
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>caja {may.kilosCaja} kg · {formatPrice(may.unitKg)}/kg</div>
      </div>
    )
    return <span>{formatPrice(may.unitKg)} / kg</span>
  }

  const etiqueta = esMayorista ? 'MAYORISTA' : 'MINORISTA'
  const publico = esMayorista ? 'Precios para negocios' : 'Precios para particulares'
  const acento = esMayorista ? '#0D1326' : '#C9A96E'

  const fecha = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  const categorias = [...new Set((products || []).map(p => p.category || 'General'))].sort()

  return (
    <div id="lista-precios" style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 20, borderBottom: `2px solid ${acento}` }}>
        <div>
          {logo && <img src={logo} alt={nombre} style={{ height: 56, objectFit: 'contain', marginBottom: 6, display: 'block' }} />}
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0D1326' }}>{nombre}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
            <span style={{ background: acento, color: '#fff', borderRadius: 4, padding: '1px 8px', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.7rem' }}>{etiqueta}</span>
            <span style={{ marginLeft: 8 }}>{publico} · {fecha}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b' }}>
          <div style={{ fontWeight: 600, color: '#0D1326', marginBottom: 2 }}>Precios sujetos a cambio</div>
          <div>sin previo aviso</div>
          {whatsapp && <div style={{ marginTop: 6, color: '#25D366', fontWeight: 600 }}>WhatsApp: +{whatsapp}</div>}
        </div>
      </div>

      {/* Productos por categoría */}
      {categorias.map(cat => {
        // En mayorista se ocultan los productos deshabilitados para mayor
        const items = (products || []).filter(p => (p.category || 'General') === cat && !(esMayorista && mapa[String(p.id)]?.off))
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
                <div style={{ fontWeight: 700, color: '#0D1326', fontSize: '0.9rem', marginLeft: 16, textAlign: 'right' }}>
                  {renderPrecio(p)}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {(!products || products.length === 0) && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Catálogo no disponible</div>
      )}

      {/* Compra mínima */}
      {compraMinima && (
        <div style={{ margin: '24px 0 0', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
          🛒 Compra mínima: {compraMinima}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
        Lista {etiqueta.toLowerCase()} generada automáticamente · Precios sujetos a cambio sin previo aviso
        {whatsapp && <span> · Pedidos por WhatsApp +{whatsapp}</span>}
      </div>
    </div>
  )
}
