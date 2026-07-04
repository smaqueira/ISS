import { NextRequest, NextResponse } from 'next/server'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { getSetting } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()
    if (!phone || !code) return NextResponse.json({ error: 'phone y code requeridos' }, { status: 400 })

    const apiIdStr = await getSetting('TELEGRAM_API_ID')
    const apiHash = await getSetting('TELEGRAM_API_HASH')
    const phoneCodeHash = await getSetting('TELEGRAM_PHONE_CODE_HASH')
    if (!apiIdStr || !apiHash) {
      return NextResponse.json({ error: 'TELEGRAM_API_ID y TELEGRAM_API_HASH no configurados' }, { status: 400 })
    }

    const apiId = parseInt(apiIdStr, 10)
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 3 })
    await client.connect()

    await client.invoke(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (await import('telegram/tl')).Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    )

    const session = client.session.save() as unknown as string

    const db = await createClient()
    await db.from('settings').upsert({ key: 'TELEGRAM_SESSION', value: session })

    await client.disconnect()

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
