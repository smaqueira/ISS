import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { groqWithRotation } from '@/lib/ai/client'
import { getBusinessConfig } from '@/lib/business-context'

export const runtime = 'nodejs'
export const maxDuration = 60

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const KEY_NAMES = ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4']

async function getGroqKeys(db: ReturnType<typeof getDb>): Promise<string[]> {
  const { data } = await db.from('settings').select('key, value').in('key', KEY_NAMES)
  const keys: string[] = []
  for (const k of KEY_NAMES) {
    const row = (data || []).find(r => r.key === k)
    if (row?.value) keys.push(row.value)
  }
  if (process.env.GROQ_API_KEY && !keys.includes(process.env.GROQ_API_KEY)) keys.push(process.env.GROQ_API_KEY)
  return keys
}

export async function GET() {
  const db = getDb()
  const [apiKeys, biz] = await Promise.all([getGroqKeys(db), getBusinessConfig(db)])

  // Recolectar datos del sistema en paralelo
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { count: totalClients },
    { count: nuevos },
    { count: contactados },
    { count: cerrados },
    { count: frios },
    { count: b2b },
    { count: b2c },
    { count: clientsThisWeek },
    { data: byChannel },
    { data: recentInteractions },
    { data: topClients },
    { data: settings },
    { data: orders },
    { data: previousAnalysis },
  ] = await Promise.all([
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'contactado'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'cerrado'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'frio'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'b2b'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'b2c'),
    db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('interactions').select('channel, type, created_at').gte('created_at', thirtyDaysAgo).limit(1000),
    db.from('interactions').select('created_at, channel, type, notes').order('created_at', { ascending: false }).limit(50),
    db.from('clients').select('name, score, status, type, rubro, last_contact').order('score', { ascending: false }).limit(5),
    db.from('settings').select('key, value').in('key', [
      'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CUSTOMER_BOT_TOKEN',
      'GMAIL_USER', 'COMPANY_WHATSAPP', 'GROQ_API_KEY',
      'COMPANY_NAME', 'RESEND_API_KEY',
    ]),
    db.from('orders').select('status, created_at').gte('created_at', thirtyDaysAgo),
    db.from('settings').select('value').eq('key', 'LAST_MEJORAS_ANALYSIS').single(),
  ])

  // Métricas de canales (últimos 30 días)
  const channelCounts: Record<string, number> = {}
  const typeCounts: Record<string, number> = {}
  const activityByDay: Record<string, number> = {}

  for (const i of byChannel || []) {
    channelCounts[i.channel] = (channelCounts[i.channel] || 0) + 1
    typeCounts[i.type] = (typeCounts[i.type] || 0) + 1
    const day = i.created_at?.split('T')[0]
    if (day) activityByDay[day] = (activityByDay[day] || 0) + 1
  }

  const avgDailyActivity = Object.keys(activityByDay).length > 0
    ? Math.round(Object.values(activityByDay).reduce((a, b) => a + b, 0) / Object.keys(activityByDay).length)
    : 0

  const configuredKeys = (settings || []).filter(s => s.value && s.value !== '').map(s => s.key)
  const hasGmail = configuredKeys.includes('GMAIL_USER')
  const hasWhatsApp = configuredKeys.includes('COMPANY_WHATSAPP')
  const hasCustomerBot = configuredKeys.includes('TELEGRAM_CUSTOMER_BOT_TOKEN')
  // Groq está OK si hay CUALQUIER key configurada (rotación usa GROQ_API_KEY + _1..4)
  const hasGroq = apiKeys.length > 0
  const hasResend = configuredKeys.includes('RESEND_API_KEY')

  const ordersByStatus: Record<string, number> = {}
  for (const o of orders || []) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
  }

  const conversionRate = totalClients ? Math.round(((cerrados || 0) / totalClients) * 100) : 0
  const contactRate = totalClients ? Math.round(((contactados || 0) / totalClients) * 100) : 0

  // Tipos de interacción más frecuentes
  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Top clientes por score
  const topClientsText = (topClients || []).map(c =>
    `  - ${c.name} (${c.type?.toUpperCase()}, score: ${c.score}, estado: ${c.status}${c.rubro ? `, rubro: ${c.rubro}` : ''})`
  ).join('\n')

  const systemState = `
MÉTRICAS DEL SISTEMA (últimos 30 días):

CLIENTES:
- Total acumulado: ${totalClients || 0} (${b2b || 0} B2B + ${b2c || 0} B2C)
- Nuevos esta semana: ${clientsThisWeek || 0}
- Sin contactar: ${nuevos || 0} → oportunidad inmediata
- Contactados activos: ${contactados || 0}
- Cerrados/ganados: ${cerrados || 0} (${conversionRate}% conversión)
- Fríos: ${frios || 0} → clientes a reactivar
- Tasa de contacto: ${contactRate}%

TOP 5 LEADS POR SCORE:
${topClientsText || '- Sin datos'}

ACTIVIDAD POR CANAL (30 días):
${Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v} interacciones`).join('\n') || '- Sin actividad registrada'}

