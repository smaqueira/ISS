import Groq from 'groq-sdk'
import { modeloPreferido } from '@/lib/ai/client'
import type { GenerateReelInput, ReelScript } from './types'

const REELS_INSTRUCTIONS = `
PARA REELS:
- Gancho de 3 segundos: debe capturar atenciÃ³n inmediatamente con una pregunta, dato impactante o afirmaciÃ³n audaz
- DuraciÃ³n tÃ­pica: 15-30 segundos para mÃ¡ximo engagement
- Hashtags en espaÃ±ol + inglÃ©s para mayor alcance
- CTA siempre apuntando a WhatsApp o la web del negocio
- MÃºsica: sugerir gÃ©neros populares en TikTok/Reels (no usar nombres con copyright)
`

export interface AIScriptResult {
  ok: boolean
  script?: ReelScript
  error?: string
}

export async function generateReelScript(input: GenerateReelInput, apiKey: string, businessContext?: string): Promise<AIScriptResult> {
  const groq = new Groq({ apiKey })
  const systemContext = businessContext
    ? `Sos un experto en marketing de contenido para redes sociales.\n\nSobre el negocio:\n${businessContext}\n${REELS_INSTRUCTIONS}`
    : `Sos un experto en marketing de contenido para redes sociales.\n${REELS_INSTRUCTIONS}`

  const duracion = input.duracion_objetivo || 30

  const prompt = `CreÃ¡ un guiÃ³n completo para un Reel de ${duracion} segundos para Vitto Mare.

PRODUCTO/TEMA: ${input.producto_nombre}
CATEGORÃA: ${input.categoria}
OBJETIVO: ${input.objetivo}
PLATAFORMA: ${input.plataforma}
${input.notas_adicionales ? `NOTAS ADICIONALES: ${input.notas_adicionales}` : ''}

RespondÃ© ÃšNICAMENTE con un JSON vÃ¡lido con esta estructura exacta (sin markdown, sin texto adicional):
{
  "gancho": "texto del gancho para los primeros 3 segundos",
  "guion_completo": "guiÃ³n narrado completo con todas las lÃ­neas habladas",
  "escenas": [
    {
      "orden": 1,
      "duracion": 5,
      "descripcion": "quÃ© se ve en pantalla",
      "texto_pantalla": "texto superpuesto opcional",
      "camara": "tipo de plano"
    }
  ],
  "voz_sugerida": "descripciÃ³n del tono/estilo de voz",
  "musica_sugerida": "gÃ©nero y energÃ­a de la mÃºsica",
  "subtitulos": ["lÃ­nea 1", "lÃ­nea 2", "..."],
  "prompt_video": "prompt en inglÃ©s para herramientas de generaciÃ³n de video IA (Kling, Pika, Runway)",
  "fliki_script": "script formateado para Fliki.ai usando tags [Scene] y [Visual: ...] por cada escena, en espaÃ±ol"
}

Las escenas deben sumar exactamente ${duracion} segundos. GenerÃ¡ entre 3 y 6 escenas.

Para fliki_script usÃ¡ este formato exacto:
[Scene]
[Visual: descripciÃ³n en inglÃ©s de lo que se ve]
Texto narrado de la escena en espaÃ±ol.

[Scene]
[Visual: descripciÃ³n en inglÃ©s]
Texto narrado en espaÃ±ol.

(una secciÃ³n [Scene] por cada escena)`

  try {
    const completion = await groq.chat.completions.create({
      model: modeloPreferido(),
      messages: [
        { role: 'system', content: systemContext },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return { ok: false, error: 'Sin respuesta de la IA' }

    const script = JSON.parse(content) as ReelScript
    return { ok: true, script }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error generando script' }
  }
}

export async function generateHashtags(producto: string, categoria: string, apiKey: string): Promise<string[]> {
  const groq = new Groq({ apiKey })
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'GenerÃ¡ hashtags para Instagram/TikTok. RespondÃ© solo con JSON: {"hashtags": ["#tag1", "#tag2", ...]}' },
        { role: 'user', content: `Hashtags para reel de pescaderÃ­a premium sobre: ${producto} (categorÃ­a: ${categoria}). Mix espaÃ±ol/inglÃ©s, 15-20 hashtags, mezclar populares con nicho.` },
      ],
      max_tokens: 300,
      temperature: 0.6,
      response_format: { type: 'json_object' },
    })
    const content = completion.choices[0]?.message?.content
    if (!content) return []
    const parsed = JSON.parse(content)
    return parsed.hashtags || []
  } catch {
    return []
  }
}
