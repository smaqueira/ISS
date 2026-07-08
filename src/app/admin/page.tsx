import { createClient } from '@/lib/supabase/server'
import { generateDailyTasks } from '@/lib/tasks/generator'
import MetricCard from '@/components/ui/MetricCard'
import DashboardTasks from '@/components/dashboard/DashboardTasks'
import { formatARS } from '@/lib/utils'

export default async function AdminPage() {
  const db = await createClient()

  const now = new Date()
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7)
  const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
  const startOfPrevMonth = new Date(startOfMonth); startOfPrevMonth.setMonth(startOfMonth.getMonth() - 1)

  const [{ data: clients }, { data: orders }, { data: tasks }, { data: allOrders }] = await Promise.all([
    db.from('clients').select('*'),
    db.from('orders').select('*').gte('created_at', startOfMonth.toISOString()),
    db.from('daily_tasks').select('*').eq('date', now.toISOString().split('T')[0]).eq('done', false),
    db.from('orders').select('*').gte('created_at', startOfPrevMonth.toISOString()),
  ])

  const cl = clients || []
  const od = orders || []
  const daily = tasks?.length ? tasks : generateDailyTasks(cl)

  const revenue = od.filter(o => o.status === 'entregado').reduce((s, o) => s + (o.total || 0), 0)
  const prevOrders = (allOrders || []).filter(o => o.created_at < startOfMonth.toISOString())
  const prevRevenue = prevOrders.filter(o => o.status === 'entregado').reduce((s, o) => s + (o.total || 0), 0)
  const revenueChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null

  const pending = od.filter(o => ['pendiente', 'confirmado', 'preparacion'].includes(o.status)).length
  const newThisWeek = cl.filter(c => new Date(c.created_at) >= startOfWeek).length
  const b2bClients = cl.filter(c => c.type === 'b2b' && c.status === 'cliente').length
  const b2cClients = cl.filter(c => c.type === 'b2c' && c.status === 'cliente').length
  const convRate = cl.length > 0 ? Math.round((cl.filter(c => c.status === 'cliente').length / cl.length) * 100) : 0

  // Top zonas
  const zonaCounts: Record<string, number> = {}
  cl.forEach(c => { if (c.city) zonaCounts[c.city] = (zonaCounts[c.city] || 0) + 1 })
  const topZonas = Object.entries(zonaCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Últimos pedidos
  const lastOrders = od.slice(0, 5)

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Buenos días ⚡</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        {now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Métricas principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <MetricCard label="Ventas del mes" value={formatARS(revenue)} icon="💰" color="var(--accent)"
          sub={revenueChange != null ? `${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs mes anterior` : `${pending} pedidos activos`} />
        <MetricCard label="Clientes activos" value={cl.filter(c => c.status === 'cliente').length} icon="✅" color="#22c55e"
          sub={`Empresas: ${b2bClients} · Particulares: ${b2cClients}`} />
        <MetricCard label="Leads nuevos (7d)" value={newThisWeek} icon="🎯" color="#3b82f6"
          sub={`${cl.filter(c => c.status === 'nuevo').length} sin contactar`} />
        <MetricCard label="Tasa de conversión" value={`${convRate}%`} icon="📈" color="#a855f7"
          sub={`${cl.length} leads totales`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Pipeline */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Pipeline de ventas</div>
          {[
            { label: 'Nuevo', status: 'nuevo', color: '#3b82f6' },
            { label: 'Contactado', status: 'contactado', color: '#eab308' },
            { label: 'Interesado', status: 'interesado', color: '#f97316' },
            { label: 'Cliente', status: 'cliente', color: '#22c55e' },
            { label: 'Inactivo', status: 'inactivo', color: '#64748b' },
          ].map(s => {
            const count = cl.filter(c => c.status === s.status).length
            const pct = cl.length > 0 ? (count / cl.length) * 100 : 0
            return (
              <div key={s.status} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>{s.label}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ background: s.color, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Top zonas */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Top zonas</div>
          {topZonas.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Sin datos de zonas aún.</div>}
          {topZonas.map(([zona, count], i) => {
            const max = topZonas[0]?.[1] || 1
            return (
              <div key={zona} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>{i + 1}. {zona}</span>
                  <span style={{ fontWeight: 600 }}>{count} clientes</span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 4, height: 6 }}>
                  <div style={{ background: 'var(--accent)', width: `${(count / max) * 100}%`, height: '100%', borderRadius: 4 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Últimos pedidos */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Últimos pedidos</div>
            <a href="/admin/orders" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>Ver todos →</a>
          </div>
          {lastOrders.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Sin pedidos este mes.</div>}
          {lastOrders.map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>#{o.id.slice(0, 8)}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{new Date(o.created_at).toLocaleDateString('es-AR')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>{formatARS(o.total || 0)}</div>
                <span className={`badge badge-${o.status === 'entregado' ? 'cliente' : o.status === 'cancelado' ? 'inactivo' : 'contactado'}`} style={{ fontSize: '0.65rem' }}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>Acciones rápidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/admin/prospecting', icon: '🔍', label: 'Buscar nuevos leads', desc: 'Prospección por zona y rubro' },
              { href: '/admin/broadcast', icon: '📣', label: 'Broadcast B2C', desc: 'Enviar oferta a todos tus clientes' },
              { href: '/admin/clients/import', icon: '📥', label: 'Importar contactos', desc: 'Subir Excel o CSV' },
              { href: '/admin/images', icon: '🎨', label: 'Generar imagen', desc: 'Flyer, story o banner con IA' },
              { href: '/admin/grupos', icon: '👥', label: 'Buscar grupos', desc: 'WhatsApp y Facebook por zona' },
            ].map(a => (
              <a key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{a.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{a.desc}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Tareas del día */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
          Tareas de hoy ({daily.filter((t: { done: boolean }) => !t.done).length} pendientes)
        </h2>
        <DashboardTasks tasks={daily} />
      </div>
    </div>
  )
}
