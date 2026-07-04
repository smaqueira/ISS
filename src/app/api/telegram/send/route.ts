import { NextRequest, NextResponse } from 'next/server'
import { getConnectedClient } from '@/lib/telegram-client'
import { Api } from 'telegram'
import bigInt from 'big-integer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { chatId, type, text } = await req.json()
  if (!chatId || !text) return NextResponse.json({ error: 'chatId y text requeridos' }, { status: 400 })

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

    await client.invoke(new Api.messages.SendMessage({
      peer,
      message: text,
      randomId: bigInt(Math.floor(Math.random() * 1e15)),
    }))

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
