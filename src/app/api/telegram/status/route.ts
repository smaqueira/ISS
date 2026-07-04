import { NextResponse } from 'next/server'
import { getConnectedClient } from '@/lib/telegram-client'
import { Api } from 'telegram'

export const runtime = 'nodejs'

export async function GET() {
  const client = await getConnectedClient()
  if (!client) return NextResponse.json({ connected: false })

  try {
    const me = await client.getMe() as Api.User
    return NextResponse.json({
      connected: true,
      phone: me.phone ? `+${me.phone}` : null,
      name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.username || '',
      username: me.username || null,
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
