import { getBlueMarketCatalog } from '@/lib/bluemarket'
import FlyerControls from './PrintButton'

export const dynamic = 'force-dynamic'

export default async function FlyerPage() {
  const products = await getBlueMarketCatalog()
  const items = (products || []) as {
    id: string; name: string; category: string | null
    price: number | null; unit: string | null; image_url: string | null
    featured?: boolean
  }[]

  const byCategory: Record<string, typeof items> = {}
  for (const p of items) {
    const cat = (p.category as string) || 'Otros'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  const today = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e1e; font-family: 'Montserrat', sans-serif; }
      `}</style>

      <FlyerControls />

      <div id="flyer-root" style={{
        width: 900,
        margin: '0 auto',
        background: 'linear-gradient(160deg, #0f1a30 0%, #0a1220 60%, #0d1a2e 100%)',
        fontFamily: "'Montserrat', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Decoración de fondo */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #7EC8C808 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, #C9A96E06 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* HERO HEADER */}
        <div style={{ padding: '60px 64px 48px', borderBottom: '1px solid rgba(126,200,200,0.12)', position: 'relative' }}>
          {/* Línea dorada decorativa */}
          <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, #C9A96E, transparent)', marginBottom: 32 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
            {/* Logo circle */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              border: '1.5px solid rgba(126,200,200,0.4)',
              background: 'rgba(126,200,200,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 36 }}>🐟</span>
            </div>

            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 58, fontWeight: 900, lineHeight: 1,
                color: '#fff', letterSpacing: -1,
              }}>
                VITTO <span style={{ color: '#7EC8C8' }}>MARE</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(126,200,200,0.6)', letterSpacing: 7, marginTop: 6, fontWeight: 600 }}>
                PESCADOS · MARISCOS
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Badge fecha */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 6 }}>
                SELECCIÓN DEL DÍA
              </div>
              <div style={{ fontSize: 13, color: 'rgba(201,169,110,0.8)', fontWeight: 700, letterSpacing: 1 }}>
                {today.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(126,200,200,0.15)' }} />
            <div style={{
              padding: '6px 20px',
              border: '1px solid rgba(201,169,110,0.3)',
              borderRadius: 30,
              fontSize: 10, color: '#C9A96E', letterSpacing: 4, fontWeight: 700,
            }}>
              CATÁLOGO DE PRECIOS
            </div>
            <div style={{ flex: 1, height: 1, background: 'rgba(126,200,200,0.15)' }} />
          </div>
        </div>

        {/* SECCIONES POR CATEGORÍA */}
        <div style={{ padding: '0 64px 64px' }}>
          {Object.entries(byCategory).map(([cat, prods]) => (
            <div key={cat} style={{ marginTop: 48 }}>
              {/* Título categoría */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, #7EC8C8, #7EC8C822)', borderRadius: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#7EC8C8', letterSpacing: 5 }}>
                  {cat.toUpperCase()}
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(126,200,200,0.1)' }} />
              </div>

              {/* Grid 4 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 } as React.CSSProperties}>
                {prods.map(p => {
                  const price = p.price
                    ? `$${Number(p.price).toLocaleString('es-AR')}`
                    : null
                  const unit = p.unit || 'kg'

                  return (
                    <div key={p.id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(126,200,200,0.1)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}>
                      {/* Foto */}
                      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: 'rgba(126,200,200,0.06)' }}>
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt={p.name}
                            crossOrigin="anonymous"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🐟</div>
                        )}
                        {/* Overlay degradé */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(transparent, rgba(10,18,32,0.85))' }} />
                      </div>

                      {/* Info */}
                      <div style={{ padding: '12px 14px 14px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 8, minHeight: 32 }}>
                          {p.name}
                        </div>
                        {price ? (
                          <div>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#7EC8C8' }}>{price}</span>
                            <span style={{ fontSize: 10, color: 'rgba(126,200,200,0.6)', marginLeft: 4, fontWeight: 500 }}>/ {unit}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'rgba(126,200,200,0.45)', fontWeight: 600, letterSpacing: 0.5 }}>
                            Consultar precio
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '28px 64px 40px',
          borderTop: '1px solid rgba(126,200,200,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
            vittomare.com
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(126,200,200,0.3)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>Pedidos por WhatsApp</span>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(126,200,200,0.3)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>Entrega a domicilio</span>
          </div>
          <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, transparent, #C9A96E55)' }} />
        </div>
      </div>
    </>
  )
}
