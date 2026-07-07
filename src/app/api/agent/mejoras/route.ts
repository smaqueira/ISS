import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function GET() {
  const db = getDb()
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  // Recolectar datos del sistema
  const [
    { count: totalClients },
    { count: nuevos },
    { count: contactados },
    { count: cerrados },
    { count: frios },
    { data: byChannel },
    { data: recentInteractions },
    { data: settings },
    { data: orders },
  ] = await Promise.all([
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'contactado'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'cerrado'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'frio'),
    db.from('interactions').select('channel').limit(500),
    db.from('interactions').select('created_at, channel, type').order('created_at', { ascending: false }).limit(100),
    db.from('settings').select('key, value').in('key', ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CUSTOMER_BOT_TOKEN', 'GMAIL_USER', 'COMPANY_WHATSAPP', 'GROQ_API_KEY']),
    db.from('orders').select('status').limit(100),
  ])

  // Calcular métricas
  const channelCounts: Record<string, number> = {}
  for (const i of byChannel || []) {
    channelCounts[i.channel] = (channelCounts[i.channel] || 0) + 1
  }

  const configuredKeys = (settings || []).map(s => s.key)
  const hasGmail = configuredKeys.includes('GMAIL_USER')
  const hasWhatsApp = configuredKeys.includes('COMPANY_WHATSAPP')
  const hasCustomerBot = configuredKeys.includes('TELEGRAM_CUSTOMER_BOT_TOKEN')
  const hasGroq = configuredKeys.includes('GROQ_API_KEY')

  const ordersByStatus: Record<string, number> = {}
  for (const o of orders || []) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
  }

  // Actividad reciente (últimas 48hs)
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const recentActivity = (recentInteractions || []).filter(i => i.created_at > twoDaysAgo).length

  const systemContext = `
ESTADO ACTUAL DEL SISTEMA ISS (Intelligent Sales System) de Vitto Mare:

CLIENTES:
- Total: ${totalClients || 0}
- Nuevos (sin contactar): ${nuevos || 0}
- Contactados: ${contactados || 0}
- Cerrados/ganados: ${cerrados || 0}
- Fríos (sin contacto +30 días): ${frios || 0}

CANALES DE ENTRADA (total interacciones):
${Object.entries(channelCounts).map(([k, v]) => `- ${k}: ${v} interacciones`).join('\n') || '- Sin datos todavía'}

ACTIVIDAD RECIENTE (últimas 48hs): ${recentActivity} interacciones

PEDIDOS:
${Object.entries(ordersByStatus).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- Sin pedidos registrados'}

CONFIGURACIÓN ACTIVA:
- Gmail conectado: ${hasGmail ? 'SÍ' : 'NO'}
- WhatsApp configurado: ${hasWhatsApp ? 'SÍ' : 'NO'}
- Bot cliente (vittomare_bot): ${hasCustomerBot ? 'SÍ' : 'NO'}
- IA (Groq): ${hasGroq ? 'SÍ' : 'NO'}

CANALES DISPONIBLES:
- Telegram admin bot (ventas_vitto_bot): activo
- Telegram cliente bot (vittomare_bot): activo
- Email (ImprovMX + Gmail): activo
- Web (vittomare.com): activa con formulario de pedido
- WhatsApp API: NO conectado (solo links)
- Instagram DMs: NO conectado (pendiente cuenta)

CRÉDITOS GRATUITOS RESTANTES: todo el stack es free tier actualmente.
`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Sos un consultor experto en sistemas de ventas y automatización para pymes argentinas.
Analizás el estado real del sistema y proponés mejoras concretas, priorizadas por impacto y facilidad de implementación.
Respondé en español, con formato claro. Sé específico y accionable. No repitas datos que ya se ven en el estado.
Organizá las propuestas en: CRÍTICO (hacer hoy), ALTO IMPACTO (esta semana), OPTIMIZACIONES (cuando haya tiempo).
Para cada mejora: qué es, por qué importa, cómo implementarla (en términos de negocio, no código).`,
      },
      {
        role: 'user',
        content: `Analizá este estado del sistema y proponé las mejoras más impactantes:\n\n${systemContext}`,
      },
    ],
    max_tokens: 1500,
  })

  const analysis = completion.choices[0]?.message?.content || 'No se pudo generar el análisis.'

  return NextResponse.json({
    ok: true,
    metrics: {
      totalClients,
      nuevos,
      contactados,
      cerrados,
      frios,
      channelCounts,
      recentActivity,
      ordersByStatus,
      configured: { hasGmail, hasWhatsApp, hasCustomerBot, hasGroq },
    },
    analysis,
    ts: new Date().toISOString(),
  })
}
