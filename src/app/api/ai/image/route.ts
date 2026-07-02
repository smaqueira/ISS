import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/ai/client'
import { getSetting } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const { products, idea, tipo = 'showcase', prompt: customPrompt, width = 1080, height = 1080 } = await req.json()

  const tipoContexts: Record<string, string> = {
    flyer: 'promotional flyer with bold discount offer, price crossed out, vibrant colors, Argentine market style',
    story: 'Instagram story vertical format, eye-catching, swipe up call to action, bold typography, gradient background',
    whatsapp: 'WhatsApp banner horizontal, product on right, clear promotional message, friendly professional tone',
    showcase: 'elegant product photography, clean studio background, professional lighting, premium minimalist composition',
  }
  const tipoContext = tipoContexts[tipo] || tipoContexts['showcase']

  const promptText = customPrompt || await ask(
    `Generá un prompt en inglés para una imagen comercial fotorrealista de: ${products}.
Estilo: ${tipoContext}.
IMPORTANTE: NO incluir texto, letras, palabras ni números en la imagen. Solo elementos visuales puros.
El prompt debe ser muy visual y detallado. Solo el prompt en inglés, sin explicaciones. Max 80 palabras.`,
    120
  )

  const ideogramKey = await getSetting('IDEOGRAM_API_KEY')

  // Fal.ai FLUX (fotorrealista) con rotación de keys
  const [falKey1, falKey2, falKey3] = await Promise.all([
    getSetting('FAL_API_KEY'), getSetting('FAL_API_KEY_2'), getSetting('FAL_API_KEY_3'),
  ])
  const falKeys = [falKey1, falKey2, falKey3].filter(Boolean)
  for (const falKey of falKeys) {
    try {
      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          image_size: width === height ? 'square_hd' : width > height ? 'landscape_16_9' : 'portrait_16_9',
          num_images: 1,
          enable_safety_checker: false,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const url = data.images?.[0]?.url
        if (url) return NextResponse.json({ url, prompt: promptText, source: 'fal' })
      }
    } catch { continue }
  }

  // Ideogram
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
