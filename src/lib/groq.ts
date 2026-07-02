import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MODEL = 'llama-3.3-70b-versatile'

export async function classifyLead(data: {
  name: string
  rubro?: string
  description?: string
  instagram?: string
  website?: string
}): Promise<{ type: 'b2b' | 'b2c'; score: number; reason: string; suggested_channel: string }> {
  const prompt = `Sos un experto en ventas de pescados y mariscos en Argentina.
Analizá este potencial cliente y respondé SOLO con un JSON válido, sin markdown:

Negocio: ${data.name}
Rubro: ${data.rubro || 'desconocido'}
Descripción: ${data.description || 'sin descripción'}
Instagram: ${data.instagram || 'no tiene'}
Web: ${data.website || 'no tiene'}

Respondé con este JSON exacto:
{
  "type": "b2b" o "b2c",
  "score": número del 0 al 100 (probabilidad de compra),
  "reason": "explicación breve en español",
  "suggested_channel": "whatsapp" o "email" o "telefono"
}`

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
  })

  const content = response.choices[0].message.content || '{}'
  return JSON.parse(content)
}

export async function generateProposal(client: {
  name: string
  rubro: string
  type: 'b2b' | 'b2c'
  city?: string
}): Promise<{ subject: string; body: string; whatsapp_message: string }> {
  const prompt = `Sos un vendedor de pescados y mariscos frescos en Argentina.
Escribí un primer contacto comercial para este cliente. Tono: directo, cercano, profesional.
NO uses emojis en exceso. SÉ BREVE. Respondé SOLO con JSON válido, sin markdown:

Cliente: ${client.name}
Rubro: ${client.rubro}
Tipo: ${client.type === 'b2b' ? 'Mayorista (empresa)' : 'Minorista (particular)'}
Ciudad: ${client.city || 'Argentina'}

JSON exacto:
{
  "subject": "asunto del email",
  "body": "cuerpo del email (máx 150 palabras)",
  "whatsapp_message": "mensaje de WhatsApp (máx 80 palabras)"
}`

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  })

  const content = response.choices[0].message.content || '{}'
  return JSON.parse(content)
}

export async function classifyMessage(message: string): Promise<{
  classification: 'compra' | 'consulta' | 'reclamo' | 'otro'
  suggested_response: string
  urgency: 'alta' | 'media' | 'baja'
}> {
  const prompt = `Analizá este mensaje de un cliente de pescadería y respondé SOLO con JSON válido, sin markdown:

Mensaje: "${message}"

JSON exacto:
{
  "classification": "compra" o "consulta" o "reclamo" o "otro",
  "urgency": "alta" o "media" o "baja",
  "suggested_response": "respuesta sugerida en español, máx 60 palabras, tono amigable"
}`

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 300,
  })

  const content = response.choices[0].message.content || '{}'
  return JSON.parse(content)
}

export async function generateInstagramContent(params: {
  products: string[]
  season: string
  day_of_week: string
  type: 'post' | 'story' | 'reel'
}): Promise<{ caption: string; hashtags: string[]; idea: string }> {
  const prompt = `Sos community manager de una pescadería premium en Argentina.
Creá contenido para Instagram. Respondé SOLO con JSON válido, sin markdown:

Productos disponibles: ${params.products.join(', ')}
Temporada: ${params.season}
Día: ${params.day_of_week}
Formato: ${params.type}

JSON exacto:
{
  "idea": "descripción visual del contenido (qué mostrar)",
  "caption": "texto del post (máx 100 palabras, con emojis, tono fresco y apetitoso)",
  "hashtags": ["hashtag1", "hashtag2"] (máx 10 hashtags relevantes)
}`

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 400,
  })

  const content = response.choices[0].message.content || '{}'
  return JSON.parse(content)
}

export async function generateFollowUp(params: {
  client_name: string
  rubro: string
  days_since_contact: number
  last_interaction: string
  type: 'b2b' | 'b2c'
}): Promise<{ subject: string; body: string; whatsapp_message: string }> {
  const prompt = `Generá un mensaje de seguimiento comercial para una pescadería.
Tono: amigable, sin presión. Respondé SOLO con JSON válido, sin markdown:

Cliente: ${params.client_name}
Rubro: ${params.rubro}
Días sin respuesta: ${params.days_since_contact}
Último contacto: ${params.last_interaction}
Tipo: ${params.type === 'b2b' ? 'empresa' : 'particular'}

JSON exacto:
{
  "subject": "asunto email de seguimiento",
  "body": "cuerpo del email (máx 80 palabras)",
  "whatsapp_message": "mensaje WhatsApp (máx 50 palabras)"
}`

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 400,
  })

  const content = response.choices[0].message.content || '{}'
  return JSON.parse(content)
}
