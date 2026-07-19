import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatARS, formatDate, waLink } from '@/lib/utils'
import DeleteClientButton from '@/components/clients/DeleteClientButton'
import WhatsAppButton from '@/components/clients/WhatsAppButton'
import BackButton from '@/components/ui/BackButton'
import { STATUS_LABELS, STATUS_COLORS, PRIORIDAD_OPTIONS, TEMPERATURA_OPTIONS, ACCION_OPTIONS, MOTIVO_PERDIDA_OPTIONS, CHANNEL_LABELS } from '@/lib/crm'
import type { ClientHistory } from '@/lib/types'
import ClientTasks from '@/components/clients/ClientTasks'
import ClientFiles from '@/components/clients/ClientFiles'

type Params = Promise<{ id: string }>

function badge(label: string, color: string) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: color + '22', color, border: `1px solid ${color}55` }}>
      {label}
    </span>
  )
}

function labelOf(opts: { value: string; label: string }[], val?: string) {
  return val ? (opts.find(o => o.value === val)?.label ?? val) : null
}

function isOverdue(date?: string) {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}
function isToday(date?: string) {
  if (!date) return false
  return new Date(date).toDateString() === new Date().toDateString()
}

export default async function ClientDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()

  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  const [{ data: interactions }, { data: orders }, { data: history }] = await Promise.all([
    db.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    db.from('orders').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    db.from('client_history').select('*').eq('client_id', id).order('fecha', { ascending: false }),
  ])

  const statusColor = STATUS_COLORS[client.status] || '#6366f1'
  const statusLabel = STATUS_LABELS[client.status] || client.status
  const overdue = isOverdue(client.next_followup)
  const today = isToday(client.next_followup)

  const prioColor = PRIORIDAD_OPTIONS.find(o => o.value === client.prioridad)?.color
  const tempColor = TEMPERATURA_OPTIONS.find(o => o.value === client.temperatura)?.color

  return (
    <div style={{ maxWidth: 740 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <BackButton />
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{client.name}</h1>
        <span className={`badge badge-${client.type}`}>{client.type.toUpperCase()}</span>
        {badge(statusLabel, statusColor)}
        {client.prioridad && prioColor && badge(labelOf(PRIORIDAD_OPTIONS, client.prioridad)!, prioColor)}
        {client.temperatura && tempColor && badge(labelOf(TEMPERATURA_OPTIONS, client.temperatura)!, tempColor)}
      </div>

      {/* Alerta seguimiento */}
      {(overdue || today) && (
        <div style={{ background: overdue ? '#ef444420' : '#f59e0b20', border: `1px solid ${overdue ? '#ef4444' : '#f59e0b'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: '0.85rem', color: overdue ? '#ef4444' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
          {overdue ? '🔴 Seguimiento vencido' : '🟡 Seguimiento para hoy'} — {client.next_followup?.split('T')[0]}
          {client.proxima_accion && <span style={{ color: 'var(--muted)' }}>· {labelOf(ACCION_OPTIONS, client.proxima_accion)}</span>}
        </div>
      )}

      {/* Grid principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* Datos de contacto */}
        <div className="card">
          <div style={sectionTitle}>Contacto</div>
          {([
            ['Empresa', client.empresa],
            ['Contacto', client.contacto_nombre ? `${client.contacto_nombre}${client.contacto_cargo ? ` · ${client.contacto_cargo}` : ''}` : undefined],
            ['Rubro', client.rubro],
            ['Ciudad', client.city],
            ['Email', client.email],
            ['Teléfono', client.phone],
            ['Instagram', client.instagram],
            ['Web', client.website],
          ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
            <div key={label} style={row}>
              <span style={{ color: 'var(--muted)' }}>{label}</span>
              <span style={{ textAlign: 'right', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Score + probabilidad */}
        <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div style={{ fontSize: '2.6rem', fontWeight: 800, color: client.score >= 75 ? '#22c55e' : client.score >= 50 ? '#eab308' : '#ef4444' }}>
            {client.score}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Score IA</div>
          {client.probabilidad_cierre != null && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#22c55e' }}>{client.probabilidad_cierre}%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Prob. cierre</div>
            </>
          )}
          {client.notes && <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>{client.notes}</div>}
        </div>
      </div>

      {/* Seguimiento comercial */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Seguimiento comercial</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {([
            ['Primer contacto', client.fecha_primer_contacto?.split('T')[0]],
            ['Último contacto', client.last_contact?.split('T')[0]],
            ['Próximo seguimiento', client.next_followup?.split('T')[0]],
            ['Próxima acción', labelOf(ACCION_OPTIONS, client.proxima_accion)],
            ['Canal de entrada', client.channel ? CHANNEL_LABELS[client.channel] || client.channel : undefined],
          ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
            <div key={label} style={{ fontSize: '0.82rem' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.7rem', marginBottom: 2 }}>{label}</div>
              <div>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info comercial */}
      {(client.productos_interes || client.proveedor_actual || client.presupuesto_estimado || client.motivo_perdida || client.observaciones) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>Información comercial</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              ['Productos de interés', client.productos_interes],
              ['Proveedor actual', client.proveedor_actual],
              ['Presupuesto estimado', client.presupuesto_estimado ? formatARS(client.presupuesto_estimado) : null],
              ['Motivo de pérdida', labelOf(MOTIVO_PERDIDA_OPTIONS, client.motivo_perdida)],
            ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={row}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}
            {client.observaciones && (
              <div style={{ fontSize: '0.82rem' }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.7rem', marginBottom: 4 }}>Observaciones</div>
                <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{client.observaciones}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags personalizadas */}
      {(client.tags || []).filter((t: string) => !['listo', 'sin_datos'].includes(t)).length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {(client.tags as string[]).filter(t => !['listo', 'sin_datos'].includes(t)).map(tag => (
            <span key={tag} style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: 'var(--accent)22', color: 'var(--accent)', border: '1px solid var(--accent)55' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Acciones rápidas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {client.phone && <WhatsAppButton clientId={id} />}
        {client.phone && (
          <a
            href={`https://wa.me/${client.phone}?text=${encodeURIComponent('¡Hola! Te comparto nuestro catálogo de productos de hoy 👇\nhttps://app.vittomare.com/api/catalogo/imagen')}`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost"
          >📲 Catálogo</a>
        )}
        {client.email && <a href={`mailto:${client.email}`} className="btn btn-ghost">📧 Email</a>}
        <Link href={`/admin/orders/new?client=${id}`} className="btn btn-ghost">📦 Nuevo pedido</Link>
        <Link href={`/admin/clients/${id}/edit`} className="btn btn-ghost">✏️ Editar</Link>
        <DeleteClientButton id={id} />
      </div>

      {/* Pedidos */}
      {orders && orders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitle}>Pedidos</div>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
              <span>{formatDate(o.created_at)}</span>
              <span style={{ textTransform: 'capitalize', color: 'var(--muted)' }}>{o.status}</span>
              <span style={{ fontWeight: 700 }}>{formatARS(o.total || 0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tareas */}
      <div className="card" style={{ marginBottom: 20 }}>
        <ClientTasks clientId={id} />
      </div>

      {/* Archivos adjuntos */}
      <div className="card" style={{ marginBottom: 20 }}>
        <ClientFiles clientId={id} />
      </div>

      {/* Historial cronológico */}
      <div>
        <div style={sectionTitle}>Historial</div>
        {(!history?.length && !interactions?.length) && (
          <div className="card" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin historial registrado.</div>
        )}
        {/* Combinar history + interactions en orden cronológico */}
        {[
          ...(history || []).map(h => ({ ...h, _type: 'history' as const })),
          ...(interactions || []).map(i => ({ id: i.id, fecha: i.created_at, usuario: i.ai_generated ? 'IA' : 'usuario', accion: `${i.channel} · ${i.type}`, detalle: i.notes, _type: 'interaction' as const })),
        ]
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .map(item => (
            <div key={item.id + item._type} className="card" style={{ marginBottom: 8, fontSize: '0.82rem', borderLeft: `3px solid ${item._type === 'history' ? 'var(--accent)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>{item.accion}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{formatDate(item.fecha)} · {item.usuario}</span>
              </div>
              {item.detalle && <div style={{ color: 'var(--muted)' }}>{item.detalle}</div>}
            </div>
          ))
        }
      </div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 10 }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }
