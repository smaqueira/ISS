import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  const { products, idea, company } = await req.json()

  const promptText = await ask(
    `Generá un prompt en inglés para crear una imagen de flyer de Instagram para una empresa que vende: ${products}.
Idea visual: ${idea || 'producto destacado con fondo atractivo'}.
Empresa: ${company || 'negocio premium'}.
El prompt debe ser visual, detallado, estilo comercial profesional. Solo el prompt, sin explicaciones. Max 80 palabras.`,
    120
  )

  const encoded = encodeURIComponent(promptText.trim())
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true&seed=${Date.now()}`

  return NextResponse.json({ url, prompt: promptText })
}
