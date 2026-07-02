import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatARS } from '@/lib/utils'

export default async function ProductsPage() {
  const db = await createClient()
  const { data: products } = await db.from('products').select('*').eq('active', true).order('category')

  type Product = { id: string; name: string; category: string; unit: string; stock?: number; price_retail: number; price_wholesale: number }
  const byCategory = (products || []).reduce((acc: Record<string, Product[]>, p: Product) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Productos ({products?.length || 0})</h1>
        <Link href="/admin/products/new" className="btn btn-primary">+ Nuevo producto</Link>
      </div>

      {Object.keys(byCategory).length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          No hay productos. <Link href="/admin/products/new" style={{ color: 'var(--accent)' }}>Agregá el primero</Link>
        </div>
      )}

      {(Object.entries(byCategory) as [string, Product[]][]).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--muted)', marginBottom: 8 }}>{cat}</div>
          {items.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Unidad: {p.unit}
                  {p.stock != null && ` · Stock: ${p.stock}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Minorista</div>
                <div style={{ fontWeight: 700 }}>{formatARS(p.price_retail)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Mayorista</div>
                <div style={{ fontWeight: 700, color: '#a855f7' }}>{formatARS(p.price_wholesale)}</div>
              </div>
              <Link href={`/admin/products/${p.id}`} className="btn btn-ghost" style={{ padding: '6px 10px' }}>→</Link>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
