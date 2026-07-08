import Groq from 'groq-sdk'
import type { GenerateReelInput, ReelScript } from './types'

const VITTO_CONTEXT = `
Sos un experto en marketing de contenido para redes sociales, especializado en negocios de gastronomía y alimentos premium en Argentina.
Trabajás para Vitto Mare, una pescadería premium con delivery en Buenos Aires (CABA y GBA).

SOBRE VITTO MARE:
- Productos: langostinos, salmón, mariscos, pescados del día, productos para sushi
- Propuesta de valor: calidad de restaurante, selección diaria, cadena de frío garantizada, entrega en el día
- Tono: premium pero cercano, confiable, fresco, argentino
- Competencia se diferencia por: calidad superior, sistema propio, atención personalizada
- Segmento: foodie urbano CABA/GBA + restaurantes/sushi bars

PARA REELS:
- Gancho de 3 segundos: debe capturar atención inmediatamente con una pregunta, dato impactante o afirmación audaz
- Duración típica: 15-30 segundos para máximo engagement
- Hashtags en español + inglés para mayor alcance
- CTA siempre apuntando a WhatsApp o vittomare.com
- Música: sugerir géneros populares en TikTok/Reels (no usar nombres con copyright)
`

export interface AIScriptResult {
  ok: boolean
  script?: ReelScript
  error?: string
}

export async function generateReelScript(input: GenerateReelInput, apiKey: string): Promise<AIScriptResult> {
  const groq = new Groq({ apiKey })

  const duracion = input.duracion_objetivo || 30

  const prompt = `Creá un guión completo para un Reel de ${duracion} segundos para Vitto Mare.

PRODUCTO/TEMA: ${input.producto_nombre}
CATEGORÍA: ${input.categoria}
OBJETIVO: ${input.objetivo}
PLATAFORMA: ${input.plataforma}
${input.notas_adicionales ? `NOTAS ADICIONALES: ${input.notas_adicionales}` : ''}

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin texto adicional):
{
  "gancho": "texto del gancho para los primeros 3 segundos",
  "guion_completo": "guión narrado completo con todas las líneas habladas",
  "escenas": [
    {
      "orden": 1,
      "duracion": 5,
      "descripcion": "qué se ve en pantalla",
      "texto_pantalla": "texto superpuesto opcional",
      "camara": "tipo de plano"
    }
  ],
  "voz_sugerida": "descripción del tono/estilo de voz",
  "musica_sugerida": "género y energía de la música",
  "subtitulos": ["línea 1", "línea 2", "..."],
  "prompt_video": "prompt en inglés para herramientas de generación de video IA (Kling, Pika, Runway)"
}

Las escenas deben sumar exactamente ${duracion} segundos. Generá entre 3 y 6 escenas.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: VITTO_CONTEXT },
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
        { role: 'system', content: 'Generá hashtags para Instagram/TikTok. Respondé solo con JSON: {"hashtags": ["#tag1", "#tag2", ...]}' },
        { role: 'user', content: `Hashtags para reel de pescadería premium sobre: ${producto} (categoría: ${categoria}). Mix español/inglés, 15-20 hashtags, mezclar populares con nicho.` },
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
