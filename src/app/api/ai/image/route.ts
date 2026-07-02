import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/ai/client'
import { getSetting } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const { products, idea, prompt: customPrompt, width = 1080, height = 1080 } = await req.json()

  const promptText = customPrompt || await ask(
    `Generá un prompt en inglés para crear una imagen comercial profesional para una empresa que vende: ${products}.
Idea visual: ${idea || 'producto destacado con fondo atractivo'}.
El prompt debe ser visual, detallado, estilo comercial premium. Solo el prompt, sin explicaciones. Max 80 palabras.`,
    120
  )

  const ideogramKey = await getSetting('IDEOGRAM_API_KEY')

  if (ideogramKey) {
    try {
      const res = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: { 'Api-Key': ideogramKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_request: {
            prompt: promptText,
            aspect_ratio: width === height ? 'ASPECT_1_1' : width > height ? 'ASPECT_16_9' : 'ASPECT_9_16',
            model: 'V_2',
            magic_prompt_option: 'AUTO',
          }
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const url = data.data?.[0]?.url
        if (url) return NextResponse.json({ url, prompt: promptText, source: 'ideogram' })
      }
    } catch { /* fallback a Pollinations */ }
  }

  const encoded = encodeURIComponent(promptText.trim())
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`
  return NextResponse.json({ url, prompt: promptText, source: 'pollinations' })
}
