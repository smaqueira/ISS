import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { groqWithRotation, modeloPreferido } from '@/lib/ai/client'
import { getBusinessConfig } from '@/lib/business-context'

export const runtime = 'nodejs'
export const maxDuration = 60

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
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

  // MÃ©tricas de canales (Ãºltimos 30 dÃ­as)
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
  // Groq estÃ¡ OK si hay CUALQUIER key configurada (rotaciÃ³n usa GROQ_API_KEY + _1..4)
  const hasGroq = apiKeys.length > 0
  const hasResend = configuredKeys.includes('RESEND_API_KEY')

  const ordersByStatus: Record<string, number> = {}
  for (const o of orders || []) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
  }

  const conversionRate = totalClients ? Math.round(((cerrados || 0) / totalClients) * 100) : 0
  const contactRate = totalClients ? Math.round(((contactados || 0) / totalClients) * 100) : 0

  // Tipos de interacciÃ³n mÃ¡s frecuentes
  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Top clientes por score
  const topClientsText = (topClients || []).map(c =>
    `  - ${c.name} (${c.type?.toUpperCase()}, score: ${c.score}, estado: ${c.status}${c.rubro ? `, rubro: ${c.rubro}` : ''})`
  ).join('\n')

  const systemState = `
MÃ‰TRICAS DEL SISTEMA (Ãºltimos 30 dÃ­as):

CLIENTES:
- Total acumulado: ${totalClients || 0} (${b2b || 0} B2B + ${b2c || 0} B2C)
- Nuevos esta semana: ${clientsThisWeek || 0}
- Sin contactar: ${nuevos || 0} â†’ oportunidad inmediata
- Contactados activos: ${contactados || 0}
- Cerrados/ganados: ${cerrados || 0} (${conversionRate}% conversiÃ³n)
- FrÃ­os: ${frios || 0} â†’ clientes a reactivar
- Tasa de contacto: ${contactRate}%

TOP 5 LEADS POR SCORE:
${topClientsText || '- Sin datos'}

ACTIVIDAD POR CANAL (30 dÃ­as):
${Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v} interacciones`).join('\n') || '- Sin actividad registrada'}

TIPOS DE INTERACCIÃ“N MÃS FRECUENTES:
${topTypes.map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- Sin datos'}

ACTIVIDAD PROMEDIO DIARIA: ${avgDailyActivity} interacciones/dÃ­a

PEDIDOS (30 dÃ­as):
${Object.entries(ordersByStatus).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- Sin pedidos en el sistema'}

CONFIGURACIÃ“N:
- Gmail (captura emails): ${hasGmail ? 'âœ… activo' : 'âŒ no configurado'}
- WhatsApp Business API: ${hasWhatsApp ? 'âœ… activo' : 'âŒ pendiente â€” canal principal bloqueado'}
- Bot cliente vittomare_bot: ${hasCustomerBot ? 'âœ… activo' : 'âŒ no configurado'}
- IA Groq: ${hasGroq ? 'âœ… activo' : 'âŒ no configurado'}
- Resend (email outbound): ${hasResend ? 'âœ… activo' : 'âŒ no configurado'}
- Instagram DMs: âŒ pendiente cuenta profesional

ANÃLISIS ANTERIOR:
${previousAnalysis?.value ? `Ãšltimo anÃ¡lisis: ${previousAnalysis.value.slice(0, 300)}...` : 'Primer anÃ¡lisis â€” sin historial previo'}
`

  const completion = await groqWithRotation(apiKeys, (groq) => groq.chat.completions.create({
    model: modeloPreferido(),
    messages: [
      {
        role: 'system',
        content: `Sos un consultor senior de negocios y ventas para pymes en Argentina.
ConocÃ©s en profundidad el negocio de ${biz.name} y su sistema de ventas ISS.

CONTEXTO DEL NEGOCIO:
${biz.description}

TU ROL:
- AnalizÃ¡s los datos reales del sistema cada vez que te consultan
- IdentificÃ¡s patrones, cuellos de botella y oportunidades concretas
- ProponÃ©s acciones especÃ­ficas para el negocio segÃºn su contexto
- PriorizÃ¡s por impacto en ventas reales (clientes activos y recurrentes)
- Sos directo, concreto y conocÃ©s las limitaciones del free tier

FORMATO DE RESPUESTA:
UsÃ¡ exactamente estas 3 secciones:
ðŸ”´ CRÃTICO (hacer esta semana para no perder ventas)
ðŸŸ¡ ALTO IMPACTO (prÃ³ximas 2 semanas, mejora significativa)
ðŸŸ¢ OPTIMIZACIONES (cuando haya tiempo)

Para cada Ã­tem: nombre corto â†’ explicaciÃ³n de 1-2 lÃ­neas enfocada en el impacto concreto para este negocio.
MÃ¡ximo 4 Ã­tems por secciÃ³n. SÃ© especÃ­fico, no genÃ©rico.`,
      },
      {
        role: 'user',
        content: `AnalizÃ¡ este estado actual y dame las recomendaciones mÃ¡s impactantes para ${biz.name} hoy:\n\n${systemState}`,
      },
    ],
    max_tokens: 1800,
    temperature: 0.4,
  }))

  const analysis = completion.choices[0]?.message?.content || 'No se pudo generar el anÃ¡lisis.'

  // Guardar resumen del anÃ¡lisis para la prÃ³xima vez
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
