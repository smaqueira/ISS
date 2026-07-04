import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProposal } from '@/lib/ai/proposals'
import { generateFollowUp } from '@/lib/ai/followup'
import { generateBroadcast } from '@/lib/ai/content'
import { sendMessage, answerCallback } from '@/lib/telegram/send'
import { formatTask } from '@/lib/telegram/format'
import { getSetting } from '@/lib/settings'

const EMOJI: Record<string, string> = { urgente: '🔴', importante: '🟡', rutina: '🟢' }

async function getTodayTasks(db: Awaited<ReturnType<typeof createClient>>) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await db.from('daily_tasks').select('*').eq('date', today).eq('done', false).order('created_at')
  return data || []
}

async function sendMenu(chatId: string) {
  const now = new Date()
  const hour = now.getHours()
  const saludo = hour < 12 ? '¡Buenos días' : hour < 19 ? '¡Buenas tardes' : '¡Buenas noches'

  await sendMessage(
    `${saludo}! 👋 Soy tu asistente de ventas.\n\n¿Qué querés hacer?`,
    chatId,
    [
      [{ text: '📋 Ver tareas del día', callback_data: 'ver_tareas' }],
      [{ text: '📊 Resumen de clientes', callback_data: 'resumen' }],
      [{ text: '🤖 Correr agente prospector', callback_data: 'correr_agente' }],
    ]
  )
}

async function sendTaskList(chatId: string, db: Awaited<ReturnType<typeof createClient>>) {
  const tasks = await getTodayTasks(db)
  if (tasks.length === 0) {
    await sendMessage('✅ No tenés tareas pendientes por hoy. ¡Todo al día!', chatId, [
      [{ text: '🏠 Menú principal', callback_data: 'menu' }],
    ])
    return
  }

  let msg = `📋 *Tareas pendientes de hoy (${tasks.length}):*\n\n`
  tasks.forEach((t, i) => {
    msg += `${EMOJI[t.priority] || '⚪'} *${i + 1}. ${t.title}*\n`
    msg += `   ${t.description}\n\n`
  })
  msg += `Tocá una tarea para ver el detalle y ejecutarla:`

  const buttons = tasks.map((t, i) => [
    { text: `${EMOJI[t.priority] || '⚪'} ${i + 1}. ${t.title}`, callback_data: `tarea_${i}` },
  ])
  buttons.push([{ text: '🏠 Menú principal', callback_data: 'menu' }])

  await sendMessage(msg, chatId, buttons)
}

async function sendResumen(chatId: string, db: Awaited<ReturnType<typeof createClient>>) {
  const [{ count: total }, { count: nuevos }, { count: contactados }, { count: cerrados }] = await Promise.all([
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'contactado'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'cerrado'),
  ])

  const msg = `📊 *Resumen de clientes:*\n\n` +
    `👥 Total: *${total || 0}*\n` +
    `🆕 Nuevos: *${nuevos || 0}*\n` +
    `📞 Contactados: *${contactados || 0}*\n` +
    `✅ Cerrados: *${cerrados || 0}*`

  await sendMessage(msg, chatId, [
    [{ text: '📋 Ver tareas', callback_data: 'ver_tareas' }],
    [{ text: '🏠 Menú principal', callback_data: 'menu' }],
  ])
}

async function sendTaskDetail(chatId: string, index: number, db: Awaited<ReturnType<typeof createClient>>) {
  const tasks = await getTodayTasks(db)
  const task = tasks[index]
  if (!task) {
    await sendMessage('Tarea no encontrada.', chatId, [[{ text: '📋 Ver tareas', callback_data: 'ver_tareas' }]])
    return
  }

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

  await sendMessage(formatTask(task, detail), chatId, [
    [
      { text: '✅ Hecho', callback_data: `hecho_${index}` },
      { text: '⏭ Posponer', callback_data: `posponer_${index}` },
      { text: '❌ Cerrar lead', callback_data: `cerrar_${index}` },
    ],
    [{ text: '📋 Volver a tareas', callback_data: 'ver_tareas' }],
  ])
}

