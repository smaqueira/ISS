import type { Client, DailyTask } from '@/lib/types'
import { daysSince, getDayName, isPayday } from '@/lib/utils'

export function generateDailyTasks(clients: Client[]): DailyTask[] {
  const tasks: DailyTask[] = []
  const now = new Date().toISOString()
  const day = getDayName()
  const payday = isPayday()

  // 1. Clientes con score alto sin contactar
  clients
    .filter(c => c.status === 'nuevo' && c.score >= 70)
    .slice(0, 3)
    .forEach(c => tasks.push({
      id: `hot-${c.id}`,
      priority: 'urgente',
      title: `Contactar: ${c.name}`,
      description: `Score ${c.score}/100. Rubro: ${c.rubro || 'negocio'}. Primer contacto pendiente.`,
      client_id: c.id,
      client_name: c.name,
      action: 'send_proposal',
      payload: { client_id: c.id },
      done: false,
      created_at: now,
    }))

  // 2. Follow-up día 3
  clients
    .filter(c => c.status === 'contactado' && c.last_contact && daysSince(c.last_contact) === 3)
    .slice(0, 3)
    .forEach(c => tasks.push({
      id: `followup3-${c.id}`,
      priority: 'importante',
      title: `Seguimiento: ${c.name}`,
      description: `3 días sin respuesta. Mandar segundo contacto.`,
      client_id: c.id,
      client_name: c.name,
      action: 'send_followup',
      payload: { client_id: c.id, days: 3 },
      done: false,
      created_at: now,
    }))

  // 3. Follow-up día 7
  clients
    .filter(c => c.status === 'contactado' && c.last_contact && daysSince(c.last_contact) === 7)
    .slice(0, 2)
    .forEach(c => tasks.push({
      id: `followup7-${c.id}`,
      priority: 'importante',
      title: `Último intento: ${c.name}`,
      description: `7 días sin respuesta. Último mensaje antes de archivar.`,
      client_id: c.id,
      client_name: c.name,
      action: 'send_followup',
      payload: { client_id: c.id, days: 7 },
      done: false,
      created_at: now,
    }))

  // 4. Broadcast viernes
  if (day === 'Viernes') tasks.push({
    id: 'broadcast-viernes',
    priority: 'rutina',
    title: 'Broadcast viernes 📢',
    description: 'Enviar novedades del fin de semana a todos los clientes activos.',
    action: 'broadcast',
    payload: { type: 'viernes' },
    done: false,
    created_at: now,
  })

  // 5. Broadcast quincena
  if (payday) tasks.push({
    id: 'broadcast-quincena',
    priority: 'rutina',
    title: 'Broadcast quincena 💰',
    description: 'Es día de cobro. Enviar combo especial a clientes activos.',
    action: 'broadcast',
    payload: { type: 'quincena' },
    done: false,
    created_at: now,
  })

  // 6. Clientes fríos a reactivar
  clients
    .filter(c => c.status === 'cliente' && c.last_contact && daysSince(c.last_contact) >= 14)
    .slice(0, 2)
    .forEach(c => tasks.push({
      id: `reactivar-${c.id}`,
      priority: 'rutina',
      title: `Reactivar: ${c.name}`,
      description: `${daysSince(c.last_contact!)} días sin comprar. Mandar mensaje de reactivación.`,
      client_id: c.id,
      client_name: c.name,
      action: 'broadcast',
      payload: { type: 'reactivar', client_id: c.id, client_name: c.name },
      done: false,
      created_at: now,
    }))

  // Ordenar: urgente primero
  const order = { urgente: 0, importante: 1, rutina: 2 }
  return tasks.sort((a, b) => order[a.priority] - order[b.priority])
}
