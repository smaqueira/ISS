import { NextResponse } from 'next/server'
import { getConnectedClient } from '@/lib/telegram-client'
import { Api } from 'telegram'
import bigInt from 'big-integer'

export const runtime = 'nodejs'

export async function GET() {
  const client = await getConnectedClient()
  if (!client) return NextResponse.json({ error: 'no conectado' }, { status: 401 })

  try {
    const dialogs = await client.invoke(new Api.messages.GetDialogs({
      offsetDate: 0, offsetId: 0, offsetPeer: new Api.InputPeerEmpty(), limit: 30, hash: bigInt(0),
    }))

    if (!('dialogs' in dialogs)) return NextResponse.json([])

    const chats: unknown[] = []
    for (const dialog of dialogs.dialogs) {
      if (!(dialog instanceof Api.Dialog)) continue
      const peer = dialog.peer
      let id: string | null = null
      let name = ''
      let type: 'user' | 'group' | 'channel' = 'user'

      if (peer instanceof Api.PeerUser) {
        id = String(peer.userId)
        type = 'user'
        const user = dialogs.users?.find((u): u is Api.User => u instanceof Api.User && String(u.id) === id)
        name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || id : id
      } else if (peer instanceof Api.PeerChat) {
        id = String(peer.chatId)
        type = 'group'
        const chat = dialogs.chats?.find((c): c is Api.Chat => c instanceof Api.Chat && String(c.id) === id)
        name = chat?.title || id
      } else if (peer instanceof Api.PeerChannel) {
        id = String(peer.channelId)
        const ch = dialogs.chats?.find((c): c is Api.Channel => c instanceof Api.Channel && String(c.id) === id)
        type = ch?.megagroup ? 'group' : 'channel'
        name = ch?.title || id
      }

      if (id && name) {
        chats.push({ id, name, type, unreadCount: dialog.unreadCount })
      }
    }

    return NextResponse.json(chats)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
