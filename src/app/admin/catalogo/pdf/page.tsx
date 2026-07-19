import { getBlueMarketCatalog } from '@/lib/bluemarket'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

export default async function CatalogoPDFPage() {
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

  const today = new Date().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Montserrat:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0D1326; font-family: 'Montserrat', sans-serif; color: #fff; }

        @media print {
          .no-print { display: none !important; }
          html, body { background: #0D1326 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0; size: A4; }
        }

        .wrap { max-width: 820px; margin: 0 auto; padding: 0 32px 64px; }

        /* HEADER */
        .header { text-align: center; padding: 52px 0 40px; border-bottom: 1px solid #7EC8C822; margin-bottom: 4px; }
        .logo-row { display: flex; align-items: center; justify-content: center; gap: 18px; margin-bottom: 12px; }
        .logo-circle { width: 72px; height: 72px; border-radius: 50%; border: 2px solid #7EC8C8; background: #7EC8C812; display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; }
        .brand { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 900; color: #fff; letter-spacing: -1px; line-height: 1; }
        .brand em { color: #7EC8C8; font-style: normal; }
        .tagline { font-size: 11px; color: #7EC8C877; letter-spacing: 6px; margin-top: 6px; font-weight: 600; }
        .subtitle { font-size: 11px; color: #ffffff33; letter-spacing: 3px; margin-top: 16px; font-weight: 500; }
        .badge { display: inline-block; margin-top: 16px; padding: 7px 26px; border: 1px solid #C9A96E55; border-radius: 30px; font-size: 11px; color: #C9A96E; letter-spacing: 3px; font-weight: 600; }

        /* CATEGORÍA */
        .cat-section { margin-top: 40px; }
        .cat-divider { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .cat-line { flex: 1; height: 1px; background: #7EC8C822; }
        .cat-label { font-size: 10px; font-weight: 700; color: #7EC8C8; letter-spacing: 5px; white-space: nowrap; }

        /* GRID — 4 columnas */
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

        /* CARD */
        .card { background: #ffffff06; border: 1px solid #7EC8C818; border-radius: 10px; overflow: hidden; break-inside: avoid; }
        .card-img { width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block; background: #7EC8C810; }
        .card-placeholder { width: 100%; aspect-ratio: 1/1; background: #7EC8C810; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .card-body { padding: 10px 12px 12px; }
        .card-name { font-size: 12px; font-weight: 700; color: #fff; line-height: 1.3; margin-bottom: 5px; min-height: 30px; }
        .card-price { font-size: 13px; font-weight: 800; color: #7EC8C8; }
        .card-price.consultar { color: #7EC8C866; font-size: 12px; font-weight: 600; }

        /* FOOTER */
        .footer { margin-top: 56px; padding-top: 22px; border-top: 1px solid #7EC8C814; display: flex; justify-content: center; align-items: center; gap: 20px; }
        .footer-dot { width: 3px; height: 3px; border-radius: 50%; background: #7EC8C833; }
        .footer-text { font-size: 11px; color: #ffffff28; letter-spacing: 1px; }
      `}</style>

      <PrintButton />

      <div className="wrap">
        <div className="header">
          <div className="logo-row">
            <div className="logo-circle">🐟</div>
            <div>
              <div className="brand">VITTO <em>MARE</em></div>
              <div className="tagline">PESCADOS · MARISCOS</div>
            </div>
          </div>
          <div className="subtitle">SELECCIÓN DEL DÍA · {today.toUpperCase()}</div>
          <div className="badge">CATÁLOGO DE PRECIOS</div>
        </div>

        {Object.entries(byCategory).map(([cat, prods]) => (
          <div key={cat} className="cat-section">
            <div className="cat-divider">
              <div className="cat-line" />
              <div className="cat-label">{cat.toUpperCase()}</div>
              <div className="cat-line" />
            </div>
            <div className="grid">
              {prods.map(p => {
                const price = p.price
                  ? `$${Number(p.price).toLocaleString('es-AR')} / ${p.unit || 'kg'}`
                  : 'Consultar precio'
                return (
                  <div key={p.id} className="card">
                    {p.image_url
                      ? <img src={p.image_url} className="card-img" alt={p.name} />
                      : <div className="card-placeholder">🐟</div>
                    }
                    <div className="card-body">
                      <div className="card-name">{p.name}</div>
                      <div className={`card-price${!p.price ? ' consultar' : ''}`}>{price}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="footer">
          <span className="footer-text">vittomare.com</span>
          <div className="footer-dot" />
          <span className="footer-text">Pedidos por WhatsApp</span>
          <div className="footer-dot" />
          <span className="footer-text">Entrega a domicilio</span>
        </div>
      </div>
    </>
  )
}
