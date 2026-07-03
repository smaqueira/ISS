import { ask, parseJSON } from './client'
import type { ClientType, Channel } from '@/lib/types'

interface ClassifyResult {
  type: ClientType
  score: number
  reason: string
  channel: Channel
}

const FALLBACK: ClassifyResult = { type: 'b2b', score: 50, reason: 'Clasificación manual pendiente', channel: 'whatsapp' }

export async function classifyLead(data: {
  name: string
  rubro?: string
  description?: string
}): Promise<ClassifyResult> {
  try {
    const prompt = `Sos experto en ventas B2B en Argentina. Tu tarea es clasificar negocios como compradores potenciales en cantidad.

REGLA PRINCIPAL: Si el negocio es un local comercial de gastronomía o servicio, SIEMPRE es B2B.
B2B = restaurante, cafetería, bar, parrilla, hotel, catering, bodegón, pizzería, cantina, rotisería, hamburguesería, buffet, supermercado, carnicería, verdulería, almacén, empresa, colegio, hospital, club.
B2C = persona particular sin local comercial.

Score 80-100: gastronomía o negocio grande con alta demanda de productos.
Score 60-79: negocio mediano o con demanda moderada.
Score 40-59: negocio pequeño o demanda incierta.

Respondé SOLO JSON sin markdown:
{"type":"b2b o b2c","score":0-100,"reason":"breve","channel":"whatsapp|email|telefono"}

Negocio: ${data.name}
Rubro: ${data.rubro || 'desconocido'}
Info: ${data.description || '-'}`

    const text = await ask(prompt, 150)
    return parseJSON<ClassifyResult>(text)
  } catch {
    return FALLBACK
  }
}

export async function classifyMessage(message: string) {
  try {
    const prompt = `Clasificá este mensaje de un cliente comercial. SOLO JSON sin markdown:
{"type":"compra|consulta|reclamo|otro","urgency":"alta|media|baja","reply":"respuesta sugerida max 50 palabras"}

Mensaje: "${message}"`

    const text = await ask(prompt, 200)
    return parseJSON<{ type: string; urgency: string; reply: string }>(text)
  } catch {
    return { type: 'otro', urgency: 'baja', reply: '' }
  }
}
