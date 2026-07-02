import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyMessage } from '@/lib/ai/classify'
import { generateAutoReply } from '@/lib/ai/autoreply'
import { sendMessage } from '@/lib/telegram/send'

// Meta WhatsApp Business API webhook
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const payload = await req.json()
  const entry = payload.entry?.[0]?.changes?.[0]?.value
  if (!entry?.messages?.[0]) return NextResponse.json({ ok: true })

  const msg = entry.messages[0]
  const from = msg.from // número de teléfono
  const text = msg.text?.body || ''

  if (!text) return NextResponse.json({ ok: true })

  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('phone', from).single()

  // Si no existe el cliente → crear automáticamente
  if (!client) {
    await db.from('clients').insert({ name: `WA: ${from}`, phone: from, type: 'b2c', status: 'nuevo', score: 60, channel: 'whatsapp' })
    await sendMessage(`📱 Nuevo contacto por WhatsApp: ${from}\nMensaje: _"${text.slice(0, 100)}"_`)
    return NextResponse.json({ ok: true })
  }

  // Clasificar mensaje
  const classification = await classifyMessage(text)

  // Registrar en CRM
  await db.from('interactions').insert({
    client_id: client.id, channel: 'whatsapp', type: 'mensaje',
    notes: `WA recibido — ${classification.type}: "${text.slice(0, 200)}"`,
    ai_generated: false,
  })

  await db.from('clients').update({ status: classification.type === 'compra' ? 'interesado' : 'contactado', last_contact: new Date().toISOString() }).eq('id', client.id)

  // Alerta si quiere comprar
  if (classification.type === 'compra') {
    await sendMessage(`🛒 *${client.name}* quiere comprar por WhatsApp!\n_"${text.slice(0, 150)}"_\n📱 ${from}`)
    return NextResponse.json({ ok: true })
  }

  // Auto-responder consultas por WhatsApp Business API
  const reply = await generateAutoReply({ client_name: client.name, message: text, type: classification.type, urgency: classification.urgency })

  await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: from, type: 'text', text: { body: reply } }),
  })

  await db.from('interactions').insert({ client_id: client.id, channel: 'whatsapp', type: 'respuesta_auto', notes: `Auto-respuesta WA: ${reply.slice(0, 150)}`, ai_generated: true })

  return NextResponse.json({ ok: true })
}
