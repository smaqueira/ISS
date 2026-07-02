import { ask, parseJSON } from './client'
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
  const tipo = client.type === 'b2b' ? 'empresa/negocio' : 'particular'
  const prompt = `Sos un vendedor comercial en Argentina. Primer contacto con un potencial cliente. SOLO JSON sin markdown:
{"subject":"asunto email","email":"cuerpo email max 100 palabras directo y cercano","whatsapp":"mensaje wa max 60 palabras"}

Cliente: ${client.name} | Rubro: ${client.rubro} | Tipo: ${tipo} | Ciudad: ${client.city || 'Argentina'}`

  const text = await ask(prompt, 400)
  return parseJSON<Proposal>(text)
}
