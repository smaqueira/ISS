import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()

  // Traer todos los chats únicos con su último mensaje
  const { data } = await db
    .from('telegram_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!data) return NextResponse.json([])

  // Agrupar por chat_id
  const chatsMap = new Map<string, {
    chat_id: string
    from_name: string
    is_group: boolean
    last_message: string
    last_at: string
    unread: number
    messages: typeof data
  }>()

  for (const msg of [...data].reverse()) {
    if (!chatsMap.has(msg.chat_id)) {
      chatsMap.set(msg.chat_id, {
        chat_id: msg.chat_id,
        from_name: msg.from_name,
        is_group: msg.is_group,
        last_message: msg.text,
        last_at: msg.created_at,
        unread: 0,
        messages: [],
      })
    }
    const chat = chatsMap.get(msg.chat_id)!
    chat.messages.push(msg)
    chat.last_message = msg.text
    chat.last_at = msg.created_at
    if (msg.direction === 'in' && !msg.read) chat.unread++
  }

  return NextResponse.json([...chatsMap.values()].sort((a, b) => b.last_at.localeCompare(a.last_at)))
}
