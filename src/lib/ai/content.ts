import { ask, parseJSON } from './client'
import { getSeason, getDayName } from '@/lib/utils'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TEMAS = ['presentación del producto estrella', 'testimonio o caso de éxito', 'tip o consejo útil del rubro', 'oferta o promoción', 'detrás de escena del negocio', 'producto nuevo o destacado', 'contenido de valor educativo']

export async function generateWeeklyCalendar(products: string[]): Promise<{ day: string; theme: string; idea: string; caption: string; hashtags: string[] }[]> {
  const prompt = `Sos community manager experto en Argentina. Creá un calendario de contenido para Instagram de 7 días.
SOLO JSON sin markdown, array de 7 objetos:
[{"day":"Lunes","theme":"tema","idea":"qué mostrar","caption":"texto max 60 palabras con emojis","hashtags":["5 hashtags"]}]

Productos/servicios: ${products.join(', ')} | Temporada: ${getSeason()}
Temas sugeridos por día: ${DIAS.map((d, i) => `${d}: ${TEMAS[i]}`).join(', ')}`

  const text = await ask(prompt, 1500)
  return parseJSON(text)
}

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
