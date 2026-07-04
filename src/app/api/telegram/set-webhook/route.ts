import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'

export async function GET() {
  const token = await getSetting('TELEGRAM_BOT_TOKEN')
  if (!token) return NextResponse.json({ error: 'sin token' })

  const webhookUrl = 'https://app.vittomare.com/api/webhooks/telegram'
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
