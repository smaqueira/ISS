import { NextRequest, NextResponse } from 'next/server'
import { botSend, vittoReply, vittoWelcome } from '@/lib/vitto-bot'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Historial en memoria por chat (se limpia al reiniciar, suficiente para el flujo)
const history: Record<string, { role: string; content: string }[]> = {}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const msg = update.message || update.edited_message
    if (!msg?.text) return NextResponse.json({ ok: true })

    const chatId = msg.chat.id
    const text = msg.text.trim()
    const key = String(chatId)

    if (!history[key]) history[key] = []

    // Comandos especiales
    if (text === '/start') {
      const welcome = await vittoWelcome(msg.from?.first_name || 'amigo')
      await botSend(chatId, welcome)
      return NextResponse.json({ ok: true })
    }

    if (text === '/precios' || text === '/catalogo') {
      const { getCatalogText } = await import('@/lib/vitto-bot')
      const catalogo = await getCatalogText()
      await botSend(chatId, `📋 <b>Lo que tenemos hoy:</b>\n\n${catalogo}\n\n¿Qué te llevo? 🐟`)
      return NextResponse.json({ ok: true })
    }

    if (text === '/ofertas') {
      const { generateOfertaDelDia } = await import('@/lib/vitto-bot')
      const oferta = await generateOfertaDelDia()
      await botSend(chatId, oferta)
      return NextResponse.json({ ok: true })
    }

    // Guardar mensaje del usuario
    history[key].push({ role: 'user', content: text })
    if (history[key].length > 12) history[key] = history[key].slice(-12)

    // Respuesta de Vitto con IA
    const reply = await vittoReply(text, history[key].slice(0, -1))
    history[key].push({ role: 'assistant', content: reply })

    await botSend(chatId, reply)

    // Guardar interacción en Supabase (para futuro CRM)
    try {
      const db = await createClient()
      await db.from('telegram_interactions').upsert({
        chat_id: String(chatId),
        username: msg.from?.username || null,
        name: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || null,
        last_message: text,
        last_reply: reply,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'chat_id' })
    } catch { /* tabla opcional, no frenar */ }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
