import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function sendTelegram(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

export async function POST(req: NextRequest) {
  const { nombre, telefono, email, pedido, direccion, horario } = await req.json()
  if (!nombre || !pedido) return NextResponse.json({ error: 'datos incompletos' }, { status: 400 })

  const db = getDb()

  // Buscar o crear cliente
  let clientId: string | null = null
  if (email) {
    const { data: existing } = await db.from('clients').select('id').eq('email', email).single()
    clientId = existing?.id || null
  }
  if (!clientId && telefono) {
    const { data: existing } = await db.from('clients').select('id').eq('phone', telefono).single()
    clientId = existing?.id || null
  }
  if (!clientId) {
    const { data: newClient } = await db.from('clients').insert({
      name: nombre,
      phone: telefono || null,
      email: email || null,
      type: 'b2c',
      status: 'nuevo',
      score: 70,
      channel: 'web',
    }).select('id').single()
    clientId = newClient?.id || null
  } else {
    await db.from('clients').update({ last_contact: new Date().toISOString(), status: 'contactado' }).eq('id', clientId)
  }

  // Guardar pedido como interacción
  const notes = [
    `🛒 *Pedido web*`,
    `Producto: ${pedido}`,
    direccion ? `Dirección: ${direccion}` : null,
    horario ? `Horario: ${horario}` : null,
    telefono ? `Tel: ${telefono}` : null,
    email ? `Email: ${email}` : null,
  ].filter(Boolean).join('\n')

  if (clientId) {
    await db.from('interactions').insert({
      client_id: clientId,
      channel: 'web',
      type: 'pedido',
      notes,
      ai_generated: false,
    })
  }

  // Notificar al admin por Telegram
  const { data: tokenRow } = await db.from('settings').select('value').eq('key', 'TELEGRAM_BOT_TOKEN').single()
  const { data: chatRow } = await db.from('settings').select('value').eq('key', 'TELEGRAM_CHAT_ID').single()
  const token = tokenRow?.value
  const chatId = chatRow?.value

  if (token && chatId) {
    const msg = [
      `🛒 *Nuevo pedido desde la web*`,
      ``,
      `👤 *${nombre}*`,
      telefono ? `📱 ${telefono}` : null,
      email ? `✉️ ${email}` : null,
      ``,
      `📦 *Pedido:* ${pedido}`,
      direccion ? `📍 *Dirección:* ${direccion}` : null,
      horario ? `🕐 *Horario:* ${horario}` : null,
    ].filter(v => v !== null).join('\n')

    await sendTelegram(token, chatId, msg)
  }

  return NextResponse.json({ ok: true })
}
