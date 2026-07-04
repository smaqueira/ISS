import { NextRequest, NextResponse } from 'next/server'
import { getConnectedClient } from '@/lib/telegram-client'
import { Api } from 'telegram'
import bigInt from 'big-integer'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const chatId = searchParams.get('chatId')
  const type = searchParams.get('type') || 'user'
  if (!chatId) return NextResponse.json({ error: 'chatId requerido' }, { status: 400 })

  const client = await getConnectedClient()
  if (!client) return NextResponse.json({ error: 'no conectado' }, { status: 401 })

  try {
    let peer: Api.TypeInputPeer
    if (type === 'group') {
      peer = new Api.InputPeerChat({ chatId: bigInt(chatId) })
    } else if (type === 'channel') {
      peer = new Api.InputPeerChannel({ channelId: bigInt(chatId), accessHash: bigInt(0) })
    } else {
      peer = new Api.InputPeerUser({ userId: bigInt(chatId), accessHash: bigInt(0) })
    }

    const result = await client.invoke(new Api.messages.GetHistory({
      peer, limit: 30, offsetId: 0, offsetDate: 0, addOffset: 0, maxId: 0, minId: 0, hash: bigInt(0),
    }))

    if (!('messages' in result)) return NextResponse.json([])

    const me = await client.getMe() as Api.User
    const myId = String(me.id)

    const messages = (result.messages as Api.TypeMessage[])
      .filter((m): m is Api.Message => m instanceof Api.Message)
      .reverse()
      .map(m => ({
        id: String(m.id),
        text: m.message,
        date: m.date,
        out: m.out || (m.fromId instanceof Api.PeerUser && String(m.fromId.userId) === myId),
      }))

    return NextResponse.json(messages)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
