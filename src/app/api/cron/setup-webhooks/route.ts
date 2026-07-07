import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getSetting(key: string) {
  const db = getDb()
  const { data } = await db.from('settings').select('value').eq('key', key).single()
  return data?.value || ''
}

async function setWebhook(token: string, url: string): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return res.json()
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && secret !== 'setup') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const base = 'https://app.vittomare.com'

  const [adminToken, customerToken] = await Promise.all([
    getSetting('TELEGRAM_BOT_TOKEN'),
    getSetting('TELEGRAM_CUSTOMER_BOT_TOKEN'),
  ])

  const results: Record<string, unknown> = {}

  if (adminToken) {
    results.ventas_vitto_bot = await setWebhook(adminToken, `${base}/api/webhooks/telegram`)
  } else {
    results.ventas_vitto_bot = { ok: false, error: 'sin token' }
  }

  if (customerToken) {
    results.vittomare_bot = await setWebhook(customerToken, `${base}/api/webhooks/telegram-customer`)
  } else {
    results.vittomare_bot = { ok: false, error: 'sin token' }
  }

  const allOk = Object.values(results).every((r: unknown) => (r as { ok: boolean }).ok)
  return NextResponse.json({ ok: allOk, results, ts: new Date().toISOString() })
}
