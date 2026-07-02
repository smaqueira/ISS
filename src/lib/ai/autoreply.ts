import { ask } from './client'

export async function generateAutoReply(params: {
  client_name: string
  message: string
  type: string
  urgency: string
}): Promise<string> {
  const prompt = `Sos el asistente de ventas de una empresa. Respondé este mensaje de cliente de forma breve, amigable y profesional. Máximo 80 palabras. Solo el texto, sin comillas.

Cliente: ${params.client_name}
Tipo: ${params.type}
Urgencia: ${params.urgency}
Mensaje: "${params.message}"`

  return ask(prompt, 200)
}
