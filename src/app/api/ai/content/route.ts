import { NextRequest, NextResponse } from 'next/server'
import { generateInstagramPost, generateBroadcast, generateWeeklyCalendar } from '@/lib/ai/content'

export async function POST(req: NextRequest) {
  const { type, products, content_type, broadcast_type, client_name } = await req.json()
  try {
    if (type === 'instagram') {
      const result = await generateInstagramPost(products)
      return NextResponse.json(result)
    }
    if (type === 'broadcast') {
      const text = await generateBroadcast({ products, type: broadcast_type, client_name })
      return NextResponse.json({ text })
    }
    if (type === 'calendar') {
      const days = await generateWeeklyCalendar(products)
      return NextResponse.json({ days })
    }
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Error generando contenido' }, { status: 500 })
  }
}
