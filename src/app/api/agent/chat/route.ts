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

async function getAllGroqKeys(db: ReturnType<typeof getDb>): Promise<string[]> {
  const KEY_NAMES = ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4']
  const { data } = await db.from('settings').select('key, value').in('key', KEY_NAMES)
  const keys: string[] = []
  for (const k of KEY_NAMES) {
    const row = (data || []).find((r: { key: string; value: string }) => r.key === k)
    if (row?.value) keys.push(row.value)
  }
  if (process.env.GROQ_API_KEY && !keys.includes(process.env.GROQ_API_KEY)) keys.push(process.env.GROQ_API_KEY)
  return keys
}

// ─── Definición de herramientas ───────────────────────────────────────────────
const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'buscar_clientes',
      description: 'Busca clientes por nombre, rubro o ciudad. Usar cuando el usuario menciona el nombre de un cliente o quiere ver clientes de un rubro/zona.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Texto a buscar en nombre, rubro o ciudad' },
          status: { type: 'string', enum: ['nuevo', 'contactado', 'interesado', 'cliente', 'inactivo'], description: 'Filtrar por estado' },
        },
        required: ['q'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_interaccion',
      description: 'Registra una interacción/contacto con un cliente (llamada, WhatsApp, reunión, etc.). Usar cuando el usuario dice que habló con alguien o quiere anotar una nota sobre un cliente.',
      parameters: {
        type: 'object',
        properties: {
          client_id: { type: 'string', description: 'ID del cliente' },
          tipo: { type: 'string', description: 'Tipo de interacción: llamada, whatsapp, reunion, email, visita' },
          notas: { type: 'string', description: 'Resumen de la interacción o nota a registrar' },
        },
        required: ['client_id', 'tipo', 'notas'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_estado_cliente',
      description: 'Cambia el estado de un cliente (nuevo → contactado → interesado → cliente → inactivo). Usar cuando el usuario dice que ya contactó a alguien, cerró una venta, etc.',
      parameters: {
        type: 'object',
        properties: {
          client_id: { type: 'string', description: 'ID del cliente' },
          status: { type: 'string', enum: ['nuevo', 'contactado', 'interesado', 'cliente', 'inactivo'] },
          notas: { type: 'string', description: 'Nota opcional sobre el cambio' },
        },
        required: ['client_id', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_tarea',
      description: 'Crea un recordatorio o tarea para el día. Usar cuando el usuario quiere que le recuerdes algo o agenda una acción pendiente.',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'Título corto de la tarea' },
          descripcion: { type: 'string', description: 'Detalle de la tarea' },
          prioridad: { type: 'string', enum: ['urgente', 'importante', 'rutina'], description: 'Prioridad de la tarea' },
          client_id: { type: 'string', description: 'ID del cliente relacionado (opcional)' },
          client_name: { type: 'string', description: 'Nombre del cliente relacionado (opcional)' },
        },
        required: ['titulo', 'descripcion', 'prioridad'],
      },
    },
  },
]

// ─── Ejecutores de herramientas ───────────────────────────────────────────────
type ToolArgs = Record<string, unknown>

async function runTool(name: string, args: ToolArgs, db: ReturnType<typeof getDb>): Promise<string> {
  try {
    if (name === 'buscar_clientes') {
      const q = String(args.q || '')
      const limit = Number(args.limit || 5)
      let query = db.from('clients').select('id, name, type, status, rubro, city, phone, score')
      if (args.status) query = query.eq('status', args.status)
      query = query.or(`name.ilike.%${q}%,rubro.ilike.%${q}%,city.ilike.%${q}%`).limit(limit)
      const { data } = await query
      if (!data?.length) return `No encontré clientes con "${q}".`
      return data.map(c =>
        `• ${c.name} | ${c.type} | ${c.status} | ${c.rubro || 'sin rubro'} | ${c.city || 'sin ciudad'} | tel: ${c.phone || '-'} | score: ${c.score || 0} | id: ${c.id}`
      ).join('\n')
    }

    if (name === 'registrar_interaccion') {
      const { data: client } = await db.from('clients').select('id, name').eq('id', args.client_id).single()
      if (!client) return `No encontré cliente con id ${args.client_id}`
      const { error } = await db.from('interactions').insert({
        client_id: args.client_id,
        channel: 'whatsapp',
        type: String(args.tipo),
        notes: String(args.notas),
        ai_generated: false,
      })
      if (error) return `Error al guardar: ${error.message}`
      await db.from('clients').update({ last_contact: new Date().toISOString() }).eq('id', args.client_id)
      return `✅ Interacción registrada con ${client.name}: "${args.notas}"`
    }

    if (name === 'actualizar_estado_cliente') {
      const { data: client } = await db.from('clients').select('id, name, status').eq('id', args.client_id).single()
      if (!client) return `No encontré cliente con id ${args.client_id}`
      const prev = client.status
      await db.from('clients').update({ status: args.status }).eq('id', args.client_id)
      if (args.notas) {
        await db.from('interactions').insert({
          client_id: args.client_id, channel: 'whatsapp',
          type: 'cambio_estado', notes: String(args.notas), ai_generated: false,
        })
      }
      return `✅ ${client.name}: estado cambiado de "${prev}" → "${args.status}"${args.notas ? `. Nota: ${args.notas}` : ''}`
    }

    if (name === 'crear_tarea') {
      const { error } = await db.from('daily_tasks').insert({
        id: crypto.randomUUID(),
        title: args.titulo,
        description: args.descripcion,
        priority: args.prioridad,
        action: 'manual',
        client_id: args.client_id || null,
        client_name: args.client_name || null,
        done: false,
      })
      if (error) return `Error al crear tarea: ${error.message}`
      return `✅ Tarea creada: "${args.titulo}" (${args.prioridad})`
    }

    return `Herramienta "${name}" no reconocida`
  } catch (e) {
    return `Error en ${name}: ${e instanceof Error ? e.message : String(e)}`
  }
}

