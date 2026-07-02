import { ask, parseJSON } from './client'
import { getSeason, getDayName } from '@/lib/utils'

interface InstagramContent {
  idea: string
  caption: string
  hashtags: string[]
}

export async function generateInstagramPost(products: string[]): Promise<InstagramContent> {
  const prompt = `Community manager de negocio premium en Argentina. SOLO JSON sin markdown:
{"idea":"qué mostrar en la foto/video","caption":"texto del post max 80 palabras con emojis","hashtags":["max 8 hashtags"]}

Productos/servicios: ${products.join(', ')} | Día: ${getDayName()} | Temporada: ${getSeason()}`

  const text = await ask(prompt, 400)
  return parseJSON<InstagramContent>(text)
}

export async function generateBroadcast(params: {
  products: string[]
  type: 'viernes' | 'quincena' | 'reactivar'
  client_name?: string
}): Promise<string> {
  const contexts = {
    viernes: 'Es viernes, ofrecer productos/servicios del fin de semana',
    quincena: 'Es quincena, ofrecer combo especial',
    reactivar: `Cliente que no compra hace días. Nombre: ${params.client_name || 'cliente'}`,
  }

  const prompt = `Mensaje WhatsApp broadcast comercial en Argentina. Cercano, sin presión. Max 50 palabras. Solo el texto, sin comillas.

Contexto: ${contexts[params.type]}
Productos/servicios disponibles: ${params.products.join(', ')}`

  return ask(prompt, 150)
}
