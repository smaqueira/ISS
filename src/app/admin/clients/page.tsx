import { createClient } from '@/lib/supabase/server'
import ClientRow from '@/components/ui/ClientRow'
import ClientsAccordion from '@/components/clients/ClientsAccordion'
import Link from 'next/link'
import DeleteAllButton from '@/components/clients/DeleteAllButton'
import type { Client } from '@/lib/types'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/auth'

const PAGE_SIZE = 100

export default async function ClientsPage({ searchParams }: {
  searchParams: Promise<{ type?: string; status?: string; origen?: string; q?: string; vista?: string; tag?: string; page?: string }>
}) {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get(SESSION_COOKIE)?.value === 'admin'

  const filters = await searchParams
  const page = Math.max(1, parseInt(filters.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const db = await createClient()

  // Query base
  let baseQ = db.from('clients').select('id, name, type, status, rubro, city, phone, email, instagram, website, score, channel, notes, tags, last_contact, next_followup, created_at', { count: 'exact' })
  if (filters.type) baseQ = baseQ.eq('type', filters.type)
  if (filters.status) baseQ = baseQ.eq('status', filters.status)

  // Filtros que se pueden hacer en DB (evita el límite de 1000 filas de Supabase)
  if (filters.tag === 'listo') baseQ = baseQ.contains('tags', ['listo'])
  else if (filters.tag === 'sin_datos') baseQ = baseQ.contains('tags', ['sin_datos'])
  else if (filters.tag === 'sin_clasificar') {
    baseQ = baseQ.not('tags', 'cs', '{"listo"}').not('tags', 'cs', '{"sin_datos"}')
  }
  if (filters.q) {
    baseQ = baseQ.or(`name.ilike.%${filters.q}%,city.ilike.%${filters.q}%,rubro.ilike.%${filters.q}%`)
  }

  // Vistas de acordeón y origen necesitan todos los registros sin paginación
  const needsAllRows = !!(filters.origen || filters.vista === 'zona' || filters.vista === 'rubro')

  let allClients: Client[] | null = null
  let dbTotal = 0

  if (needsAllRows) {
    // Traer todos sin límite (Supabase permite hasta 1M con range abierto)
    const { data, count } = await baseQ.order('created_at', { ascending: false }).range(0, 9999)
    allClients = (data || []) as unknown as Client[]
    dbTotal = count || 0
  } else {
    // Paginación en DB
    const { data, count } = await baseQ.order('created_at', { ascending: false }).range(from, to)
    allClients = (data || []) as unknown as Client[]
    dbTotal = count || 0
  }

  // Contadores globales (siempre del total sin filtro de página)
  const { count: totalAll } = await db.from('clients').select('*', { count: 'exact', head: true })
  const { count: listoCount } = await db.from('clients').select('*', { count: 'exact', head: true }).contains('tags', ['listo'])
  const { count: sinDatosCount } = await db.from('clients').select('*', { count: 'exact', head: true }).contains('tags', ['sin_datos'])
  const hoy = new Date().toISOString().split('T')[0]
  const { count: hoyCount } = await db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', hoy)
  const { count: nuevosAgente } = await db.from('clients').select('*', { count: 'exact', head: true }).not('score', 'is', null).gt('score', 0).eq('status', 'nuevo')

  const clients = (allClients || []).filter(c => {
    if (filters.origen === 'agente') return !!c.score && c.status === 'nuevo'
    if (filters.origen === 'manual') return !c.score || c.score === 0
    return true
  })

  const total = needsAllRows ? clients.length : dbTotal
  const totalPages = needsAllRows ? 1 : Math.ceil(dbTotal / PAGE_SIZE)

  const activeFilter = filters.vista === 'zona' ? 'zona' : filters.vista === 'rubro' ? 'rubro' : (filters.tag || filters.origen || filters.type || filters.status || 'todos')

  function groupBy(key: 'city' | 'rubro', fallback: string) {
    return Object.entries(
      clients.reduce<Record<string, typeof clients>>((acc, c) => {
        const val = (c[key] as string | undefined)?.trim() || fallback
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

  // Construir URL preservando filtros actuales
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (filters.type) params.set('type', filters.type)
    if (filters.status) params.set('status', filters.status)
    if (filters.origen) params.set('origen', filters.origen)
    if (filters.q) params.set('q', filters.q)
    if (filters.vista) params.set('vista', filters.vista)
    if (filters.tag) params.set('tag', filters.tag)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/admin/clients${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>Contactos</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            {totalAll || 0} en total · {hoyCount || 0} ingresados hoy
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <DeleteAllButton total={totalAll || 0} />
          {isAdmin && <Link href="/admin/clients/import" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>📥 Importar CSV</Link>}
          {isAdmin && <Link href="/admin/clients/new" className="btn btn-primary">+ Agregar</Link>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link href="/admin/clients" style={chipStyle(activeFilter === 'todos')}>Todos ({totalAll || 0})</Link>
        <Link href="/admin/clients?origen=agente" style={chipStyle(activeFilter === 'agente')}>🤖 Del agente ({nuevosAgente || 0})</Link>
        <Link href="/admin/clients?status=nuevo" style={chipStyle(activeFilter === 'nuevo')}>Nuevos</Link>
        <Link href="/admin/clients?status=contactado" style={chipStyle(activeFilter === 'contactado')}>Contactados</Link>
        <Link href="/admin/clients?status=interesado" style={chipStyle(activeFilter === 'interesado')}>Interesados</Link>
        <Link href="/admin/clients?status=cliente" style={chipStyle(activeFilter === 'cliente')}>Clientes</Link>
        <Link href="/admin/clients?status=inactivo" style={chipStyle(activeFilter === 'inactivo')}>Inactivos</Link>
        <Link href="/admin/clients?type=b2b" style={chipStyle(activeFilter === 'b2b')}>Empresas</Link>
        <Link href="/admin/clients?type=b2c" style={chipStyle(activeFilter === 'b2c')}>Particulares</Link>
        <Link href="/admin/clients?tag=listo" style={chipStyle(activeFilter === 'listo')}>✅ Listos ({listoCount || 0})</Link>
        <Link href="/admin/clients?tag=sin_datos" style={chipStyle(activeFilter === 'sin_datos')}>⚠️ Sin datos ({sinDatosCount || 0})</Link>
        <Link href="/admin/clients?tag=sin_clasificar" style={chipStyle(activeFilter === 'sin_clasificar')}>❓ Sin clasificar</Link>
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          {page > 1 && (
            <Link href={pageUrl(page - 1)} style={{ ...chipStyle(false), padding: '6px 16px' }}>← Anterior</Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) => p === '...'
              ? <span key={`dots-${i}`} style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>…</span>
              : <Link key={p} href={pageUrl(p as number)} style={{ ...chipStyle(p === page), padding: '5px 10px', minWidth: 36, justifyContent: 'center' }}>{p}</Link>
            )
          }
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} style={{ ...chipStyle(false), padding: '6px 16px' }}>Siguiente →</Link>
          )}
        </div>
      )}
    </div>
  )
}
