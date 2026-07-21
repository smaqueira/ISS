import Groq from 'groq-sdk'
import { getSetting } from '@/lib/settings'

const MODEL = 'llama-3.3-70b-versatile'

const KEY_NAMES = ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4']

async function getKeys(): Promise<string[]> {
  const values = await Promise.all(KEY_NAMES.map((k) => getSetting(k)))
  // Dedup manteniendo el orden (GROQ_API_KEY primero, luego _1.._4)
  return [...new Set(values.filter(Boolean))]
}

/**
 * Decide si conviene reintentar con la SIGUIENTE key ante un error de Groq.
 *
 * Rota ante cualquier error salvo un 400 (bad request), que fallaría igual con
 * todas las keys. Esto cubre de forma robusta el caso "sin créditos / rate limit"
 * sin depender del texto del mensaje (que Groq escribe con mayúsculas variables:
 * "Rate limit reached...", "You have exceeded...", etc.).
 *
 * Cubre: 401 (key inválida/revocada), 402 (sin créditos), 403, 429 (rate/quota),
 * 5xx (caída temporal) y errores de red (sin `status`).
 */
export function shouldRotateGroqError(e: unknown): boolean {
  const status = (e as { status?: number } | null)?.status
  if (status === 400) return false
  return true
}

/**
 * Ejecuta una llamada a Groq probando cada key en orden. Salta a la siguiente
 * cuando una está agotada/inválida y solo falla si TODAS fallan.
 */
export async function groqWithRotation<T>(
  keys: string[],
  call: (groq: Groq) => Promise<T>,
): Promise<T> {
  const usable = [...new Set(keys.filter(Boolean))]
  if (usable.length === 0) throw new Error('No hay Groq API keys configuradas')

  let lastErr: unknown
  for (const key of usable) {
    try {
      return await call(new Groq({ apiKey: key }))
    } catch (e: unknown) {
      lastErr = e
      if (!shouldRotateGroqError(e)) throw e
      // key agotada/inválida → probar con la siguiente
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('Todas las Groq API keys están agotadas')
}

export async function ask(prompt: string, maxTokens = 300): Promise<string> {
  const keys = await getKeys()
  const res = await groqWithRotation(keys, (groq) =>
    groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  )
  return res.choices[0].message.content || ''
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
