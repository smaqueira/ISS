import { NextRequest, NextResponse } from 'next/server'
import {
  handleIncomingDM,
  handleIncomingComment,
  handleStoryMention,
} from '@/lib/instagram/client'

export const runtime = 'nodejs'

// Meta llama a GET para verificar el webhook
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN
  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Meta envía eventos a POST
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.object !== 'instagram') {
      return NextResponse.json({ ok: true })
    }

    for (const entry of body.entry || []) {
      // DMs entrantes
      for (const event of entry.messaging || []) {
        const senderId: string = event.sender?.id
        if (!senderId) continue

        // Ignorar mensajes que mandamos nosotros (el page ID es el sender)
        const pageId = process.env.INSTAGRAM_PAGE_ID || ''
        if (senderId === pageId) continue

        if (event.message?.text) {
          await handleIncomingDM(
            senderId,
            event.sender?.username,
            event.message.text,
          )
        }
      }

      // Comentarios y story mentions
      for (const change of entry.changes || []) {
        const val = change.value

        if (change.field === 'comments' && val?.text) {
          await handleIncomingComment(
            val.from?.id,
            val.from?.username,
            val.text,
            val.id,
          )
        }

        if (change.field === 'mentions' && val?.media_id) {
          await handleStoryMention(
            val.comment_id ? val.from?.id : entry.id,
            val.from?.username,
          )
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Instagram webhook error:', e)
    // Siempre devolver 200 a Meta o reintenta infinitamente
    return NextResponse.json({ ok: true })
  }
}
