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
  const hour = new Date().getHours()
  const saludo = hour < 12 ? '¡Buenos días' : hour < 19 ? '¡Buenas tardes' : '¡Buenas noches'
  await sendMessage(
    `${saludo}! 👋 Soy tu asistente de ventas.\n\n¿Qué querés hacer?`,
    chatId,
    [
      [{ text: '📊 Resumen del día', callback_data: 'resumen_dia' }],
      [{ text: '🔥 Top 5 leads', callback_data: 'top_leads' }],
      [{ text: '📞 Próximo a contactar', callback_data: 'proximo' }],
      [{ text: '📋 Tareas del día', callback_data: 'ver_tareas' }],
      [{ text: '📣 Broadcast rápido', callback_data: 'broadcast_rapido' }],
      [{ text: '➕ Agregar cliente', callback_data: 'agregar_cliente' }],
      [{ text: '🤖 Correr agente prospector', callback_data: 'correr_agente' }],
    ]
  )
}

async function sendResumenDia(chatId: string, db: Awaited<ReturnType<typeof createClient>>) {
  const today = new Date().toISOString().split('T')[0]
  const [
    { count: total },
    { count: nuevos },
    { count: contactados },
    { count: cerrados },
    { count: nuevosHoy },
    { count: contactadosHoy },
  ] = await Promise.all([
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'contactado'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'cerrado'),
    db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', today),
    db.from('clients').select('*', { count: 'exact', head: true }).gte('last_contact', today),
  ])

  const tasks = await getTodayTasks(db)

  const msg = `📊 *Resumen de hoy — ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}*\n\n` +
    `*Actividad de hoy:*\n` +
    `🆕 Prospectos nuevos: *${nuevosHoy || 0}*\n` +
    `📞 Contactados hoy: *${contactadosHoy || 0}*\n` +
    `📋 Tareas pendientes: *${tasks.length}*\n\n` +
    `*Pipeline total:*\n` +
    `👥 Total clientes: *${total || 0}*\n` +
    `🟡 En espera: *${nuevos || 0}*\n` +
    `🟢 Contactados: *${contactados || 0}*\n` +
    `✅ Cerrados: *${cerrados || 0}*`

  await sendMessage(msg, chatId, [
    [{ text: '🔥 Ver top leads', callback_data: 'top_leads' }],
    [{ text: '📞 Próximo a contactar', callback_data: 'proximo' }],
    [{ text: '🏠 Menú', callback_data: 'menu' }],
  ])
}

async function sendTopLeads(chatId: string, db: Awaited<ReturnType<typeof createClient>>) {
  const { data: leads } = await db
    .from('clients')
    .select('*')
    .eq('status', 'nuevo')
    .order('score', { ascending: false })
    .limit(5)

  if (!leads || leads.length === 0) {
    await sendMessage('No hay leads nuevos por ahora.', chatId, [[{ text: '🏠 Menú', callback_data: 'menu' }]])
    return
  }

  let msg = `🔥 *Top ${leads.length} leads:*\n\n`
  leads.forEach((c, i) => {
    msg += `*${i + 1}. ${c.name}*\n`
    msg += `   🏷 ${c.rubro || 'Sin rubro'} — ${c.city || 'Sin ciudad'}\n`
    msg += `   ⭐ Score: ${c.score || 0}/100\n`
    if (c.phone) msg += `   📱 ${c.phone}\n`
    if (c.instagram) msg += `   📸 ${c.instagram}\n`
    if (c.website) msg += `   🌐 ${c.website}\n`
    msg += '\n'
  })

  const buttons = leads
    .filter(c => c.phone)
    .map(c => [{ text: `📱 WA ${c.name}`, callback_data: `wa_${c.id}` }])
  buttons.push([{ text: '🏠 Menú', callback_data: 'menu' }])

  await sendMessage(msg, chatId, buttons)
}

