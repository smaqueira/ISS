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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D1326; font-family: 'Montserrat', sans-serif; }
        .print-btn {
          position: fixed; top: 20px; right: 20px; z-index: 100;
          background: #7EC8C8; color: #0D1326; border: none;
          padding: 12px 28px; border-radius: 30px;
          font-weight: 700; font-size: 14px; cursor: pointer;
          box-shadow: 0 4px 20px #7EC8C844;
        }
        @media print {
          .print-btn { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        .catalog { max-width: 960px; margin: 0 auto; padding: 40px 32px 60px; }
        .header { text-align: center; padding: 40px 0 32px; border-bottom: 1px solid #7EC8C833; margin-bottom: 8px; }
        .logo-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 10px; }
        .logo-circle { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #7EC8C8; background: #7EC8C815; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .brand { font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 900; color: #fff; letter-spacing: -1px; }
        .brand span { color: #7EC8C8; }
        .tagline { font-size: 11px; color: #7EC8C888; letter-spacing: 5px; margin-top: 4px; }
        .date { font-size: 11px; color: #ffffff44; letter-spacing: 3px; margin-top: 14px; }
        .badge { display: inline-block; margin-top: 14px; padding: 6px 22px; border: 1px solid #C9A96E66; border-radius: 30px; font-size: 11px; color: #C9A96E; letter-spacing: 2px; }
        .cat-section { margin-top: 36px; }
        .cat-title-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .cat-line { flex: 1; height: 1px; background: #7EC8C833; }
        .cat-title { font-size: 10px; font-weight: 700; color: #7EC8C8; letter-spacing: 4px; }
        .product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .product-card { background: #ffffff08; border: 1px solid #7EC8C822; border-radius: 10px; overflow: hidden; }
        .product-img { width: 100%; height: 140px; object-fit: cover; background: #7EC8C810; display: block; }
        .product-img-placeholder { width: 100%; height: 140px; background: #7EC8C810; display: flex; align-items: center; justify-content: center; font-size: 36px; }
        .product-info { padding: 10px 12px 12px; }
        .product-name { font-size: 12px; font-weight: 700; color: #fff; line-height: 1.3; margin-bottom: 5px; }
        .product-price { font-size: 13px; font-weight: 800; color: #7EC8C8; }
        .product-price.consultar { color: #7EC8C866; }
        .footer { margin-top: 48px; padding-top: 22px; border-top: 1px solid #7EC8C822; text-align: center; font-size: 11px; color: #ffffff33; letter-spacing: 1px; display: flex; justify-content: center; gap: 24px; }
      `}</style>

      <PrintButton />

      <div className="catalog">
        <div className="header">
          <div className="logo-row">
            <div className="logo-circle">🐟</div>
            <div>
              <div className="brand">VITTO <span>MARE</span></div>
              <div className="tagline">PESCADOS · MARISCOS</div>
            </div>
          </div>
          <div className="date">SELECCIÓN DEL DÍA · {today.toUpperCase()}</div>
          <div className="badge">CATÁLOGO DE PRECIOS</div>
        </div>

        {Object.entries(byCategory).map(([cat, prods]) => (
          <div key={cat} className="cat-section">
            <div className="cat-title-row">
              <div className="cat-line" />
              <div className="cat-title">{cat.toUpperCase()}</div>
              <div className="cat-line" />
            </div>
            <div className="product-grid">
              {prods.map(p => {
                const price = p.price
                  ? `$${Number(p.price).toLocaleString('es-AR')} / ${p.unit || 'kg'}`
                  : 'Consultar precio'
                return (
                  <div key={p.id} className="product-card">
                    {p.image_url
                      ? <img src={p.image_url} className="product-img" alt={p.name} />
                      : <div className="product-img-placeholder">🐟</div>
                    }
                    <div className="product-info">
                      <div className="product-name">{p.name}</div>
                      <div className={`product-price${price === 'Consultar' ? ' consultar' : ''}`}>{price}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="footer">
          <span>vittomare.com</span>
          <span>·</span>
          <span>Pedidos por WhatsApp</span>
          <span>·</span>
          <span>Entrega a domicilio</span>
        </div>
      </div>
    </>
  )
}
