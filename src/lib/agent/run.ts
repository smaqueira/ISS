import { createClient } from '@/lib/supabase/server'
import { ask } from '@/lib/ai/client'
import { searchPlaces } from '@/lib/prospecting/serper'
import { classifyLead } from '@/lib/ai/classify'
import { generateFollowUp } from '@/lib/ai/followup'
import { sendProposalEmail } from '@/lib/email/send'
import { sendMessage } from '@/lib/telegram/send'
import { daysSince } from '@/lib/utils'

const ZONAS_ROTACION = [
  'Palermo', 'Recoleta', 'Belgrano', 'San Telmo', 'Caballito', 'Almagro',
  'Villa Crespo', 'Nunez', 'Flores', 'Barracas', 'Microcentro', 'Colegiales',
  'San Isidro', 'Vicente Lopez', 'Martinez', 'Olivos', 'Florida', 'Tigre',
  'San Fernando', 'Pilar', 'Quilmes', 'Avellaneda', 'Lanus', 'Moron',
]

const RUBROS_ROTACION = [
  'restaurante', 'parrilla', 'bar', 'cafeteria', 'hotel',
  'catering', 'bodegon', 'pizzeria', 'rotiseria', 'cantina',
]

async function log(db: Awaited<ReturnType<typeof createClient>>, turno: string, accion: string, detalle: string, cantidad = 0) {
  await db.from('agent_logs').insert({ turno, accion, detalle, cantidad })
}

