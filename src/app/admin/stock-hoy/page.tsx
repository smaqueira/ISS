import Link from 'next/link'
import { getBlueMarketCatalog } from '@/lib/bluemarket'

export const dynamic = 'force-dynamic'

// A qué rubros conviene ofrecer cada producto (por palabras clave del nombre)
function objetivos(nombre: string): string[] {
  const n = nombre.toLowerCase()
  if (/salm|at[uú]n|sashimi|trucha/.test(n)) return ['Casas de sushi', 'Restaurantes']
  if (/langostino|raba|calamar|pulpo|mejill|marisco|vieira|camar|almeja|mping/.test(n)) return ['Parrillas', 'Restaurantes']
  if (/merluz|lenguad|brotol|abadejo|pescad|filet/.test(n)) return ['Restaurantes', 'Casas de sushi']
  return ['Restaurantes', 'Parrillas']
}

const fmt = (p: number | null) => (p ? '$' + Number(p).toLocaleString('es-AR') : 'Consultar')

export default async function StockHoyPage() {
  const productos = (await getBlueMarketCatalog()) || []

  if (productos.length === 0) {
    return (
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6 }}>🐟 Stock de hoy</h1>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No hay stock disponible de BlueMarket ahora mismo.</div>
      </div>
    )
  }

  const destacados = productos.filter(p => p.featured)
  const estrella = destacados[0] || productos[0]

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>🐟 Stock de hoy</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Lo que hay disponible hoy y qué hacer con eso: a quién ofrecerlo y qué publicar.</p>
      </div>

      {/* Qué publicar */}
      <div className="card" style={{ marginBottom: 16, borderColor: '#C9A96E55' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C9A96E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>✨ Hoy publicá</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
          <li>📹 <strong>Reel de {estrella.name}</strong> — producto estrella del día.</li>
          {destacados.slice(1, 4).map(p => <li key={p.id}>📸 Historia de <strong>{p.name}</strong></li>)}
          {destacados.length <= 1 && productos.slice(1, 4).map(p => <li key={p.id}>📸 Historia de <strong>{p.name}</strong></li>)}
        </ul>
      </div>

      {/* A quién ofrecer por MD */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>📤 Ofrecé por MD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {productos.slice(0, 12).map(p => {
            const objs = objetivos(p.name)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', borderTop: '1px solid var(--border)', paddingTop: 6, flexWrap: 'wrap' }}>
                <span style={{ flex: 1, fontWeight: 600, minWidth: 140 }}>{p.name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {fmt(p.price)}</span></span>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>→</span>
                {objs.map(r => (
                  <Link key={r} href={`/admin/clients?rubro=${encodeURIComponent(r)}`} style={{ fontSize: '0.72rem', padding: '2px 9px', borderRadius: 12, border: '1px solid var(--accent)55', color: 'var(--accent)', textDecoration: 'none' }}>{r}</Link>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
        Los rubros son links: tocás y te lleva a esos contactos filtrados para ofrecerles el producto del día. Recordá: el catálogo se lo pasás cuando responden.
      </div>
    </div>
  )
}
