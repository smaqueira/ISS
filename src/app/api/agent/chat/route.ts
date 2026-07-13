import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { getBusinessConfig } from '@/lib/business-context'

export const runtime = 'nodejs'
export const maxDuration = 60

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getGroqKey(db: ReturnType<typeof getDb>): Promise<string> {
  const { data } = await db.from('settings').select('key, value').in('key', ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4'])
  for (const k of ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4']) {
    const row = (data || []).find((r: { key: string; value: string }) => r.key === k)
    if (row?.value) return row.value
  }
  return process.env.GROQ_API_KEY || ''
}

function buildSystemPrompt(bizName: string, bizDescription: string): string {
  return `Sos el asistente personal de Sebastian Maqueira, dueño de ${bizName}.

SOBRE EL NEGOCIO:
${bizDescription}

TU ROL:
- Asistís a Sebastian en su día a día operativo y comercial
- Sabés el estado real del negocio (datos en tiempo real del sistema)
- Proponés acciones concretas, no genéricas
- Redactás mensajes, propuestas y contenido cuando te lo piden
- Hablás en español rioplatense, sos directo y práctico
- Nunca das respuestas largas sin necesidad — si algo es simple, respondés simple

CONTEXTO DEL SISTEMA (datos de hoy):
{CONTEXT}

Si Sebastian pregunta qué hacer hoy, priorizá:
1. Clientes nuevos sin contactar (oportunidad inmediata)
2. Clientes fríos a reactivar
3. Pedidos pendientes
4. Leads con score alto sin cerrar`
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  if (!messages?.length) return NextResponse.json({ error: 'messages requerido' }, { status: 400 })

  const db = getDb()
  const [apiKey, biz] = await Promise.all([getGroqKey(db), getBusinessConfig(db)])
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 400 })

  // Contexto real del sistema
  const hoy = new Date()
  const treintaDias = new Date(Date.now() - 30 * 86400000).toISOString()
  const sieteDias = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    { count: totalClients },
    { count: nuevos },
    { count: frios },
    { count: b2b },
    { count: b2c },
    { count: clientsThisWeek },
    { data: topLeads },
    { data: recentOrders },
    { data: pendingOrders },
  ] = await Promise.all([
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'frio'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'b2b'),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'b2c'),
    db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', sieteDias),
    db.from('clients').select('name, score, status, type, rubro, phone, last_contact').order('score', { ascending: false }).limit(5),
    db.from('orders').select('status, created_at, total').gte('created_at', treintaDias).order('created_at', { ascending: false }).limit(5),
    db.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pendiente', 'confirmado']),
  ])

  const topLeadsText = (topLeads || []).map(c =>
    `  - ${c.name} (${c.type}, score: ${c.score}, estado: ${c.status}${c.rubro ? `, rubro: ${c.rubro}` : ''}${c.phone ? `, tel: ${c.phone}` : ''})`
  ).join('\n')

  const context = `
Fecha: ${hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}

CLIENTES:
- Total: ${totalClients || 0} (${b2b || 0} empresas + ${b2c || 0} particulares)
- Nuevos esta semana: ${clientsThisWeek || 0}
- Sin contactar: ${nuevos || 0} → OPORTUNIDAD INMEDIATA
- Fríos: ${frios || 0} → a reactivar

TOP LEADS POR SCORE:
${topLeadsText || '- Sin datos'}

PEDIDOS (30 días):
- Pendientes/confirmados: ${(pendingOrders as unknown as { count: number | null }).count || 0}
- Últimos: ${(recentOrders || []).map(o => `${o.status} $${o.total || '?'}`).join(', ') || 'ninguno'}
`

  const systemContent = buildSystemPrompt(biz.name, biz.description).replace('{CONTEXT}', context)

  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemContent },
      ...messages,
    ],
    max_tokens: 1000,
    temperature: 0.5,
  })

  const reply = completion.choices[0]?.message?.content || 'No pude generar una respuesta.'
  return NextResponse.json({ reply })
}
