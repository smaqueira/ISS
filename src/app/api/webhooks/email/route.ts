import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyMessage } from '@/lib/ai/classify'
import { generateAutoReply } from '@/lib/ai/autoreply'
import { sendProposalEmail } from '@/lib/email/send'
import { sendMessage } from '@/lib/telegram/send'

// Resend webhook — captura respuestas de clientes a nuestros emails
export async function POST(req: NextRequest) {
  const payload = await req.json()

  const fromEmail = payload.from?.email || payload.sender
  const body = payload.text || payload.plain || ''
  const subject = payload.subject || ''

  if (!fromEmail || !body) return NextResponse.json({ ok: true })

  // Ignorar si dice "no gracias"
  if (/no gracias|desuscribir|unsubscribe/i.test(body)) {
    const db = await createClient()
    const { data: client } = await db.from('clients').select('id').eq('email', fromEmail).single()
    if (client) {
      await db.from('clients').update({ status: 'inactivo' }).eq('id', client.id)
      await db.from('interactions').insert({ client_id: client.id, channel: 'email', type: 'respuesta', notes: 'Cliente pidió no ser contactado. Estado: inactivo.', ai_generated: false })
    }
    return NextResponse.json({ ok: true })
  }

  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('email', fromEmail).single()
  if (!client) return NextResponse.json({ ok: true })

  // Clasificar con IA
  const classification = await classifyMessage(body)

  // Registrar interacción
  await db.from('interactions').insert({
    client_id: client.id, channel: 'email', type: 'respuesta',
    notes: `Respuesta recibida — ${classification.type}: "${body.slice(0, 200)}"`,
    ai_generated: false,
  })

  // Actualizar estado
  const newStatus = classification.type === 'compra' ? 'interesado' : 'contactado'
  await db.from('clients').update({ status: newStatus, last_contact: new Date().toISOString() }).eq('id', client.id)

  // Alerta Telegram si es compra
  if (classification.type === 'compra') {
    await sendMessage(`🔥 *${client.name}* quiere comprar!\n\nMensaje: _"${body.slice(0, 150)}"_\n\nEmail: ${fromEmail}`)
  }

  // Auto-responder si es consulta o reclamo
  if (['consulta', 'reclamo'].includes(classification.type)) {
    const reply = await generateAutoReply({ client_name: client.name, message: body, type: classification.type, urgency: classification.urgency })
    await sendProposalEmail({ to: fromEmail, client_name: client.name, subject: `Re: ${subject}`, body: reply })
    await db.from('interactions').insert({ client_id: client.id, channel: 'email', type: 'respuesta_auto', notes: `Auto-respuesta enviada: ${reply.slice(0, 150)}`, ai_generated: true })
  }

  return NextResponse.json({ ok: true })
}
