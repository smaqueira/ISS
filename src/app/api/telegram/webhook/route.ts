import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProposal } from '@/lib/ai/proposals'
import { generateFollowUp } from '@/lib/ai/followup'
import { generateBroadcast } from '@/lib/ai/content'
import { sendMessage } from '@/lib/telegram/send'
import { formatTask } from '@/lib/telegram/format'

export async function POST(req: NextRequest) {
  const update = await req.json()
  const msg = update.message
  if (!msg) return NextResponse.json({ ok: true })

  const text = msg.text?.trim().toLowerCase() || ''
  const db = await createClient()

  // Ver tarea por número
  if (/^\d+$/.test(text)) {
    const index = parseInt(text) - 1
    const today = new Date().toISOString().split('T')[0]
    const { data: tasks } = await db.from('daily_tasks').select('*').eq('date', today).eq('done', false).order('created_at')
    const task = tasks?.[index]
    if (!task) return sendMessage('Tarea no encontrada.').then(() => NextResponse.json({ ok: true }))

    let detail: { whatsapp?: string; email?: string; subject?: string } = {}

    if (task.action === 'send_proposal' && task.client_id) {
      const { data: c } = await db.from('clients').select('*').eq('id', task.client_id).single()
      if (c) {
        const p = await generateProposal({ name: c.name, rubro: c.rubro || 'negocio', type: c.type, city: c.city })
        detail = { whatsapp: p.whatsapp, email: p.email, subject: p.subject }
      }
    }

    if (task.action === 'send_followup' && task.client_id) {
      const { data: c } = await db.from('clients').select('*').eq('id', task.client_id).single()
      if (c) {
        const f = await generateFollowUp({ name: c.name, rubro: c.rubro || 'negocio', type: c.type, days: task.payload?.days || 3 })
        detail = { whatsapp: f.whatsapp, email: f.email, subject: f.subject }
      }
    }

    if (task.action === 'broadcast') {
      const { data: products } = await db.from('products').select('name').eq('active', true).limit(5)
      const names = products?.map(p => p.name) || ['productos disponibles']
      const wa = await generateBroadcast({ products: names, type: task.payload?.type || 'viernes', client_name: task.payload?.client_name })
      detail = { whatsapp: wa }
    }

    await sendMessage(formatTask(task, detail))
    return NextResponse.json({ ok: true })
  }

  // Marcar tarea como hecha
  if (text.startsWith('hecho') || text === '✅') {
    const parts = text.split(' ')
    const n = parseInt(parts[1]) - 1
    const today = new Date().toISOString().split('T')[0]
    const { data: tasks } = await db.from('daily_tasks').select('*').eq('date', today).eq('done', false).order('created_at')
    const task = tasks?.[n]
    if (task) {
      await db.from('daily_tasks').update({ done: true }).eq('id', task.id)
      if (task.client_id) {
        await db.from('interactions').insert({ client_id: task.client_id, channel: 'sistema', type: 'tarea', notes: `Tarea completada: ${task.title}`, ai_generated: false })
        await db.from('clients').update({ last_contact: new Date().toISOString(), status: 'contactado' }).eq('id', task.client_id)
      }
      await sendMessage(`✅ Listo! *${task.title}* marcada como hecha.`)
    }
    return NextResponse.json({ ok: true })
  }

  await sendMessage('Mandá el número de la tarea para ver el detalle, o *hecho N* para marcarla completa.')
  return NextResponse.json({ ok: true })
}
