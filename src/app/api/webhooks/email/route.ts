import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessage } from '@/lib/telegram/send'

export const runtime = 'nodejs'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Resend inbound webhook — captura emails entrantes a hola@vittomare.com
export async function POST(req: NextRequest) {
  const payload = await req.json()

  // Resend inbound format
  const fromEmail = (payload.from?.email || payload.from || '').toLowerCase().trim()
  const fromName = payload.from?.name || fromEmail
  const subject = payload.subject || '(sin asunto)'
  const body = payload.text || payload.plain || ''

  if (!fromEmail) return NextResponse.json({ ok: true })

  // Ignorar emails de noreply / notificaciones automáticas
  if (/noreply|no-reply|mailer-daemon|postmaster/i.test(fromEmail)) {
    return NextResponse.json({ ok: true })
  }

  const db = getDb()

  // Buscar o crear cliente
  let clientId: string
  let clientName: string

  const { data: existing } = await db
    .from('clients')
    .select('id, name')
    .eq('email', fromEmail)
    .single()

  if (existing) {
    clientId = existing.id
    clientName = existing.name
    await db.from('clients').update({
      last_contact: new Date().toISOString(),
      status: 'contactado',
    }).eq('id', clientId)
  } else {
    const { data: newClient } = await db.from('clients').insert({
      name: fromName,
      email: fromEmail,
      type: 'b2c',
      status: 'nuevo',
      score: 60,
      channel: 'email',
    }).select('id, name').single()

    if (!newClient) return NextResponse.json({ ok: true })
    clientId = newClient.id
    clientName = newClient.name
  }

  // Guardar interacción
  const notes = `📧 ${subject}${body ? '\n\n' + body.slice(0, 500) : ''}`
  await db.from('interactions').insert({
    client_id: clientId,
    channel: 'email',
    type: 'mensaje',
    notes,
    ai_generated: false,
  })

  // Notificar por Telegram
  await sendMessage(
    `📩 *Nuevo mail en Vitto Mare*\n\nDe: ${clientName} (${fromEmail})\nAsunto: ${subject}${body ? '\n\n_' + body.slice(0, 200).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&') + '_' : ''}`
  )

  return NextResponse.json({ ok: true })
}
