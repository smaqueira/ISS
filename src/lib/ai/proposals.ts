import { ask, parseJSON } from './client'
import { getSetting } from '@/lib/settings'
import type { ClientType } from '@/lib/types'

interface Proposal {
  subject: string
  email: string
  whatsapp: string
}

export async function generateProposal(client: {
  name: string
  rubro: string
  type: ClientType
  city?: string
}): Promise<Proposal> {
  const [companyName, companyDesc] = await Promise.all([
    getSetting('COMPANY_NAME'),
    getSetting('COMPANY_DESCRIPTION'),
  ])

  const vendedor = companyName || 'nuestro equipo comercial'
  const descripcion = companyDesc || 'productos y servicios de calidad'
  const tipo = client.type === 'b2b' ? 'empresa/negocio' : 'particular'

  const prompt = `Sos un vendedor comercial en Argentina. Primer contacto con un potencial cliente. SOLO JSON sin markdown:
{"subject":"asunto email","email":"cuerpo email max 100 palabras directo y cercano","whatsapp":"mensaje wa max 60 palabras, respetuoso y profesional"}

Quién escribe: ${vendedor}
Qué ofrecemos: ${descripcion}
Cliente: ${client.name} | Rubro: ${client.rubro} | Tipo: ${tipo} | Ciudad: ${client.city || 'Argentina'}

El mensaje de whatsapp debe mencionar lo que ofrecemos y por qué le puede interesar a este cliente según su rubro.`

  const text = await ask(prompt, 400)
  return parseJSON<Proposal>(text)
}
