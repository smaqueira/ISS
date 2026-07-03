import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'
import { ask } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const message = body.message || body.channel_post
  if (!message) return NextResponse.json({ ok: true })

  const db = await createClient()
  const chatId = String(message.chat?.id || '')
  const fromId = String(message.from?.id || '')
  const fromName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || message.chat?.title || 'Desconocido'
  const text = message.text || message.caption || ''
  const isGroup = message.chat?.type === 'group' || message.chat?.type === 'supergroup'

  // Guardar mensaje en DB
  await db.from('telegram_messages').insert({
    chat_id: chatId,
    from_id: fromId,
    from_name: fromName,
    text,
    is_group: isGroup,
    direction: 'in',
    message_id: String(message.message_id),
    raw: message,
  })

  // Respuesta automática a mensajes privados con IA
  if (!isGroup && text) {
    const token = await getSetting('TELEGRAM_BOT_TOKEN')
    if (!token) return NextResponse.json({ ok: true })

    const aiReply = await ask(
      `Sos el asistente de ventas de la empresa. Un cliente potencial te escribió por Telegram: "${text}".
Respondé de forma amigable, breve (máximo 2 oraciones). Si pregunta por productos o precios, decile que enseguida un asesor se contacta con él.
Solo el texto de la respuesta, sin explicaciones.`,
      150
    ).catch(() => null)

    if (aiReply) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: aiReply }),
      })
      // Guardar la respuesta automática también
      await db.from('telegram_messages').insert({
        chat_id: chatId,
        from_id: 'bot',
        from_name: 'Bot (IA)',
        text: aiReply,
        is_group: false,
        direction: 'out',
        message_id: null,
        raw: {},
      })
    }
  }

  return NextResponse.json({ ok: true })
}