async function sendProximo(chatId: string, db: Awaited<ReturnType<typeof createClient>>) {
  const { data: leads } = await db
    .from('clients')
    .select('*')
    .eq('status', 'nuevo')
    .not('phone', 'is', null)
    .order('score', { ascending: false })
    .limit(1)

  if (!leads || leads.length === 0) {
    await sendMessage('No hay prospectos con teléfono para contactar.', chatId, [[{ text: '🏠 Menú', callback_data: 'menu' }]])
    return
  }

  const c = leads[0]
  const phone = c.phone?.replace(/\D/g, '')
  const waText = encodeURIComponent(`Hola! ¿Cómo estás? Te escribo de parte de nuestro equipo.`)
  const waUrl = `https://wa.me/${phone}?text=${waText}`

  const msg = `📞 *Próximo a contactar:*\n\n` +
    `*${c.name}*\n` +
    `🏷 ${c.rubro || 'Sin rubro'} — ${c.city || 'Sin ciudad'}\n` +
    `⭐ Score: ${c.score || 0}/100\n` +
    `📱 ${c.phone}\n` +
    `${c.instagram ? `📸 ${c.instagram}\n` : ''}` +
    `${c.website ? `🌐 ${c.website}\n` : ''}\n` +
    `👉 [Abrir WhatsApp](${waUrl})`

  await sendMessage(msg, chatId, [
    [{ text: `✅ Marcar contactado`, callback_data: `marcar_contactado_${c.id}` }],
    [{ text: `⏭ Saltar`, callback_data: 'proximo' }],
    [{ text: '🏠 Menú', callback_data: 'menu' }],
  ])
}

