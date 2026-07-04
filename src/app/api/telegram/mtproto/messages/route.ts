import { NextRequest, NextResponse } from 'next/server'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram/tl'
import { getSetting } from '@/lib/settings'

export async function GET(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get('chatId')
    if (!chatId) return NextResponse.json({ error: 'chatId requerido' }, { status: 400 })

    const session = await getSetting('TELEGRAM_SESSION')
    if (!session) return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })

    const apiIdStr = await getSetting('TELEGRAM_API_ID')
    const apiHash = await getSetting('TELEGRAM_API_HASH')
    const apiId = parseInt(apiIdStr, 10)

    const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 3 })
    await client.connect()

    const messages = await client.getMessages(chatId, { limit: 50 })

    // Get own user ID for isOutgoing
    const me = await client.getMe()
    const myId = me.id?.toString()

    const result = messages.map(m => {
      if (!(m instanceof Api.Message)) return null
      const fromId = m.fromId
        ? ('userId' in m.fromId ? m.fromId.userId?.toString() : m.fromId.toString())
        : null
      return {
        id: m.id,
        text: m.message || '',
        date: m.date,
        fromId,
        fromName: '',
        isOutgoing: fromId === myId || m.out === true,
      }
    }).filter(Boolean)

    await client.disconnect()

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
