import { createClient } from '@/lib/supabase/server'
import ClientRow from '@/components/ui/ClientRow'
import Link from 'next/link'
import type { Client } from '@/lib/types'

export const dynamic = 'force-dynamic'

const SELECT = 'id, name, type, status, rubro, city, phone, email, instagram, website, score, channel, notes, tags, last_contact, next_followup, created_at, prioridad, temperatura, proxima_accion, probabilidad_cierre'

function Bloque({ emoji, titulo, desc, color, clientes }: { emoji: string; titulo: string; desc: string; color: string; clientes: Client[] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 800, color }}>{emoji} {titulo} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>({clientes.length})</span></div>
        <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{desc}</div>
      </div>
      {clientes.length === 0
        ? <div style={{ fontSize: '0.82rem', color: 'var(--muted)', padding: '8px 0' }}>Nada pendiente acá. 🎉</div>
        : clientes.map(c => <ClientRow key={c.id} client={c} />)}
    </div>
  )
}

export default async function ContactarHoyPage() {
  const db = await createClient()
  const hoy = new Date().toISOString().split('T')[0]
  const hace20 = new Date(Date.now() - 20 * 86400000).toISOString()

  const [nuevosRes, seguimientosRes, reactivarRes] = await Promise.all([
    // Nuevos sin contactar, mejores primero
    db.from('clients').select(SELECT).is('fecha_primer_contacto', null).order('score', { ascending: false, nullsFirst: false }).limit(60),
    // Seguimientos vencidos o de hoy (fecha de próximo seguimiento cargada)
    db.from('clients').select(SELECT).not('next_followup', 'is', null).lte('next_followup', hoy).order('next_followup', { ascending: true }).limit(40),
    // Clientes a reactivar: compraron y no los tocás hace 20+ días
    db.from('clients').select(SELECT).in('status', ['cliente', 'cliente_recurrente']).lt('last_contact', hace20).order('last_contact', { ascending: true }).limit(40),
  ])

  // Nuevos: solo los que tienen un canal (teléfono o instagram), tope 25
  const nuevos = ((nuevosRes.data || []) as Client[])
    .filter(c => c.phone || c.instagram)
    .slice(0, 25)
  const seguimientos = (seguimientosRes.data || []) as Client[]
  const reactivar = (reactivarRes.data || []) as Client[]

  const total = nuevos.length + seguimientos.length + reactivar.length

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>🎯 Contactar hoy</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Tu cola del día: <strong>{total}</strong> contactos priorizados. Trabajá de arriba hacia abajo con los botones de cada fila (WhatsApp / Instagram / marcar).
        </p>
      </div>

      <Bloque emoji="🆕" titulo="Nuevos para primer contacto" color="#DD2A7B"
        desc="Prospectos sin contactar, mejores por score. Seguí el ritmo del termómetro." clientes={nuevos} />

      <Bloque emoji="🔁" titulo="Seguimientos pendientes" color="#f59e0b"
        desc="Ya los contactaste y tienen fecha de seguimiento para hoy o vencida. Acá se cierra la venta." clientes={seguimientos} />

      <Bloque emoji="💰" titulo="Reactivar (recompra)" color="#22c55e"
        desc="Clientes que compraron y no tocás hace 20+ días. Retener factura más que conseguir." clientes={reactivar} />

      {total === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
          No hay nada en la cola. Cargá prospectos desde <Link href="/admin/prospecting" style={{ color: 'var(--accent)' }}>Prospección</Link> o agendá seguimientos.
        </div>
      )}
    </div>
  )
}
