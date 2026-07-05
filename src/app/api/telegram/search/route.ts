import { NextRequest, NextResponse } from 'next/server'
import { getConnectedClient } from '@/lib/telegram-client'
import { Api } from 'telegram'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const global = searchParams.get('global') === '1'
  if (!q) return NextResponse.json({ error: 'q requerido' }, { status: 400 })

  const client = await getConnectedClient()
  if (!client) return NextResponse.json({ error: 'no conectado' }, { status: 401 })

  // Para búsqueda global limitamos a Argentina agregando el término
  const query = global ? `${q} Argentina` : q

  try {
    const result = await client.invoke(new Api.contacts.Search({ q: query, limit: 25 }))

    const groups = result.chats
      .filter((c): c is Api.Channel | Api.Chat => c instanceof Api.Channel || c instanceof Api.Chat)
      .map(c => {
        const isChannel = c instanceof Api.Channel
        return {
          id: String(c.id),
          title: c.title,
          type: isChannel ? (c.megagroup ? 'supergrupo' : 'canal') : 'grupo',
          username: isChannel && c.username ? c.username : null,
          link: isChannel && c.username ? `https://t.me/${c.username}` : null,
          participantsCount: isChannel ? (c.participantsCount ?? null) : null,
        }
      })

    return NextResponse.json(groups)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
