import { NextRequest, NextResponse } from 'next/server'
import { classifyLead, classifyMessage, generateProposal, generateFollowUp, generateInstagramContent } from '@/lib/groq'
import { getDayOfWeek, getSeason } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  try {
    switch (action) {
      case 'classify_lead':
        return NextResponse.json(await classifyLead(body.data))

      case 'classify_message':
        return NextResponse.json(await classifyMessage(body.message))

      case 'generate_proposal':
        return NextResponse.json(await generateProposal(body.client))

      case 'generate_followup':
        return NextResponse.json(await generateFollowUp(body.params))

      case 'generate_instagram':
        return NextResponse.json(
          await generateInstagramContent({
            products: body.products || [],
            season: getSeason(),
            day_of_week: getDayOfWeek(),
            type: body.content_type || 'post',
          })
        )

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error en IA:', error)
    return NextResponse.json({ error: 'Error procesando con IA' }, { status: 500 })
  }
}