// TURNO MAÑANA — 8am: prospección + tareas + briefing
export async function runMañana() {
  const db = await createClient()
  const actions: string[] = []

  // Traer todas las combinaciones ya buscadas
  const { data: logsAnteriores } = await db.from('agent_logs').select('detalle').eq('accion', 'búsqueda')
  const yasBuscadas = new Set((logsAnteriores || []).map(l => l.detalle))

  // Generar todas las combinaciones posibles y filtrar las ya buscadas
  const todasCombos: [string, string][] = []
  for (const z of ZONAS_ROTACION) {
    for (const r of RUBROS_ROTACION) {
      const key = `${r} en ${z}`
      if (!yasBuscadas.has(key)) todasCombos.push([z, r])
    }
  }

  // Tomar las próximas 4 combinaciones no buscadas
  const combos = todasCombos.slice(0, 4)
  let totalImportados = 0

  if (combos.length === 0) {
    await log(db, 'mañana', 'prospección', 'Todas las combinaciones zona×rubro ya fueron buscadas. Ciclo completo.', 0)
    actions.push('✅ Ciclo completo — todas las zonas y rubros ya fueron buscados')
    await sendMessage(`🤖 *Agente — Turno mañana*\n\n✅ Ciclo completo de prospección. Todas las combinaciones zona×rubro ya fueron buscadas.`)
    return { actions, importados: 0 }
  }

  const { data: existing } = await db.from('clients').select('name, phone')
  const existingNames = new Set((existing || []).map(c => c.name?.toLowerCase().trim()))
  const existingPhones = new Set((existing || []).map(c => c.phone).filter(Boolean))

  for (const [z, r] of combos) {
    try {
      const places = await searchPlaces(r, z)
      if (!places.length) {
        await log(db, 'mañana', 'búsqueda', `${r} en ${z} — sin resultados de Serper`, 0)
        continue
      }
      const results = await Promise.all(places.map(async place => {
        const ai = await classifyLead({ name: place.name, rubro: r, description: place.address })
        const isDupe = existingNames.has(place.name?.toLowerCase().trim()) || (place.phone && existingPhones.has(place.phone))
        return { ...place, ...ai, isDupe }
      }))
      // Importar si tiene teléfono, web o rating de Google (negocio real y verificado)
      const toImport = results.filter(p => p.score >= 50 && !p.isDupe && (p.phone || p.website || p.rating))
      const sinContacto = results.filter(p => p.score >= 50 && !p.phone && !p.website && !p.isDupe).length
      for (const p of toImport) {
        const { error } = await db.from('clients').insert({
          name: p.name, type: p.type, rubro: r, phone: p.phone || null,
          city: z, website: p.website || null, notes: p.address || null,
          status: 'nuevo', score: p.score, channel: p.channel || 'whatsapp', tags: [],
        })
        if (!error) {
          totalImportados++
          existingNames.add(p.name?.toLowerCase().trim())
          if (p.phone) existingPhones.add(p.phone)
        }
      }
      await log(db, 'mañana', 'búsqueda', `${r} en ${z} — ${places.length} encontrados, ${toImport.length} importados, ${sinContacto} sin contacto`, toImport.length)
    } catch (err) {
      await log(db, 'mañana', 'búsqueda', `${r} en ${z} — error: ${err instanceof Error ? err.message : 'desconocido'}`, 0)
      continue
    }
  }

  const zonasHoy = [...new Set(combos.map(([z]) => z))].join(', ')
  const rubrosHoy = [...new Set(combos.map(([, r]) => r))].join(', ')
  const restantes = todasCombos.length - combos.length

  await log(db, 'mañana', 'prospección', `Zonas: ${zonasHoy} · Rubros: ${rubrosHoy} · Importados: ${totalImportados} · Quedan: ${restantes} combinaciones`, totalImportados)
  actions.push(`🔍 ${totalImportados} nuevos prospectos importados`)
  actions.push(`📍 ${zonasHoy} · ${rubrosHoy}`)
  actions.push(`📊 Quedan ${restantes} combinaciones por explorar`)

  // Generar tareas prioritarias con IA
  const { data: clientes } = await db.from('clients').select('*')
  const cl = clientes || []
  const nuevosSinContactar = cl.filter(c => c.status === 'nuevo' && daysSince(c.created_at) >= 1)
  const enSeguimiento = cl.filter(c => c.status === 'contactado' && c.last_contact && daysSince(c.last_contact) >= 2)

  if (nuevosSinContactar.length > 0) {
    actions.push(`🎯 ${nuevosSinContactar.length} prospectos nuevos sin contactar`)
  }
  if (enSeguimiento.length > 0) {
    actions.push(`📬 ${enSeguimiento.length} clientes en seguimiento sin respuesta`)
  }

  await log(db, 'mañana', 'tareas', `${nuevosSinContactar.length} sin contactar, ${enSeguimiento.length} en seguimiento`, nuevosSinContactar.length + enSeguimiento.length)

  // Briefing Telegram
  const resumen = [
    `🤖 *Agente — Turno mañana*`,
    `📅 ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    ``,
    ...actions,
    ``,
    `_El sistema está trabajando. Entrá al panel para ver los resultados._`,
  ].join('\n')
  await sendMessage(resumen)

  return { actions, importados: totalImportados }
}

// TURNO MEDIODÍA — 12pm: escalado de prioridades
export async function runMediodía() {
  const db = await createClient()
  const actions: string[] = []

  const { data: clientes } = await db.from('clients').select('*')
  const cl = clientes || []

  // Leads sin contactar por más de 2 días → score boost
  const urgentes = cl.filter(c => c.status === 'nuevo' && daysSince(c.created_at) >= 2)
  if (urgentes.length > 0) {
    await log(db, 'mediodia', 'escalado', `${urgentes.length} leads sin contactar hace 2+ días marcados como urgentes`, urgentes.length)
    actions.push(`⚠️ ${urgentes.length} leads sin contactar escalados a urgente`)
  }

  // Detectar clientes interesados sin actividad reciente
  const calientes = cl.filter(c => c.status === 'interesado' && c.last_contact && daysSince(c.last_contact) >= 3)
  if (calientes.length > 0) {
    await log(db, 'mediodia', 'alerta', `${calientes.length} clientes interesados sin actividad 3+ días`, calientes.length)
    actions.push(`🔥 ${calientes.length} clientes interesados sin actividad — revisar hoy`)
  }

  // Análisis IA del pipeline
  const stats = {
    nuevos: cl.filter(c => c.status === 'nuevo').length,
    contactados: cl.filter(c => c.status === 'contactado').length,
    interesados: cl.filter(c => c.status === 'interesado').length,
    clientes: cl.filter(c => c.status === 'cliente').length,
  }

  const consejo = await ask(
    `Sos un agente de ventas. El pipeline tiene: ${stats.nuevos} leads nuevos, ${stats.contactados} contactados, ${stats.interesados} interesados, ${stats.clientes} clientes activos.
Dame UN consejo específico y accionable para hoy en máximo 1 oración. Sin saludos.`,
    80
  ).catch(() => null)

  if (consejo) {
    await log(db, 'mediodia', 'consejo_ia', consejo, 0)
    actions.push(`💡 ${consejo}`)
  }

  if (actions.length > 0) {
    await sendMessage([`🤖 *Agente — Turno mediodía*`, ``, ...actions].join('\n'))
  }

  return { actions }
}

// TURNO TARDE — 6pm: seguimientos automáticos por email
export async function runTarde() {
  const db = await createClient()
  const actions: string[] = []

  const { data: clientes } = await db.from('clients').select('*')
  const cl = clientes || []

  // Follow-ups automáticos
  const toFollowUp = cl.filter(c =>
    c.status === 'contactado' && c.last_contact && c.email &&
    (daysSince(c.last_contact) === 3 || daysSince(c.last_contact) === 7)
  )

  let emailsEnviados = 0
  for (const c of toFollowUp) {
    try {
      const days = daysSince(c.last_contact)
      const fu = await generateFollowUp({ name: c.name, rubro: c.rubro || 'negocio', type: c.type, days })
      await sendProposalEmail({ to: c.email, client_name: c.name, subject: fu.subject, body: fu.email })
      await db.from('interactions').insert({
        client_id: c.id, channel: 'email', type: 'seguimiento',
        notes: `Follow-up automático día ${days} — ${fu.subject}`, ai_generated: true,
      })
      emailsEnviados++
    } catch { continue }
  }

  if (emailsEnviados > 0) {
    await log(db, 'tarde', 'emails', `${emailsEnviados} emails de seguimiento enviados`, emailsEnviados)
    actions.push(`📧 ${emailsEnviados} emails de seguimiento enviados automáticamente`)
  }

  // Marcar inactivos
  const coldIds = cl.filter(c => c.status === 'contactado' && c.last_contact && daysSince(c.last_contact) > 14).map(c => c.id)
  if (coldIds.length > 0) {
    await db.from('clients').update({ status: 'inactivo' }).in('id', coldIds)
    await log(db, 'tarde', 'inactivos', `${coldIds.length} clientes marcados como inactivos`, coldIds.length)
    actions.push(`😴 ${coldIds.length} clientes sin respuesta marcados como inactivos`)
  }

  // Resumen del día
  const { data: logsHoy } = await db.from('agent_logs')
    .select('*')
    .gte('created_at', new Date().toISOString().split('T')[0])
    .order('created_at')

  const resumenDia = [
    `🤖 *Agente — Resumen del día*`,
    ``,
    ...(logsHoy || []).map(l => `• ${l.accion}: ${l.detalle}`),
    ``,
    ...actions,
  ].join('\n')

  await sendMessage(resumenDia)

  return { actions, emails: emailsEnviados }
}
