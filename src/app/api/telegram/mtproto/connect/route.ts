import { NextRequest, NextResponse } from 'next/server'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { getSetting } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'phone requerido' }, { status: 400 })

    const apiIdStr = await getSetting('TELEGRAM_API_ID')
    const apiHash = await getSetting('TELEGRAM_API_HASH')
    if (!apiIdStr || !apiHash) {
      return NextResponse.json({ error: 'TELEGRAM_API_ID y TELEGRAM_API_HASH no configurados' }, { status: 400 })
    }

    const apiId = parseInt(apiIdStr, 10)
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 3 })
    await client.connect()

    const result = await client.sendCode({ apiId, apiHash }, phone)

    const db = await createClient()
    await db.from('settings').upsert({ key: 'TELEGRAM_PHONE_CODE_HASH', value: result.phoneCodeHash })

    await client.disconnect()

    return NextResponse.json({ ok: true, message: 'Código enviado al número indicado' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
