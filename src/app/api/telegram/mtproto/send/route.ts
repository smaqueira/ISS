import { NextRequest, NextResponse } from 'next/server'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { getSetting } from '@/lib/settings'

export async function POST(req: NextRequest) {
  try {
    const { chatId, text } = await req.json()
    if (!chatId || !text) return NextResponse.json({ error: 'chatId y text requeridos' }, { status: 400 })

    const session = await getSetting('TELEGRAM_SESSION')
    if (!session) return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })

    const apiIdStr = await getSetting('TELEGRAM_API_ID')
    const apiHash = await getSetting('TELEGRAM_API_HASH')
    const apiId = parseInt(apiIdStr, 10)

    const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 3 })
    await client.connect()

    const result = await client.sendMessage(chatId, { message: text })

    await client.disconnect()

    return NextResponse.json({ ok: true, messageId: result.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
