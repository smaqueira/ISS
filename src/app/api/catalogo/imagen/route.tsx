import { ImageResponse } from 'next/og'
import { getBlueMarketCatalog } from '@/lib/bluemarket'

export const runtime = 'nodejs'

const W      = 1200
const NAVY   = '#0D1326'
const ACCENT = '#7EC8C8'
const GOLD   = '#C9A96E'
const COLS   = 4
const CARD_W = 256
const CARD_H = 240
const GAP    = 16

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function GET() {
  const products = await getBlueMarketCatalog()
  const items = (products || []) as {
    id: string; name: string; category: string | null
    price: number | null; unit: string | null; image_url: string | null
  }[]

  const byCategory: Record<string, typeof items> = {}
  for (const p of items) {
    const cat = (p.category as string) || 'Otros'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }
  const categories = Object.entries(byCategory)

  const today = new Date().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return new ImageResponse(
    (
      <div style={{ width: W, display: 'flex', flexDirection: 'column', background: NAVY, padding: '0 0 60px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 60px 36px', borderBottom: `1px solid ${ACCENT}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
            <div style={{ width: 70, height: 70, borderRadius: 35, border: `2px solid ${ACCENT}`, background: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              🐟
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 54, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1, display: 'flex' }}>
                <span>VITTO </span><span style={{ color: ACCENT }}>MARE</span>
              </div>
              <div style={{ fontSize: 14, color: `${ACCENT}99`, letterSpacing: 6, marginTop: 4 }}>
                PESCADOS · MARISCOS
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#ffffff44', letterSpacing: 3, marginTop: 6 }}>
            {`SELECCIÓN DEL DÍA · ${today.toUpperCase()}`}
          </div>
          <div style={{ marginTop: 16, padding: '7px 26px', border: `1px solid ${GOLD}66`, borderRadius: 30, fontSize: 12, color: GOLD, letterSpacing: 2 }}>
            CATÁLOGO DE PRECIOS
          </div>
        </div>

        {/* Categorías */}
        {categories.map(([cat, prods]) => (
          <div key={cat} style={{ display: 'flex', flexDirection: 'column', padding: '0 60px' }}>
            {/* Título categoría */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '36px 0 20px' }}>
              <div style={{ height: 1, flex: 1, background: `${ACCENT}33` }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: 4 }}>
                {cat.toUpperCase()}
              </div>
              <div style={{ height: 1, flex: 1, background: `${ACCENT}33` }} />
            </div>

            {/* Filas de productos */}
            {chunk(prods, COLS).map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: GAP, marginBottom: GAP }}>
                {row.map(p => {
                  const price = p.price
                    ? `$${Number(p.price).toLocaleString('es-AR')} / ${p.unit || 'kg'}`
                    : 'Consultar precio'
                  return (
                    <div key={p.id} style={{
                      width: CARD_W, display: 'flex', flexDirection: 'column',
                      background: '#ffffff08', border: `1px solid ${ACCENT}22`,
                      borderRadius: 12, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: CARD_W, height: 170, background: `${ACCENT}10`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt={p.name}
                            width={CARD_W}
                            height={170}
                            style={{ width: CARD_W, height: 170, objectFit: 'cover', objectPosition: 'top' }}
                          />
                        ) : (
                          <div style={{ fontSize: 44 }}>🐟</div>
                        )}
                      </div>
                      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{p.name}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: price === 'Consultar' ? `${ACCENT}88` : ACCENT }}>
                          {price}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* Placeholders para completar la fila */}
                {Array.from({ length: COLS - row.length }).map((_, i) => (
                  <div key={`ph-${i}`} style={{ width: CARD_W }} />
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, marginTop: 48, padding: '24px 60px 0', borderTop: `1px solid ${ACCENT}22` }}>
          <div style={{ fontSize: 12, color: '#ffffff33', letterSpacing: 1 }}>vittomare.com</div>
          <div style={{ width: 3, height: 3, borderRadius: 2, background: `${ACCENT}44` }} />
          <div style={{ fontSize: 12, color: '#ffffff33', letterSpacing: 1 }}>Pedidos por WhatsApp</div>
          <div style={{ width: 3, height: 3, borderRadius: 2, background: `${ACCENT}44` }} />
          <div style={{ fontSize: 12, color: '#ffffff33', letterSpacing: 1 }}>Entrega a domicilio</div>
        </div>
      </div>
    ),
    { width: W, height: 2600 }
  )
}
