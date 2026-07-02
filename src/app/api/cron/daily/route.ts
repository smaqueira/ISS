import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDailyTasks } from '@/lib/tasks/generator'
import { generateFollowUp } from '@/lib/ai/followup'
import { sendMessage } from '@/lib/telegram/send'
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
    await db.from('interactions').insert({ client_id: c.id, channel: 'email', type: 'seguimiento', notes: `Follow-up día ${days} — ${fu.subject}`, ai_generated: true })
  }

  // Marcar inactivos (14+ días sin contacto)
  const coldIds = clients.filter(c => c.status === 'contactado' && c.last_contact && daysSince(c.last_contact) > 14).map(c => c.id)
  if (coldIds.length > 0) await db.from('clients').update({ status: 'inactivo' }).in('id', coldIds)

  // Enviar briefing a Telegram
  const summary = {
    nuevos: clients.filter(c => c.status === 'nuevo').length,
    seguimientos: toFollowUp.length,
    pedidos: 0,
  }
  await sendMessage(formatBriefing(tasks, summary))

  return NextResponse.json({ tasks: tasks.length, followups: toFollowUp.length, cold: coldIds.length })
}
