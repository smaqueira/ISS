import { ImageResponse } from '@vercel/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

const W = 1200
const ACCENT = '#7EC8C8'
const NAVY   = '#0D1326'
const GOLD   = '#C9A96E'

export async function GET() {
  const db = createAdminClient()
  const { data: products } = await db
    .from('products')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name')

  const items = products || []

  // Agrupar por categoría
  const byCategory: Record<string, typeof items> = {}
  for (const p of items) {
    const cat = p.category || 'Otros'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }
  const categories = Object.entries(byCategory)

  const today = new Date().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          display: 'flex',
          flexDirection: 'column',
          background: NAVY,
          fontFamily: 'sans-serif',
          padding: '0 0 60px 0',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '52px 60px 40px',
          borderBottom: `1px solid ${ACCENT}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              border: `2px solid ${ACCENT}`,
              background: `${ACCENT}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32,
            }}>🐟</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1 }}>
                VITTO <span style={{ color: ACCENT }}>MARE</span>
              </span>
              <span style={{ fontSize: 15, color: `${ACCENT}99`, letterSpacing: 6, textTransform: 'uppercase', marginTop: 4 }}>
                Pescados · Mariscos
              </span>
            </div>
          </div>
          <div style={{
            fontSize: 13, color: `#ffffff55`, letterSpacing: 3,
            textTransform: 'uppercase', marginTop: 8,
          }}>
            Selección del día · {today}
          </div>
          <div style={{
            marginTop: 20, padding: '8px 28px',
            border: `1px solid ${GOLD}66`,
            borderRadius: 30,
            fontSize: 13, color: GOLD, letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            Catálogo de precios
          </div>
        </div>

        {/* Categorías */}
        {categories.map(([cat, prods]) => (
          <div key={cat} style={{ display: 'flex', flexDirection: 'column', padding: '0 60px' }}>
            {/* Category title */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              margin: '40px 0 24px',
            }}>
              <div style={{ height: 1, flex: 1, background: `${ACCENT}33` }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: ACCENT,
                letterSpacing: 4, textTransform: 'uppercase',
              }}>{cat}</span>
              <div style={{ height: 1, flex: 1, background: `${ACCENT}33` }} />
            </div>

            {/* Product grid — 4 per row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {prods.map(p => {
                const price = p.price_retail
                  ? `$${Number(p.price_retail).toLocaleString('es-AR')} / ${p.unit || 'kg'}`
                  : 'Consultar'

                return (
                  <div key={p.id} style={{
                    width: 238,
                    display: 'flex', flexDirection: 'column',
                    background: '#ffffff08',
                    border: `1px solid ${ACCENT}22`,
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}>
                    {/* Foto */}
                    <div style={{
                      width: 238, height: 180,
                      background: `${ACCENT}10`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {p.image_url
                        ? <img src={p.image_url} width={238} height={180} style={{ objectFit: 'cover' }} />
                        : <span style={{ fontSize: 48 }}>🐟</span>
                      }
                    </div>
                    {/* Info */}
                    <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{p.name}</span>
                      <span style={{
                        fontSize: 15, fontWeight: 800,
                        color: price === 'Consultar' ? `${ACCENT}99` : ACCENT,
                        marginTop: 2,
                      }}>{price}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 32, marginTop: 56, padding: '28px 60px 0',
          borderTop: `1px solid ${ACCENT}22`,
        }}>
          <span style={{ fontSize: 13, color: `#ffffff44`, letterSpacing: 1 }}>vittomare.com</span>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: `${ACCENT}44` }} />
          <span style={{ fontSize: 13, color: `#ffffff44`, letterSpacing: 1 }}>Pedidos por WhatsApp</span>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: `${ACCENT}44` }} />
          <span style={{ fontSize: 13, color: `#ffffff44`, letterSpacing: 1 }}>Entrega a domicilio</span>
        </div>
      </div>
    ),
    {
      width: W,
      height: 2400,
    }
  )
}