function buildSystemPrompt(bizName: string, bizDescription: string): string {
  return `Sos el asistente personal de Sebastian Maqueira, dueño de ${bizName}.

SOBRE EL NEGOCIO:
${bizDescription}

TU ROL:
- Asistís a Sebastian en su día a día operativo y comercial
- Tenés acceso a herramientas para buscar clientes, registrar interacciones, cambiar estados y crear tareas — USÁLAS cuando corresponda
- Cuando Sebastian mencione un cliente por nombre, buscalo primero con buscar_clientes
- Cuando diga que habló con alguien o contactó a alguien, registrá la interacción
- Cuando diga que cerró una venta, cambiá el estado a "cliente"
- Hablás en español rioplatense, sos directo y práctico
- Nunca pedís confirmación innecesaria — si el contexto es claro, actuá

CONTEXTO DEL SISTEMA (datos de hoy):
{CONTEXT}

Si Sebastian pregunta qué hacer hoy, priorizá:
1. Clientes nuevos sin contactar (oportunidad inmediata)
2. Clientes fríos a reactivar
3. Pedidos pendientes
4. Leads con score alto sin cerrar`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!messages?.length) return NextResponse.json({ error: 'messages requerido' }, { status: 400 })

    const db = getDb()
    const [apiKeys, biz] = await Promise.all([getAllGroqKeys(db), getBusinessConfig(db)])
    if (!apiKeys.length) return NextResponse.json({ error: 'GROQ_API_KEY no configurada en settings ni en env' }, { status: 400 })

    const hoy = new Date()
    const treintaDias = new Date(Date.now() - 30 * 86400000).toISOString()
    const sieteDias = new Date(Date.now() - 7 * 86400000).toISOString()

    const [r1, r2, r3, r4, r5, r6, r7, r8, r9] = await Promise.all([
      db.from('clients').select('*', { count: 'exact', head: true }),
      db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
      db.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'inactivo'),
      db.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'b2b'),
      db.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'b2c'),
      db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', sieteDias),
      db.from('clients').select('name, score, status, type, rubro, phone, last_contact').order('score', { ascending: false }).limit(5),
      db.from('orders').select('status, created_at, total').gte('created_at', treintaDias).order('created_at', { ascending: false }).limit(5),
      db.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pendiente', 'confirmado']),
    ])

    const topLeadsText = (r7.data || []).map(c =>
      `  - ${c.name} (${c.type}, score: ${c.score}, estado: ${c.status}${c.rubro ? `, rubro: ${c.rubro}` : ''}${c.phone ? `, tel: ${c.phone}` : ''})`
    ).join('\n')

    const context = `
Fecha: ${hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
CLIENTES: ${r1.count || 0} total (${r4.count || 0} B2B + ${r5.count || 0} B2C) | ${r2.count || 0} sin contactar | ${r3.count || 0} inactivos | ${r6.count || 0} nuevos esta semana
TOP LEADS: ${topLeadsText || 'sin datos'}
PEDIDOS: ${r9.count || 0} pendientes | últimos: ${(r8.data || []).map(o => `${o.status} $${o.total || '?'}`).join(', ') || 'ninguno'}`

    const systemContent = buildSystemPrompt(biz.name, biz.description).replace('{CONTEXT}', context)

    // Función que intenta una llamada rotando keys en caso de 429
    async function groqCreate(params: Groq.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<Groq.Chat.Completions.ChatCompletion> {
      let lastErr: unknown
      for (const key of apiKeys) {
        try {
          return await new Groq({ apiKey: key }).chat.completions.create(params)
        } catch (e: unknown) {
          const status = (e as { status?: number })?.status
          if (status === 429) { lastErr = e; continue }
          throw e
        }
      }
      throw lastErr
    }

    // Agentic loop: el modelo puede llamar herramientas varias veces
    const groqMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...messages,
    ]
    const actions: string[] = []

    for (let i = 0; i < 5; i++) {
      let completion: Awaited<ReturnType<typeof groqCreate>>
      try {
        completion = await groqCreate({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 1000,
          temperature: 0.4,
        })
      } catch {
        // Si Groq rechaza la tool call (error de schema), reintentamos sin tools
        const fallback = await groqCreate({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          max_tokens: 1000,
          temperature: 0.4,
        })
        const fallbackMsg = fallback.choices[0]?.message?.content || 'Sin respuesta.'
        return NextResponse.json({ reply: fallbackMsg, actions })
      }

      const msg = completion.choices[0]?.message
      if (!msg) break

      groqMessages.push(msg as Groq.Chat.Completions.ChatCompletionMessageParam)

      // Sin tool calls → respuesta final
      if (!msg.tool_calls?.length) {
        return NextResponse.json({ reply: msg.content || 'Sin respuesta.', actions })
      }

      // Ejecutar cada tool call
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || '{}') as ToolArgs
        const result = await runTool(tc.function.name, args, db)
        actions.push(result)
        groqMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        })
      }
    }

    return NextResponse.json({ reply: 'Acción completada.', actions })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
