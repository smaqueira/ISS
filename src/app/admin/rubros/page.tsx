import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import RubrosManager from '@/components/clients/RubrosManager'

export const dynamic = 'force-dynamic'

export default async function RubrosPage() {
  const db = await createClient()
  const { data } = await db.from('clients').select('rubro')
  const count: Record<string, number> = {}
  for (const r of data || []) {
    const v = ((r.rubro as string) || '').trim()
    if (v) count[v] = (count[v] || 0) + 1
  }
  const rubros = Object.entries(count)
    .map(([name, n]) => ({ name, count: n }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>🏷️ Editar rubros</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          {rubros.length} rubros. Renombrá para corregir; si escribís el nombre <strong>exacto</strong> de otro, se <strong>fusionan</strong>.
        </p>
      </div>

      <div style={{ background: '#22c55e10', border: '1px solid #22c55e44', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        💡 Para unificar 3 variantes iguales (ej: <em>Bar con gastronomía</em>, <em>Bares con gastronomia</em>, <em>Bares con gastronomía</em>): renombrá las dos de menor cantidad al nombre exacto de la que querés dejar. El editor te autocompleta los rubros que ya existen.
      </div>

      <RubrosManager rubros={rubros} />

      <div style={{ marginTop: 16 }}>
        <Link href="/admin/clients" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>← Volver a Contactos</Link>
      </div>
    </div>
  )
}
