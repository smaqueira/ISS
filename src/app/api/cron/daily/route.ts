import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDailyTasks } from '@/lib/tasks/generator'
import { generateFollowUp } from '@/lib/ai/followup'
import { sendMessage } from '@/lib/telegram/send'
import { sendProposalEmail } from '@/lib/email/send'
import { formatBriefing } from '@/lib/telegram/format'
import { daysSince } from '@/lib/utils'

// Vercel Cron: todos los días a las 8am
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await createClient()
  const { data: clients } = await db.from('clients').select('*')
  if (!clients) return NextResponse.json({ ok: true })

  // Generar tareas del día
  const tasks = generateDailyTasks(clients)

  // Guardar tareas en DB
  await db.from('daily_tasks').delete().eq('date', new Date().toISOString().split('T')[0])
  if (tasks.length > 0) await db.from('daily_tasks').insert(tasks)

  // Auto follow-up por email para clientes sin respuesta
  const toFollowUp = clients.filter(c =>
    c.status === 'contactado' && c.last_contact &&
    (daysSince(c.last_contact) === 3 || daysSince(c.last_contact) === 7) && c.email
  )
  for (const c of toFollowUp) {
    const days = daysSince(c.last_contact)
    const fu = await generateFollowUp({ name: c.name, rubro: c.rubro || 'negocio', type: c.type, days })
    await sendProposalEmail({ to: c.email, client_name: c.name, subject: fu.subject, body: fu.email })
    await db.from('interactions').insert({ client_id: c.id, channel: 'email', type: 'seguimiento', notes: `Follow-up día ${days} — ${fu.subject}`, ai_generated: true })
  }

  // Marcar inactivos (14+ días sin contacto)
  const coldIds = clients.filter(c => c.status === 'contactado' && c.last_contact && daysSince(c.last_contact) > 14).map(c => c.id)
  if (coldIds.length > 0) await db.from('clients').update({ status: 'inactivo' }).in('id', coldIds)

  // Recordatorio: prospectos nuevos sin contactar hace más de 1 día
  const sinContactar = clients.filter(c => c.status === 'nuevo' && daysSince(c.created_at) >= 1)
  for (const c of sinContactar) {
    const yaExiste = tasks.find(t => t.client_id === c.id && t.action === 'send_proposal')
    if (!yaExiste) {
      tasks.push({
        id: '',
        created_at: new Date().toISOString(),
        title: `Contactar a ${c.name}`,
        description: `Prospecto nuevo sin contactar. Canal sugerido: ${c.channel || 'whatsapp'}.`,
        priority: 'urgente',
        action: 'send_proposal',
        client_id: c.id,
        done: false,
        payload: {},
      })
    }
  }

  // Enviar briefing a Telegram
  const summary = {
    nuevos: clients.filter(c => c.status === 'nuevo').length,
    seguimientos: toFollowUp.length,
    pedidos: 0,
  }
  await sendMessage(formatBriefing(tasks, summary))

  return NextResponse.json({ tasks: tasks.length, followups: toFollowUp.length, cold: coldIds.length })
}
