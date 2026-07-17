import { createClient } from '@/lib/supabase/server'
import ClientRow from '@/components/ui/ClientRow'
import ClientsAccordion from '@/components/clients/ClientsAccordion'
import Link from 'next/link'
import DeleteAllButton from '@/components/clients/DeleteAllButton'
import type { Client } from '@/lib/types'
import { cookies } from 'next/headers'
import { STATUS_LABELS, STATUS_COLORS, STATUS_OPTIONS, PRIORIDAD_OPTIONS, TEMPERATURA_OPTIONS, STATUS_GROUPS } from '@/lib/crm'

const PAGE_SIZE = 100

export default async function ClientsPage({ searchParams }: {
  searchParams: Promise<{
    type?: string; status?: string; origen?: string; q?: string
    vista?: string; tag?: string; page?: string
    prioridad?: string; temperatura?: string; vencidos?: string
    city?: string; desde?: string; hasta?: string; fu_desde?: string; fu_hasta?: string
  }>
}) {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('iss_session')?.value === 'admin'

  const filters = await searchParams
  const page = Math.max(1, parseInt(filters.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const db = await createClient()
  const hoy = new Date().toISOString().split('T')[0]

  // Query base
  let baseQ = db.from('clients').select(
    'id, name, type, status, rubro, city, phone, email, instagram, website, score, channel, notes, tags, last_contact, next_followup, created_at, prioridad, temperatura, proxima_accion, probabilidad_cierre',
    { count: 'exact' }
  )

  if (filters.type)       baseQ = baseQ.eq('type', filters.type)
  if (filters.status)     baseQ = baseQ.eq('status', filters.status)
  if (filters.prioridad)  baseQ = baseQ.eq('prioridad', filters.prioridad)
  if (filters.temperatura) baseQ = baseQ.eq('temperatura', filters.temperatura)
  if (filters.vencidos === '1') baseQ = baseQ.lt('next_followup', hoy)
  if (filters.city)     baseQ = baseQ.ilike('city', `%${filters.city}%`)
  if (filters.desde)    baseQ = baseQ.gte('last_contact', filters.desde)
  if (filters.hasta)    baseQ = baseQ.lte('last_contact', filters.hasta)
  if (filters.fu_desde) baseQ = baseQ.gte('next_followup', filters.fu_desde)
  if (filters.fu_hasta) baseQ = baseQ.lte('next_followup', filters.fu_hasta)

  if (filters.tag === 'listo')         baseQ = baseQ.contains('tags', ['listo'])
  else if (filters.tag === 'sin_datos') baseQ = baseQ.contains('tags', ['sin_datos'])
  else if (filters.tag === 'sin_clasificar') {
    baseQ = baseQ.not('tags', 'cs', '{"listo"}').not('tags', 'cs', '{"sin_datos"}')
  }

  if (filters.q) {
    baseQ = baseQ.or(`name.ilike.%${filters.q}%,city.ilike.%${filters.q}%,rubro.ilike.%${filters.q}%,phone.ilike.%${filters.q}%,email.ilike.%${filters.q}%,instagram.ilike.%${filters.q}%`)
  }

  const needsAllRows = !!(filters.origen || filters.vista === 'zona' || filters.vista === 'rubro')
  let allClients: Client[] = []
  let dbTotal = 0

  if (needsAllRows) {
    const { data, count } = await baseQ.order('created_at', { ascending: false }).range(0, 9999)
    allClients = (data || []) as unknown as Client[]
    dbTotal = count || 0
  } else {
    const { data, count } = await baseQ.order('created_at', { ascending: false }).range(from, to)
    allClients = (data || []) as unknown as Client[]
    dbTotal = count || 0
  }

  // Dashboard counters (all unfiltered)
  const [
    { count: totalAll },
    { count: listoCount },
    { count: sinDatosCount },
    { count: hoyCount },
    { count: nuevosAgente },
    { count: prospectos },
    { count: contactados },
    { count: interesados },
    { count: clientes },
    { count: clientesR },
    { count: perdidos },
    { count: seguimientoHoy },
    { count: seguimientoVencido },
  ] = await Promise.all([
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('clients').select('*', { count: 'exact', head: true }).contains('tags', ['listo']),
    db.from('clients').select('*', { count: 'exact', head: true }).contains('tags', ['sin_datos']),
    db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', hoy),
    db.from('clients').select('*', { count: 'exact', head: true }).not('score', 'is', null).gt('score', 0).in('status', ['nuevo', 'prospecto']),
    db.from('clients').select('*', { count: 'exact', head: true }).in('status', ['prospecto', 'nuevo']),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'contactado'),
    db.from('clients').select('*', { count: 'exact', head: true }).in('status', ['interesado', 'negociacion', 'presupuesto_enviado', 'esperando_respuesta', 'respondio']),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'cliente'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'cliente_recurrente'),
    db.from('clients').select('*', { count: 'exact', head: true }).in('status', ['perdido', 'no_interesado', 'inactivo']),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('next_followup', hoy),
    db.from('clients').select('*', { count: 'exact', head: true }).lt('next_followup', hoy).not('next_followup', 'is', null),
  ])

  const totalGanados = (clientes || 0) + (clientesR || 0)
  const totalActivos = (prospectos || 0) + (contactados || 0) + (interesados || 0)
  const conversionRate = totalAll && totalAll > 0 ? Math.round((totalGanados / totalAll) * 100) : 0

  const clients = (allClients || []).filter(c => {
    if (filters.origen === 'agente') return !!c.score && (c.status === 'nuevo' || c.status === 'prospecto')
    if (filters.origen === 'manual') return !c.score || c.score === 0
    return true
  })

  const total = needsAllRows ? clients.length : dbTotal
  const totalPages = needsAllRows ? 1 : Math.ceil(dbTotal / PAGE_SIZE)

  const activeFilter = filters.vista === 'zona' ? 'zona'
    : filters.vista === 'rubro' ? 'rubro'
    : (filters.tag || filters.origen || filters.status || filters.type || filters.prioridad || filters.temperatura || (filters.vencidos === '1' ? 'vencidos' : 'todos'))

  function groupBy(key: 'city' | 'rubro', fallback: string) {
    return Object.entries(
      clients.reduce<Record<string, typeof clients>>((acc, c) => {
        const val = (c[key] as string | undefined)?.trim() || fallback
        if (!acc[val]) acc[val] = []
        acc[val].push(c)
        return acc
      }, {})
    ).sort(([a], [b]) => a.localeCompare(b)).map(([zona, cls]) => ({ zona, clients: cls }))
  }

  const groupedZona  = groupBy('city', 'Sin zona')
  const groupedRubro = groupBy('rubro', 'Sin rubro')

  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: active ? 700 : 400,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'white' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    textDecoration: 'none', cursor: 'pointer',
  })

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (filters.type)        params.set('type', filters.type)
    if (filters.status)      params.set('status', filters.status)
    if (filters.origen)      params.set('origen', filters.origen)
    if (filters.q)           params.set('q', filters.q)
    if (filters.vista)       params.set('vista', filters.vista)
    if (filters.tag)         params.set('tag', filters.tag)
    if (filters.prioridad)   params.set('prioridad', filters.prioridad)
    if (filters.temperatura) params.set('temperatura', filters.temperatura)
    if (filters.vencidos)    params.set('vencidos', filters.vencidos)
    if (p > 1) params.set('page', String(p))
    return `/admin/clients${params.toString() ? `?${params}` : ''}`
  }

  const statCard = (label: string, value: number | null, color: string, href?: string) => (
    <Link href={href || '#'} style={{ textDecoration: 'none' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value ?? 0}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
      </div>
    </Link>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>Contactos</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            {totalAll || 0} en total · {hoyCount || 0} hoy
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && <DeleteAllButton total={totalAll || 0} />}
          {isAdmin && <Link href="/admin/clients/import" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>📥 CSV</Link>}
          {isAdmin && <Link href="/admin/clients/new" className="btn btn-primary">+ Agregar</Link>}
        </div>
      </div>

      {/* Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 20 }}>
        {statCard('Prospectos',    prospectos,      '#6366f1', '/admin/clients?status=prospecto')}
        {statCard('Contactados',   contactados,     '#3b82f6', '/admin/clients?status=contactado')}
        {statCard('Interesados',   interesados,     '#f59e0b', '/admin/clients?status=interesado')}
        {statCard('Clientes',      clientes,        '#22c55e', '/admin/clients?status=cliente')}
        {statCard('Recurrentes',   clientesR,       '#16a34a', '/admin/clients?status=cliente_recurrente')}
        {statCard('Perdidos',      perdidos,        '#ef4444', '/admin/clients?status=perdido')}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>{conversionRate}%</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>Conversión</div>
        </div>
        <Link href="/admin/clients?vencidos=1" style={{ textDecoration: 'none' }}>
          <div style={{ background: (seguimientoVencido || 0) > 0 ? '#ef444418' : 'var(--surface)', border: `1px solid ${(seguimientoVencido || 0) > 0 ? '#ef4444' : 'var(--border)'}`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{seguimientoVencido ?? 0}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>🔴 Vencidos</div>
          </div>
        </Link>
        <div style={{ background: (seguimientoHoy || 0) > 0 ? '#f59e0b18' : 'var(--surface)', border: `1px solid ${(seguimientoHoy || 0) > 0 ? '#f59e0b' : 'var(--border)'}`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{seguimientoHoy ?? 0}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>🟡 Hoy</div>
        </div>
      </div>

      {/* Filtros por estado */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <Link href="/admin/clients" style={chip(activeFilter === 'todos')}>Todos ({totalAll || 0})</Link>
        <Link href="/admin/clients?origen=agente" style={chip(activeFilter === 'agente')}>🤖 Agente ({nuevosAgente || 0})</Link>
        {STATUS_OPTIONS.map(s => (
          <Link key={s.value} href={`/admin/clients?status=${s.value}`} style={{ ...chip(activeFilter === s.value), borderColor: activeFilter === s.value ? 'var(--accent)' : STATUS_COLORS[s.value] + '55', color: activeFilter === s.value ? 'white' : STATUS_COLORS[s.value] }}>
            {s.label}
          </Link>
        ))}
      </div>

      {/* Filtros secundarios */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <Link href="/admin/clients?type=b2b" style={chip(activeFilter === 'b2b')}>Empresas</Link>
        <Link href="/admin/clients?type=b2c" style={chip(activeFilter === 'b2c')}>Particulares</Link>
        <Link href="/admin/clients?tag=listo" style={chip(activeFilter === 'listo')}>✅ Listos ({listoCount || 0})</Link>
        <Link href="/admin/clients?tag=sin_datos" style={chip(activeFilter === 'sin_datos')}>⚠️ Sin datos ({sinDatosCount || 0})</Link>
        <Link href="/admin/clients?tag=sin_clasificar" style={chip(activeFilter === 'sin_clasificar')}>❓ Sin clasificar</Link>
        <Link href="/admin/clients?vencidos=1" style={chip(activeFilter === 'vencidos')}>🔴 Vencidos ({seguimientoVencido || 0})</Link>
      </div>

      {/* Prioridad + Temperatura */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {PRIORIDAD_OPTIONS.map(p => (
          <Link key={p.value} href={`/admin/clients?prioridad=${p.value}`}
            style={{ ...chip(activeFilter === p.value), borderColor: activeFilter === p.value ? 'var(--accent)' : p.color + '66', color: activeFilter === p.value ? 'white' : p.color }}>
            Prioridad {p.label}
          </Link>
        ))}
        {TEMPERATURA_OPTIONS.map(t => (
          <Link key={t.value} href={`/admin/clients?temperatura=${t.value}`}
            style={{ ...chip(activeFilter === t.value), borderColor: activeFilter === t.value ? 'var(--accent)' : t.color + '66', color: activeFilter === t.value ? 'white' : t.color }}>
            {t.label}
          </Link>
        ))}
        <Link href="/admin/clients?vista=zona" style={chip(activeFilter === 'zona')}>📍 Por zona</Link>
        <Link href="/admin/clients?vista=rubro" style={chip(activeFilter === 'rubro')}>🏷️ Por rubro</Link>
      </div>

      {/* Buscador + filtros de fecha/ciudad */}
      <form method="GET" action="/admin/clients" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filters.status      && <input type="hidden" name="status"      value={filters.status} />}
        {filters.type        && <input type="hidden" name="type"        value={filters.type} />}
        {filters.prioridad   && <input type="hidden" name="prioridad"   value={filters.prioridad} />}
        {filters.temperatura && <input type="hidden" name="temperatura" value={filters.temperatura} />}
        <input name="q" defaultValue={filters.q || ''}
          placeholder="Buscar por nombre, WhatsApp, email, Instagram, zona o rubro..."
          style={fStyle} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="city" defaultValue={filters.city || ''} placeholder="Filtrar por ciudad..."
            style={{ ...fStyle, flex: 1, minWidth: 140 }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Último contacto:</span>
            <input type="date" name="desde" defaultValue={filters.desde || ''} style={{ ...fStyle, width: 140 }} />
            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>–</span>
            <input type="date" name="hasta" defaultValue={filters.hasta || ''} style={{ ...fStyle, width: 140 }} />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Próx. seguimiento:</span>
            <input type="date" name="fu_desde" defaultValue={filters.fu_desde || ''} style={{ ...fStyle, width: 140 }} />
            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>–</span>
            <input type="date" name="fu_hasta" defaultValue={filters.fu_hasta || ''} style={{ ...fStyle, width: 140 }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Filtrar</button>
          <a href="/admin/clients" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Limpiar</a>
        </div>
      </form>

      {/* Resultado */}
      <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 10 }}>
        {total} resultado{total !== 1 ? 's' : ''}
      </div>

      {/* Lista */}
      <div>
        {clients.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            {filters.origen === 'agente'
              ? <span>El agente todavía no importó prospectos. <Link href="/admin/agente" style={{ color: 'var(--accent)' }}>Ejecutá el turno →</Link></span>
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
          {page > 1 && <Link href={pageUrl(page - 1)} style={{ ...chip(false), padding: '6px 16px' }}>← Anterior</Link>}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
              acc.push(p); return acc
            }, [])
            .map((p, i) => p === '...'
              ? <span key={`d${i}`} style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>…</span>
              : <Link key={p} href={pageUrl(p as number)} style={{ ...chip(p === page), padding: '5px 10px', minWidth: 36, justifyContent: 'center' }}>{p}</Link>
            )
          }
          {page < totalPages && <Link href={pageUrl(page + 1)} style={{ ...chip(false), padding: '6px 16px' }}>Siguiente →</Link>}
        </div>
      )}
    </div>
  )
}

const fStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', width: '100%',
}
