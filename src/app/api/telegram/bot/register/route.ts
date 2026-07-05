import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN no configurado' }, { status: 500 })

  const { url } = await req.json()
  const webhookUrl = url || `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/telegram/bot/webhook`

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'edited_message'] }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN no configurado' }, { status: 500 })

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
  return NextResponse.json(await res.json())
}
