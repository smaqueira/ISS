import { createClient } from '@/lib/supabase/server'
import ClientRow from '@/components/ui/ClientRow'
import ClientsAccordion from '@/components/clients/ClientsAccordion'
import Link from 'next/link'
import DeleteAllButton from '@/components/clients/DeleteAllButton'

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; origen?: string; q?: string; vista?: string; tag?: string }> }) {
  const filters = await searchParams
  const db = await createClient()

  let q = db.from('clients').select('*').order('created_at', { ascending: false })
  if (filters.type) q = q.eq('type', filters.type)
  if (filters.status) q = q.eq('status', filters.status)

  const { data: allClients } = await q
  const clients = (allClients || []).filter(c => {
    if (filters.q) {
      const search = filters.q.toLowerCase()
      return c.name?.toLowerCase().includes(search) || c.city?.toLowerCase().includes(search) || c.rubro?.toLowerCase().includes(search)
    }
    if (filters.origen === 'agente') return !!c.score && c.status === 'nuevo'
    if (filters.origen === 'manual') return !c.score || c.score === 0
    if (filters.tag === 'sin_clasificar') return !(c.tags || []).includes('listo') && !(c.tags || []).includes('sin_datos')
    if (filters.tag) return (c.tags || []).includes(filters.tag)
    return true
  })

  // Contadores para las tabs
  const total = allClients?.length || 0
  const nuevosAgente = (allClients || []).filter(c => !!c.score && c.status === 'nuevo').length
  const hoy = new Date().toISOString().split('T')[0]
  const hoyCount = (allClients || []).filter(c => c.created_at?.startsWith(hoy)).length

  const activeFilter = filters.vista === 'zona' ? 'zona' : filters.vista === 'rubro' ? 'rubro' : (filters.tag || filters.origen || filters.type || filters.status || 'todos')
  const listoCount = (allClients || []).filter(c => (c.tags || []).includes('listo')).length
  const sinDatosCount = (allClients || []).filter(c => (c.tags || []).includes('sin_datos')).length
  const sinClasificarCount = (allClients || []).filter(c => !(c.tags || []).includes('listo') && !(c.tags || []).includes('sin_datos')).length

  function groupBy(key: 'city' | 'rubro', fallback: string) {
    return Object.entries(
      clients.reduce<Record<string, typeof clients>>((acc, c) => {
        const val = c[key]?.trim() || fallback
        if (!acc[val]) acc[val] = []
        acc[val].push(c)
        return acc
      }, {})
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([zona, cls]) => ({ zona, clients: cls }))
  }

  const groupedZona = groupBy('city', 'Sin zona')
  const groupedRubro = groupBy('rubro', 'Sin rubro')

  const chipStyle = (active: boolean) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: active ? 700 : 400,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'white' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    textDecoration: 'none',
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>Contactos</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{total} en total · {hoyCount} ingresados hoy</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <DeleteAllButton total={total} />
          <Link href="/admin/clients/import" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>📥 Importar CSV</Link>
          <Link href="/admin/clients/new" className="btn btn-primary">+ Agregar</Link>
        </div>
      </div>

      {/* Tabs principales */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link href="/admin/clients" style={chipStyle(activeFilter === 'todos')}>Todos ({total})</Link>
        <Link href="/admin/clients?origen=agente" style={chipStyle(activeFilter === 'agente')}>🤖 Del agente ({nuevosAgente})</Link>
        <Link href="/admin/clients?status=nuevo" style={chipStyle(activeFilter === 'nuevo')}>Nuevos</Link>
        <Link href="/admin/clients?status=contactado" style={chipStyle(activeFilter === 'contactado')}>Contactados</Link>
        <Link href="/admin/clients?status=interesado" style={chipStyle(activeFilter === 'interesado')}>Interesados</Link>
        <Link href="/admin/clients?status=cliente" style={chipStyle(activeFilter === 'cliente')}>Clientes</Link>
        <Link href="/admin/clients?status=inactivo" style={chipStyle(activeFilter === 'inactivo')}>Inactivos</Link>
        <Link href="/admin/clients?type=b2b" style={chipStyle(activeFilter === 'b2b')}>Empresas</Link>
        <Link href="/admin/clients?type=b2c" style={chipStyle(activeFilter === 'b2c')}>Particulares</Link>
        <Link href="/admin/clients?tag=listo" style={chipStyle(activeFilter === 'listo')}>✅ Listos ({listoCount})</Link>
        <Link href="/admin/clients?tag=sin_datos" style={chipStyle(activeFilter === 'sin_datos')}>⚠️ Sin datos ({sinDatosCount})</Link>
        <Link href="/admin/clients?tag=sin_clasificar" style={chipStyle(activeFilter === 'sin_clasificar')}>❓ Sin clasificar ({sinClasificarCount})</Link>
        <Link href="/admin/clients?vista=zona" style={chipStyle(activeFilter === 'zona')}>📍 Por zona</Link>
        <Link href="/admin/clients?vista=rubro" style={chipStyle(activeFilter === 'rubro')}>🏷️ Por rubro</Link>
      </div>

      {/* Buscador */}
      <form method="GET" action="/admin/clients" style={{ marginBottom: 16 }}>
        <input name="q" defaultValue={filters.q || ''} placeholder="Buscar por nombre, zona o rubro..." style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }} />
      </form>

      {/* Lista */}
      <div>
        {clients.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            {filters.origen === 'agente'
              ? <span>El agente todavía no importó prospectos. <Link href="/admin/agente" style={{ color: 'var(--accent)' }}>Ejecutá el turno mañana →</Link></span>
              : <span>No hay contactos. <Link href="/admin/clients/new" style={{ color: 'var(--accent)' }}>Agregá el primero</Link></span>
            }
          </div>
        )}
        {filters.vista === 'zona'
          ? <ClientsAccordion grouped={groupedZona} />
          : filters.vista === 'rubro'
          ? <ClientsAccordion grouped={groupedRubro} />
          : clients.map(c => <ClientRow key={c.id} client={c} />)
        }
      </div>
    </div>
  )
}
