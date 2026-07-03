import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  const { idea, tipo, catalogUrl } = await req.json()

  const audiencia = tipo === 'b2c' ? 'personas particulares que compran para consumo propio'
    : tipo === 'b2b' ? 'negocios y restaurantes que compran en cantidad'
    : 'clientes en general, tanto particulares como negocios'

  const msg = await ask(
    `Generá un mensaje de WhatsApp para enviar a ${audiencia}.
${idea ? `La idea principal es: ${idea}.` : 'Generá una oferta o comunicación atractiva y genérica.'}
${catalogUrl ? `Incluí este link al catálogo: ${catalogUrl}` : ''}

Requisitos:
- Máximo 3 párrafos cortos
- Tono cercano y directo, no formal
- Usá emojis con moderación (2-3 máximo)
- Terminá con un call to action claro
- NO uses el nombre del cliente (es broadcast masivo)
- NO menciones precios específicos si no se indicaron
Solo el texto del mensaje, sin explicaciones.`,
    300
  )

  return NextResponse.json({ message: msg })
}
