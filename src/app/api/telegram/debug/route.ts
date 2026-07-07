import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'

export async function GET() {
  const token = await getSetting('TELEGRAM_BOT_TOKEN')
  const chatId = await getSetting('TELEGRAM_CHAT_ID')

  if (!token) return NextResponse.json({ error: 'sin token' })

  // Intentar enviar mensaje de prueba
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: '✅ Debug: bot funcionando' }),
  })
  const data = await res.json()

  return NextResponse.json({ token: token.slice(0, 10) + '...', chatId, tgResponse: data })
}
