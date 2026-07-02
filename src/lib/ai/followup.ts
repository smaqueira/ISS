import { ask, parseJSON } from './client'
import type { ClientType } from '@/lib/types'

interface FollowUp {
  subject: string
  email: string
  whatsapp: string
}

export async function generateFollowUp(params: {
  name: string
  rubro: string
  type: ClientType
  days: number
}): Promise<FollowUp> {
  const prompt = `Seguimiento comercial en Argentina. Sin presión, amigable. SOLO JSON sin markdown:
{"subject":"asunto","email":"max 70 palabras","whatsapp":"max 40 palabras"}

Cliente: ${params.name} | Rubro: ${params.rubro} | Sin respuesta hace: ${params.days} días`

  const text = await ask(prompt, 350)
  return parseJSON<FollowUp>(text)
}
