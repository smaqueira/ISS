import { NextResponse } from 'next/server'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram/tl'
import { getSetting } from '@/lib/settings'

export async function GET() {
  try {
    const session = await getSetting('TELEGRAM_SESSION')
    if (!session) return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })

    const apiIdStr = await getSetting('TELEGRAM_API_ID')
    const apiHash = await getSetting('TELEGRAM_API_HASH')
    const apiId = parseInt(apiIdStr, 10)

    const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 3 })
    await client.connect()

    const dialogs = await client.getDialogs({ limit: 50 })

    const result = dialogs.map(d => {
      let type: 'user' | 'group' | 'channel' = 'user'
      if (d.isChannel) type = 'channel'
      else if (d.isGroup) type = 'group'

      const lastMsg = d.message
      let lastMessageText = ''
      let lastMessageDate = 0
      if (lastMsg && lastMsg instanceof Api.Message) {
        lastMessageText = lastMsg.message || ''
        lastMessageDate = lastMsg.date
      }

      return {
        id: d.id?.toString() ?? '',
        title: d.title || d.name || 'Sin nombre',
        type,
        unreadCount: d.unreadCount,
        lastMessage: lastMessageText,
        date: lastMessageDate,
      }
    })

    await client.disconnect()

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