TIPOS DE INTERACCIÓN MÁS FRECUENTES:
${topTypes.map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- Sin datos'}

ACTIVIDAD PROMEDIO DIARIA: ${avgDailyActivity} interacciones/día

PEDIDOS (30 días):
${Object.entries(ordersByStatus).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- Sin pedidos en el sistema'}

CONFIGURACIÓN:
- Gmail (captura emails): ${hasGmail ? '✅ activo' : '❌ no configurado'}
- WhatsApp Business API: ${hasWhatsApp ? '✅ activo' : '❌ pendiente — canal principal bloqueado'}
- Bot cliente vittomare_bot: ${hasCustomerBot ? '✅ activo' : '❌ no configurado'}
- IA Groq: ${hasGroq ? '✅ activo' : '❌ no configurado'}
- Resend (email outbound): ${hasResend ? '✅ activo' : '❌ no configurado'}
- Instagram DMs: ❌ pendiente cuenta profesional

ANÁLISIS ANTERIOR:
${previousAnalysis?.value ? `Último análisis: ${previousAnalysis.value.slice(0, 300)}...` : 'Primer análisis — sin historial previo'}
`

  const completion = await groqWithRotation(apiKeys, (groq) => groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Sos un consultor senior de negocios y ventas para pymes en Argentina.
Conocés en profundidad el negocio de ${biz.name} y su sistema de ventas ISS.

CONTEXTO DEL NEGOCIO:
${biz.description}

TU ROL:
- Analizás los datos reales del sistema cada vez que te consultan
- Identificás patrones, cuellos de botella y oportunidades concretas
- Proponés acciones específicas para el negocio según su contexto
- Priorizás por impacto en ventas reales (clientes activos y recurrentes)
- Sos directo, concreto y conocés las limitaciones del free tier

FORMATO DE RESPUESTA:
Usá exactamente estas 3 secciones:
🔴 CRÍTICO (hacer esta semana para no perder ventas)
🟡 ALTO IMPACTO (próximas 2 semanas, mejora significativa)
🟢 OPTIMIZACIONES (cuando haya tiempo)

Para cada ítem: nombre corto → explicación de 1-2 líneas enfocada en el impacto concreto para este negocio.
Máximo 4 ítems por sección. Sé específico, no genérico.`,
      },
      {
        role: 'user',
        content: `Analizá este estado actual y dame las recomendaciones más impactantes para ${biz.name} hoy:\n\n${systemState}`,
      },
    ],
    max_tokens: 1800,
    temperature: 0.4,
  }))

  const analysis = completion.choices[0]?.message?.content || 'No se pudo generar el análisis.'

  // Guardar resumen del análisis para la próxima vez
  await db.from('settings').upsert({
    key: 'LAST_MEJORAS_ANALYSIS',
    value: `[${today}] ${analysis.slice(0, 500)}`,
  })

  return NextResponse.json({
    ok: true,
    metrics: {
      totalClients, nuevos, contactados, cerrados, frios,
      b2b, b2c, clientsThisWeek, conversionRate, contactRate,
      channelCounts, avgDailyActivity, ordersByStatus,
      configured: { hasGmail, hasWhatsApp, hasCustomerBot, hasGroq, hasResend },
    },
    analysis,
    ts: new Date().toISOString(),
  })
}
