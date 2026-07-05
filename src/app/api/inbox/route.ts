import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const CANAL_ICONS: Record<string, string> = {
  whatsapp: '💬',
  instagram: '📸',
  email: '📧',
  telegram: '✈️',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const canal = searchParams.get('canal') // filtro opcional
  const dias = parseInt(searchParams.get('dias') || '7')

  const db = await createClient()
  const since = new Date(Date.now() - dias * 86400000).toISOString()

  // Interacciones recientes (WhatsApp, Email, etc.) con datos del cliente
  const { data: interactions } = await db
    .from('interactions')
    .select('*, clients(id, name, phone, email, type, status, rubro, city)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  // DMs de Instagram
  const { data: igConvs } = await db
    .from('instagram_conversations')
    .select('*')
    .gte('last_message_at', since)
    .order('last_message_at', { ascending: false })
    .limit(50)

  // Normalizar en mensajes unificados
  const messages: UnifiedMessage[] = []

  for (const i of interactions || []) {
    const c = i.clients as ClientRow | null
    if (!c) continue
    const isIncoming = !i.ai_generated && i.type !== 'respuesta_auto'
    messages.push({
      id: i.id,
      canal: i.channel || 'whatsapp',
      canal_icon: CANAL_ICONS[i.channel] || '💬',
      direction: isIncoming ? 'in' : 'out',
      client_id: c.id,
      client_name: c.name,
      client_phone: c.phone,
      client_email: c.email,
      client_type: c.type,
      client_status: c.status,
      client_rubro: c.rubro,
      client_city: c.city,
      text: i.notes || '',
      created_at: i.created_at,
    })
  }

  for (const ig of igConvs || []) {
    messages.push({
      id: ig.id,
      canal: 'instagram',
      canal_icon: '📸',
      direction: 'in',
      client_id: null,
      client_name: ig.username || 'Instagramer',
      client_phone: null,
      client_email: null,
      client_type: 'b2c',
      client_status: null,
      client_rubro: null,
      client_city: null,
      text: ig.last_message || '',
      created_at: ig.last_message_at,
      ig_user_id: ig.user_id,
    })
  }

  // Agrupar por client_id (o ig_user_id) → conversaciones
  const convMap = new Map<string, Conversation>()

  for (const msg of messages) {
    const key = msg.client_id || `ig_${msg.ig_user_id}` || msg.client_name
    if (!convMap.has(key)) {
      convMap.set(key, {
        id: key,
        client_id: msg.client_id,
        client_name: msg.client_name,
        client_phone: msg.client_phone,
        client_email: msg.client_email,
        client_type: msg.client_type,
        client_status: msg.client_status,
        client_rubro: msg.client_rubro,
        client_city: msg.client_city,
        canales: [],
        last_message: msg.text,
        last_at: msg.created_at,
        last_canal: msg.canal,
        last_canal_icon: msg.canal_icon,
        unread: 0,
        messages: [],
        ig_user_id: msg.ig_user_id,
      })
    }
    const conv = convMap.get(key)!
    conv.messages.push(msg)
    if (!conv.canales.includes(msg.canal)) conv.canales.push(msg.canal)
    if (msg.created_at > conv.last_at) {
      conv.last_message = msg.text
      conv.last_at = msg.created_at
      conv.last_canal = msg.canal
      conv.last_canal_icon = msg.canal_icon
    }
    if (msg.direction === 'in') conv.unread++
  }

  let conversations = Array.from(convMap.values())
    .sort((a, b) => b.last_at.localeCompare(a.last_at))

  if (canal) {
    conversations = conversations.filter(c => c.canales.includes(canal))
  }

  return NextResponse.json(conversations)
}

// Generar respuesta IA para un mensaje
export async function POST(req: NextRequest) {
  const { client_name, client_type, last_message, canal, rubro } = await req.json()

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const esB2B = client_type === 'b2b'
  const negocio = rubro ? `restaurante/negocio (${rubro})` : 'cliente'

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Sos el asistente de ventas de Vitto Mare, una pescadería premium de CABA.
Respondés mensajes de ${esB2B ? 'clientes B2B (restaurantes, hoteles, roticerías)' : 'clientes particulares'} por ${canal}.
Tono: profesional pero cercano, directo, sin florilegios. Máximo 3 líneas.
Objetivo: resolver la consulta, generar confianza y avanzar hacia la venta.`,
      },
      {
        role: 'user',
        content: `El cliente se llama "${client_name}" (${negocio}).
Escribió: "${last_message}"

Generá una respuesta lista para enviar por ${canal}.`,
      },
    ],
    temperature: 0.6,
    max_tokens: 200,
  })

  const reply = completion.choices[0].message.content?.trim() || ''
  return NextResponse.json({ reply })
}

interface ClientRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  type: string
  status: string
  rubro: string | null
  city: string | null
}

interface UnifiedMessage {
  id: string
  canal: string
  canal_icon: string
  direction: 'in' | 'out'
  client_id: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  client_type: string
  client_status: string | null
  client_rubro: string | null
  client_city: string | null
  text: string
  created_at: string
  ig_user_id?: string
}

interface Conversation {
  id: string
  client_id: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  client_type: string
  client_status: string | null
  client_rubro: string | null
  client_city: string | null
  canales: string[]
  last_message: string
  last_at: string
  last_canal: string
  last_canal_icon: string
  unread: number
  messages: UnifiedMessage[]
  ig_user_id?: string
}
