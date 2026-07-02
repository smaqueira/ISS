import { createClient } from '@/lib/supabase/server'
import ClientRow from '@/components/ui/ClientRow'
import Link from 'next/link'

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const filters = await searchParams
  const db = await createClient()

  let q = db.from('clients').select('*').order('score', { ascending: false })
  if (filters.type) q = q.eq('type', filters.type)
  if (filters.status) q = q.eq('status', filters.status)

  const { data: clients } = await q

  const statuses = ['nuevo', 'contactado', 'interesado', 'cliente', 'inactivo']
  const types = ['b2b', 'b2c']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Clientes ({clients?.length || 0})</h1>
        <Link href="/admin/clients/new" className="btn btn-primary">+ Agregar cliente</Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link href="/admin/clients" className={`btn btn-ghost`} style={{ fontSize: '0.78rem', padding: '5px 12px' }}>Todos</Link>
        {types.map(t => (
          <Link key={t} href={`/admin/clients?type=${t}`} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
            {t.toUpperCase()}
          </Link>
        ))}
        {statuses.map(s => (
          <Link key={s} href={`/admin/clients?status=${s}`} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px', textTransform: 'capitalize' }}>
            {s}
          </Link>
        ))}
      </div>

      {/* Lista */}
      <div>
        {clients?.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            No hay clientes todavía. <Link href="/admin/clients/new" style={{ color: 'var(--accent)' }}>Agregá el primero</Link>
          </div>
        )}
        {clients?.map(c => <ClientRow key={c.id} client={c} />)}
      </div>
    </div>
  )
}
