import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const { chat_id, text } = await req.json()
  if (!chat_id || !text) return NextResponse.json({ error: 'chat_id y text requeridos' }, { status: 400 })

  const token = await getSetting('TELEGRAM_BOT_TOKEN')
  if (!token) return NextResponse.json({ error: 'Token no configurado' }, { status: 500 })

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' }),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.description }, { status: 400 })
  }

  const db = await createClient()
  await db.from('telegram_messages').insert({
    chat_id: String(chat_id),
    from_id: 'bot',
    from_name: 'Vos',
    text,
    is_group: false,
    direction: 'out',
    message_id: null,
    raw: {},
  })

  return NextResponse.json({ ok: true })
}
