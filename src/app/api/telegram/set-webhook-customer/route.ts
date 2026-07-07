import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await db.from('settings').select('value').eq('key', 'TELEGRAM_CUSTOMER_BOT_TOKEN').single()
  const token = data?.value
  if (!token) return NextResponse.json({ error: 'sin token — configurá TELEGRAM_CUSTOMER_BOT_TOKEN en Settings' })

  const webhookUrl = 'https://app.vittomare.com/api/webhooks/telegram-customer'
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  const result = await res.json()
  return NextResponse.json(result)
}
