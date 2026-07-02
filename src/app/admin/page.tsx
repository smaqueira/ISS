import { createClient } from '@/lib/supabase/server'
import { generateDailyTasks } from '@/lib/tasks/generator'
import MetricCard from '@/components/ui/MetricCard'
import DashboardTasks from '@/components/dashboard/DashboardTasks'
import { formatARS } from '@/lib/utils'

export default async function AdminPage() {
  const db = await createClient()

  const [{ data: clients }, { data: orders }, { data: tasks }] = await Promise.all([
    db.from('clients').select('*'),
    db.from('orders').select('*').gte('created_at', new Date(Date.now() - 86400000 * 30).toISOString()),
    db.from('daily_tasks').select('*').eq('date', new Date().toISOString().split('T')[0]).eq('done', false),
  ])

  const cl = clients || []
  const od = orders || []
  const daily = tasks?.length ? tasks : generateDailyTasks(cl)

  const revenue = od.filter(o => o.status === 'entregado').reduce((s, o) => s + (o.total || 0), 0)
  const pending = od.filter(o => ['pendiente', 'confirmado', 'preparacion'].includes(o.status)).length

  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Buenos días ⚡</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <MetricCard label="Leads nuevos" value={cl.filter(c => c.status === 'nuevo').length} icon="🎯" color="#3b82f6" />
        <MetricCard label="En seguimiento" value={cl.filter(c => c.status === 'contactado').length} icon="📬" color="#eab308" />
        <MetricCard label="Clientes activos" value={cl.filter(c => c.status === 'cliente').length} icon="✅" color="#22c55e" />
        <MetricCard label="Ventas del mes" value={formatARS(revenue)} icon="💰" color="var(--accent)" sub={`${pending} pedidos activos`} />
      </div>

      {/* Tareas del día */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
          Tareas de hoy ({daily.filter(t => !t.done).length} pendientes)
        </h2>
        <DashboardTasks tasks={daily} />
      </div>

      {/* Pipeline rápido */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Pipeline</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {['nuevo', 'contactado', 'interesado', 'cliente', 'inactivo'].map(s => (
            <div key={s} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{cl.filter(c => c.status === s).length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'capitalize', marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