async function sendTaskList(chatId: string, db: Awaited<ReturnType<typeof createClient>>) {
  const tasks = await getTodayTasks(db)
  if (tasks.length === 0) {
    await sendMessage('✅ No tenés tareas pendientes por hoy. ¡Todo al día!', chatId, [
      [{ text: '🏠 Menú', callback_data: 'menu' }],
    ])
    return
  }
  let msg = `📋 *Tareas pendientes (${tasks.length}):*\n\n`
  tasks.forEach((t, i) => {
    msg += `${EMOJI[t.priority] || '⚪'} *${i + 1}. ${t.title}*\n`
    msg += `   ${t.description}\n\n`
  })
  msg += `Tocá una tarea para ejecutarla:`
  const buttons = tasks.map((t, i) => [
    { text: `${EMOJI[t.priority] || '⚪'} ${i + 1}. ${t.title}`, callback_data: `tarea_${i}` },
  ])
  buttons.push([{ text: '🏠 Menú', callback_data: 'menu' }])
  await sendMessage(msg, chatId, buttons)
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

async function sendBroadcastRapido(chatId: string, db: Awaited<ReturnType<typeof createClient>>) {
  const { data: products } = await db.from('products').select('name').eq('active', true).limit(5)
  const names = products?.map(p => p.name) || ['productos disponibles']
  const companyName = await getSetting('COMPANY_NAME') || 'el negocio'

  const { data: clients } = await db
    .from('clients')
    .select('id, name, phone')
    .eq('status', 'contactado')
    .not('phone', 'is', null)
    .limit(50)

  const total = clients?.length || 0
  const wa = await generateBroadcast({ products: names, type: 'viernes', client_name: undefined })

  const msg = `📣 *Broadcast rápido*\n\n` +
    `Destinatarios: *${total} clientes contactados*\n\n` +
    `*Mensaje generado:*\n_${wa}_\n\n` +
    `¿Confirmás el envío?`

  await sendMessage(msg, chatId, [
    [{ text: `✅ Enviar a ${total} clientes`, callback_data: 'confirmar_broadcast' }],
    [{ text: '❌ Cancelar', callback_data: 'menu' }],
  ])
}

// Estado temporal para agregar clientes (en memoria por sesión)
const pendingClients: Record<string, Partial<{ name: string; phone: string; rubro: string; city: string; step: string }>> = {}

export async function POST(req: NextRequest) {
  const update = await req.json()
  const token = await getSetting('TELEGRAM_BOT_TOKEN') || ''
  const db = await createClient()

  // Callback de botón inline
  if (update.callback_query) {
    const cb = update.callback_query
    const chatId = String(cb.message.chat.id)
    const data: string = cb.data
    await answerCallback(token, cb.id)

    if (data === 'menu') { await sendMenu(chatId); return NextResponse.json({ ok: true }) }
    if (data === 'resumen_dia') { await sendResumenDia(chatId, db); return NextResponse.json({ ok: true }) }
    if (data === 'top_leads') { await sendTopLeads(chatId, db); return NextResponse.json({ ok: true }) }
    if (data === 'proximo') { await sendProximo(chatId, db); return NextResponse.json({ ok: true }) }
    if (data === 'ver_tareas') { await sendTaskList(chatId, db); return NextResponse.json({ ok: true }) }
    if (data === 'broadcast_rapido') { await sendBroadcastRapido(chatId, db); return NextResponse.json({ ok: true }) }

    if (data === 'agregar_cliente') {
      pendingClients[chatId] = { step: 'nombre' }
      await sendMessage('➕ *Agregar cliente*\n\n¿Cuál es el *nombre* del negocio o contacto?', chatId)
      return NextResponse.json({ ok: true })
    }

    if (data === 'correr_agente') {
      await sendMessage('🤖 Iniciando agente prospector... Te aviso cuando termine.', chatId)
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.vittomare.com'}/api/agent/run`, {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
      })
      return NextResponse.json({ ok: true })
    }

    if (data === 'confirmar_broadcast') {
      const { data: clients } = await db
        .from('clients')
        .select('id, name, phone')
        .eq('status', 'contactado')
        .not('phone', 'is', null)
        .limit(50)

      const { data: products } = await db.from('products').select('name').eq('active', true).limit(5)
      const names = products?.map(p => p.name) || ['productos disponibles']
      const wa = await generateBroadcast({ products: names, type: 'viernes', client_name: undefined })

      let enviados = 0
      for (const client of clients || []) {
        const phone = client.phone.replace(/\D/g, '')
        await db.from('interactions').insert({
          client_id: client.id, channel: 'whatsapp', type: 'broadcast',
          notes: wa, ai_generated: true,
        })
        enviados++
      }
      await sendMessage(`✅ Broadcast registrado para *${enviados} clientes*.\n\nCopiá el mensaje y envialo por WA:\n\n_${wa}_`, chatId, [
        [{ text: '🏠 Menú', callback_data: 'menu' }],
      ])
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('marcar_contactado_')) {
      const clientId = data.replace('marcar_contactado_', '')
      await db.from('clients').update({ status: 'contactado', last_contact: new Date().toISOString() }).eq('id', clientId)
      await db.from('interactions').insert({ client_id: clientId, channel: 'whatsapp', type: 'contacto', notes: 'Contactado desde Telegram', ai_generated: false })
      await sendMessage('✅ Cliente marcado como contactado.', chatId, [
        [{ text: '📞 Siguiente prospecto', callback_data: 'proximo' }],
        [{ text: '🏠 Menú', callback_data: 'menu' }],
      ])
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('wa_')) {
      const clientId = data.replace('wa_', '')
      const { data: c } = await db.from('clients').select('*').eq('id', clientId).single()
      if (c?.phone) {
        const phone = c.phone.replace(/\D/g, '')
        const companyName = await getSetting('COMPANY_NAME') || 'nuestro equipo'
        const text = encodeURIComponent(`Hola ${c.name}! ¿Cómo estás? Te escribo de *${companyName}*.`)
        await sendMessage(`📱 [Abrir WhatsApp con ${c.name}](https://wa.me/${phone}?text=${text})`, chatId, [
          [{ text: `✅ Marcar contactado`, callback_data: `marcar_contactado_${c.id}` }],
          [{ text: '🏠 Menú', callback_data: 'menu' }],
        ])
      }
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('tarea_')) {
      await sendTaskDetail(chatId, parseInt(data.replace('tarea_', '')), db)
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('hecho_')) {
      const tasks = await getTodayTasks(db)
      const task = tasks[parseInt(data.replace('hecho_', ''))]
      if (task) {
        await db.from('daily_tasks').update({ done: true }).eq('id', task.id)
        if (task.client_id) {
          await db.from('interactions').insert({ client_id: task.client_id, channel: 'sistema', type: 'tarea', notes: `Tarea completada: ${task.title}`, ai_generated: false })
          await db.from('clients').update({ last_contact: new Date().toISOString(), status: 'contactado' }).eq('id', task.client_id)
        }
        await sendMessage(`✅ *${task.title}* marcada como hecha.`, chatId, [
          [{ text: '📋 Ver tareas restantes', callback_data: 'ver_tareas' }],
          [{ text: '🏠 Menú', callback_data: 'menu' }],
        ])
      }
      return NextResponse.json({ ok: true })
    }

    if (data.startsWith('posponer_')) {
      const tasks = await getTodayTasks(db)
      const task = tasks[parseInt(data.replace('posponer_', ''))]
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
      const tasks = await getTodayTasks(db)
      const task = tasks[parseInt(data.replace('cerrar_', ''))]
      if (task) {
        await db.from('daily_tasks').update({ done: true }).eq('id', task.id)
        if (task.client_id) await db.from('clients').update({ status: 'perdido' }).eq('id', task.client_id)
        await sendMessage(`❌ Lead cerrado. *${task.title}* descartada.`, chatId, [
          [{ text: '📋 Ver tareas restantes', callback_data: 'ver_tareas' }],
        ])
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  }

  // Mensaje de texto
  const msg = update.message
  if (!msg) return NextResponse.json({ ok: true })

  const text = msg.text?.trim() || ''
  const textLower = text.toLowerCase()
  const chatId = String(msg.chat.id)

  // Flujo para agregar cliente
  if (pendingClients[chatId]) {
    const state = pendingClients[chatId]

    if (state.step === 'nombre') {
      pendingClients[chatId] = { ...state, name: text, step: 'telefono' }
      await sendMessage(`✅ *${text}*\n\n¿Cuál es el *teléfono*? (o escribí "omitir")`, chatId)
      return NextResponse.json({ ok: true })
    }

    if (state.step === 'telefono') {
      const phone = textLower === 'omitir' ? null : text
      pendingClients[chatId] = { ...state, phone: phone || undefined, step: 'rubro' }
      await sendMessage(`¿Cuál es el *rubro* del negocio? (ej: restaurante, hotel) o escribí "omitir"`, chatId)
      return NextResponse.json({ ok: true })
    }

    if (state.step === 'rubro') {
      const rubro = textLower === 'omitir' ? null : text
      pendingClients[chatId] = { ...state, rubro: rubro || undefined, step: 'ciudad' }
      await sendMessage(`¿En qué *ciudad* está? o escribí "omitir"`, chatId)
      return NextResponse.json({ ok: true })
    }

    if (state.step === 'ciudad') {
      const city = textLower === 'omitir' ? null : text
      const s = pendingClients[chatId]
      delete pendingClients[chatId]

      await db.from('clients').insert({
        name: s.name,
        phone: s.phone || null,
        rubro: s.rubro || null,
        city: city || null,
        status: 'nuevo',
        score: 50,
        type: 'b2b',
      })

      await sendMessage(`✅ *${s.name}* agregado como nuevo prospecto!`, chatId, [
        [{ text: '📞 Ver próximo a contactar', callback_data: 'proximo' }],
        [{ text: '🏠 Menú', callback_data: 'menu' }],
      ])
      return NextResponse.json({ ok: true })
    }
  }

  const saludos = ['hola', 'holis', 'buenas', 'buen día', 'buenos días', 'buenas tardes', 'buenas noches', 'hi', 'hello', 'start', '/start', 'menu', '/menu']
  if (saludos.some(s => textLower.startsWith(s))) { await sendMenu(chatId); return NextResponse.json({ ok: true }) }
  if (textLower === 'tareas' || textLower === '/tareas') { await sendTaskList(chatId, db); return NextResponse.json({ ok: true }) }
  if (textLower === 'resumen' || textLower === '/resumen') { await sendResumenDia(chatId, db); return NextResponse.json({ ok: true }) }
  if (textLower === 'leads' || textLower === '/leads') { await sendTopLeads(chatId, db); return NextResponse.json({ ok: true }) }
  if (/^\d+$/.test(textLower)) { await sendTaskDetail(chatId, parseInt(textLower) - 1, db); return NextResponse.json({ ok: true }) }

  if (textLower.startsWith('hecho')) {
    const n = parseInt(textLower.split(' ')[1]) - 1
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

  await sendMenu(chatId)
  return NextResponse.json({ ok: true })
}
