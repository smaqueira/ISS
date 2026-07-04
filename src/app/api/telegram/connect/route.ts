import { NextRequest, NextResponse } from 'next/server'
import { freshClient } from '@/lib/telegram-client'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'phone requerido' }, { status: 400 })

  const apiId = parseInt(process.env.TELEGRAM_API_ID || '0')
  const apiHash = process.env.TELEGRAM_API_HASH || ''
  if (!apiId || !apiHash) return NextResponse.json({ error: 'TELEGRAM_API_ID / TELEGRAM_API_HASH no configurados' }, { status: 500 })

  try {
    const client = await freshClient()
    const { phoneCodeHash } = await client.sendCode({ apiId, apiHash }, phone)
    await client.disconnect()

    const db = await createClient()
    await Promise.all([
      db.from('settings').upsert({ key: 'TELEGRAM_PHONE_HASH', value: phoneCodeHash }),
      db.from('settings').upsert({ key: 'TELEGRAM_PHONE', value: phone }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