export async function POST(req: NextRequest) {
  const update = await req.json()
  const token = await getSetting('TELEGRAM_BOT_TOKEN') || ''
  const db = await createClient()

  // --- Callback de botón inline ---
  if (update.callback_query) {
    const cb = update.callback_query
    const chatId = String(cb.message.chat.id)
    const data: string = cb.data

    await answerCallback(token, cb.id)

    if (data === 'menu') return sendMenu(chatId).then(() => NextResponse.json({ ok: true }))
    if (data === 'ver_tareas') return sendTaskList(chatId, db).then(() => NextResponse.json({ ok: true }))
    if (data === 'resumen') return sendResumen(chatId, db).then(() => NextResponse.json({ ok: true }))

    if (data === 'correr_agente') {
      await sendMessage('🤖 Iniciando agente prospector... Te aviso cuando termine.', chatId)
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.vittomare.com'}/api/agent/run`, {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
      })
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('tarea_')) {
      const i = parseInt(data.replace('tarea_', ''))
      await sendTaskDetail(chatId, i, db)
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('hecho_')) {
      const i = parseInt(data.replace('hecho_', ''))
      const tasks = await getTodayTasks(db)
      const task = tasks[i]
      if (task) {
        await db.from('daily_tasks').update({ done: true }).eq('id', task.id)
        if (task.client_id) {
          await db.from('interactions').insert({ client_id: task.client_id, channel: 'sistema', type: 'tarea', notes: `Tarea completada: ${task.title}`, ai_generated: false })
          await db.from('clients').update({ last_contact: new Date().toISOString(), status: 'contactado' }).eq('id', task.client_id)
        }
        await sendMessage(`✅ *${task.title}* marcada como hecha.`, chatId, [
          [{ text: '📋 Ver tareas restantes', callback_data: 'ver_tareas' }],
          [{ text: '🏠 Menú principal', callback_data: 'menu' }],
        ])
      }
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('posponer_')) {
      const i = parseInt(data.replace('posponer_', ''))
      const tasks = await getTodayTasks(db)
      const task = tasks[i]
      if (task) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        await db.from('daily_tasks').update({ date: tomorrow.toISOString().split('T')[0] }).eq('id', task.id)
        await sendMessage(`⏭ *${task.title}* pospuesta para mañana.`, chatId, [
          [{ text: '📋 Ver tareas restantes', callback_data: 'ver_tareas' }],
        ])
      }
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('cerrar_')) {
      const i = parseInt(data.replace('cerrar_', ''))
      const tasks = await getTodayTasks(db)
      const task = tasks[i]
      if (task) {
        await db.from('daily_tasks').update({ done: true }).eq('id', task.id)
        if (task.client_id) {
          await db.from('clients').update({ status: 'perdido' }).eq('id', task.client_id)
        }
        await sendMessage(`❌ Lead cerrado. *${task.title}* descartada.`, chatId, [
          [{ text: '📋 Ver tareas restantes', callback_data: 'ver_tareas' }],
        ])
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  }

  // --- Mensaje de texto ---
  const msg = update.message
  if (!msg) return NextResponse.json({ ok: true })

  const text = msg.text?.trim().toLowerCase() || ''
  const chatId = String(msg.chat.id)

  const saludos = ['hola', 'holis', 'buenas', 'buen día', 'buenos días', 'buenas tardes', 'buenas noches', 'hi', 'hello', '/start', '/menu']
  if (saludos.some(s => text.startsWith(s))) {
    await sendMenu(chatId)
    return NextResponse.json({ ok: true })
  }

  if (text === 'tareas' || text === '/tareas') {
    await sendTaskList(chatId, db)
    return NextResponse.json({ ok: true })
  }

  if (text === 'resumen' || text === '/resumen') {
    await sendResumen(chatId, db)
    return NextResponse.json({ ok: true })
  }

  // Compatibilidad con comandos de texto anteriores
  if (/^\d+$/.test(text)) {
    await sendTaskDetail(chatId, parseInt(text) - 1, db)
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith('hecho')) {
    const n = parseInt(text.split(' ')[1]) - 1
    const tasks = await getTodayTasks(db)
    const task = tasks[n]
    if (task) {
      await db.from('daily_tasks').update({ done: true }).eq('id', task.id)
      if (task.client_id) {
        await db.from('interactions').insert({ client_id: task.client_id, channel: 'sistema', type: 'tarea', notes: `Tarea completada: ${task.title}`, ai_generated: false })
        await db.from('clients').update({ last_contact: new Date().toISOString(), status: 'contactado' }).eq('id', task.client_id)
      }
      await sendMessage(`✅ *${task.title}* marcada como hecha.`, chatId, [
        [{ text: '📋 Ver tareas restantes', callback_data: 'ver_tareas' }],
      ])
    }
    return NextResponse.json({ ok: true })
  }

  // Fallback con menú
  await sendMenu(chatId)
  return NextResponse.json({ ok: true })
}
