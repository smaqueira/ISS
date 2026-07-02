import Groq from 'groq-sdk'
import { getSetting } from '@/lib/settings'

const MODEL = 'llama-3.3-70b-versatile'

async function getKeys(): Promise<string[]> {
  const [k1, k2, k3, k4] = await Promise.all([
    getSetting('GROQ_API_KEY_1'),
    getSetting('GROQ_API_KEY_2'),
    getSetting('GROQ_API_KEY_3'),
    getSetting('GROQ_API_KEY_4'),
  ])
  return [k1, k2, k3, k4].filter(Boolean)
}

export async function ask(prompt: string, maxTokens = 300): Promise<string> {
  const keys = await getKeys()
  if (keys.length === 0) throw new Error('No hay Groq API keys configuradas')

  for (const key of keys) {
    try {
      const groq = new Groq({ apiKey: key })
      const res = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: maxTokens,
      })
      return res.choices[0].message.content || ''
    } catch (e: unknown) {
      const isRateLimit = e instanceof Error && (e.message.includes('429') || e.message.includes('rate') || e.message.includes('quota'))
      if (!isRateLimit) throw e
      // Si es rate limit → prueba con la siguiente key
    }
  }

  throw new Error('Todas las Groq API keys están agotadas')
}

export function parseJSON<T>(text: string): T {
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    // Extraer el primer bloque JSON si hay texto extra
    const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    return JSON.parse(match ? match[0] : clean)
  } catch {
    throw new Error(`IA devolvió respuesta inválida: ${text.slice(0, 100)}`)
  }
}
