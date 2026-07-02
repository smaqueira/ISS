import type { DailyTask, DailyTask as Task } from '@/lib/types'

const EMOJI = { urgente: '🔴', importante: '🟡', rutina: '🟢' }

export function formatBriefing(tasks: Task[], summary: {
  nuevos: number
  seguimientos: number
  pedidos: number
}): string {
  const day = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  let msg = `🌅 *Buenos días! ${day}*\n\n`
  msg += `📊 *Resumen:*\n`
  msg += `• ${summary.nuevos} leads nuevos captados\n`
  msg += `• ${summary.seguimientos} clientes esperan seguimiento\n`
  msg += `• ${summary.pedidos} pedidos activos\n\n`

  if (tasks.length === 0) {
    msg += `✅ No hay tareas pendientes. ¡Buen día!`
    return msg
  }

  msg += `*Tus ${tasks.length} tareas de hoy:*\n\n`
  tasks.forEach((t, i) => {
    msg += `${EMOJI[t.priority]} *${i + 1}. ${t.title}*\n`
    msg += `   ${t.description}\n\n`
  })

  msg += `Respondé con el número de la tarea para ver el detalle y ejecutar.`
  return msg
}

export function formatTask(task: DailyTask, detail: {
  whatsapp?: string
  email?: string
  subject?: string
}): string {
  let msg = `${EMOJI[task.priority]} *${task.title}*\n\n`
  msg += `${task.description}\n\n`

  if (detail.whatsapp) {
    msg += `📱 *Mensaje WhatsApp listo:*\n_${detail.whatsapp}_\n\n`
  }
  if (detail.email && detail.subject) {
    msg += `📧 *Email listo:*\nAsunto: _${detail.subject}_\n_${detail.email}_\n\n`
  }

  msg += `Respondé:\n✅ *hecho* — para marcarla completa\n⏭ *posponer* — para mañana\n❌ *cerrar* — cliente no interesado`
  return msg
}

export function formatAlert(client_name: string, score: number, rubro: string): string {
  return `🔥 *Lead caliente detectado!*\n\n*${client_name}*\nRubro: ${rubro}\nScore: ${score}/100\n\nEl sistema ya generó la propuesta. ¿La enviamos?`
}
