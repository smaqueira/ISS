import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getToken(): Promise<string> {
  const db = getDb()
  const { data } = await db.from('settings').select('value').eq('key', 'TELEGRAM_CUSTOMER_BOT_TOKEN').single()
  return data?.value || ''
}

async function getWhatsApp(): Promise<string> {
  const db = getDb()
  const { data } = await db.from('settings').select('value').eq('key', 'COMPANY_WHATSAPP').single()
  return data?.value || ''
}

async function sendMessage(token: string, chatId: string, text: string, buttons?: { text: string; url?: string; callback_data?: string }[][]) {
  const payload: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'Markdown' }
  if (buttons) payload.reply_markup = { inline_keyboard: buttons }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

async function getProducts() {
  const db = getDb()
  const { data: settings } = await db.from('settings').select('value').eq('key', 'BLUEMARKET_TIENDA_SLUG').single()
  const slug = settings?.value || 'vitto-mare'

  const bmUrl = process.env.BLUEMARKET_SUPABASE_URL
  const bmKey = process.env.BLUEMARKET_SUPABASE_ANON_KEY
  if (!bmUrl || !bmKey) return []

  // Buscar tienda
  const tRes = await fetch(`${bmUrl}/rest/v1/pescaderias?slug=eq.${slug}&activa=eq.true&select=id`, {
    headers: { apikey: bmKey, Authorization: `Bearer ${bmKey}` },
  })
  const tiendas = await tRes.json()
  const tiendaId = tiendas?.[0]?.id
  if (!tiendaId) return []

  const pRes = await fetch(`${bmUrl}/rest/v1/productos?pescaderia_id=eq.${tiendaId}&disponible=eq.true&select=nombre,precio,unidad,categoria`, {
    headers: { apikey: bmKey, Authorization: `Bearer ${bmKey}` },
  })
  return await pRes.json()
}

async function respondWithAI(token: string, chatId: string, userMessage: string) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    await sendMessage(token, chatId, 'Por favor escribinos por WhatsApp para más información. 🐟')
    return
  }

  const products = await getProducts()
  const productList = products.map((p: { nombre: string; precio: number; unidad: string; categoria: string }) =>
    `- ${p.nombre}${p.precio ? ` — $${p.precio}` : ' — Consultar precio'}${p.unidad ? ` (${p.unidad})` : ''}`
  ).join('\n')

  const whatsapp = await getWhatsApp()
  const waLink = whatsapp ? `https://wa.me/${whatsapp}` : null

  const groq = new Groq({ apiKey: groqKey })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `Sos el asistente virtual de Vitto Mare, una pescadería premium. Respondé en español, de forma amable y concisa (máximo 3 párrafos).

Catálogo actual con stock:
${productList || 'Consultanos por WhatsApp para ver disponibilidad.'}

Para hacer pedidos o consultas específicas, derivá a WhatsApp${waLink ? `: ${waLink}` : ''}.
No inventés precios ni productos que no estén en el catálogo.`,
      },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 300,
  })

  const reply = completion.choices[0]?.message?.content || 'Gracias por escribirnos. Para más información contactanos por WhatsApp.'

  const buttons = waLink ? [[{ text: '💬 Escribir por WhatsApp', url: waLink }]] : undefined
  await sendMessage(token, chatId, reply, buttons)
}

async function saveInteraction(fromName: string, fromUsername: string, message: string) {
  const db = getDb()
  const identifier = fromUsername ? `@${fromUsername}` : fromName

  let { data: client } = await db.from('clients').select('id').eq('instagram', identifier).single()

  if (!client) {
    const { data: newClient } = await db.from('clients').insert({
      name: fromName || identifier,
      instagram: fromUsername ? `@${fromUsername}` : null,
      type: 'b2c',
      status: 'nuevo',
      score: 50,
      channel: 'telegram',
    }).select('id').single()
    client = newClient
  }

  if (client) {
    await db.from('interactions').insert({
      client_id: client.id,
      channel: 'telegram',
      type: 'consulta',
      notes: message.slice(0, 1000),
      ai_generated: false,
    })
    await db.from('clients').update({ last_contact: new Date().toISOString() }).eq('id', client.id)
  }
}

export async function POST(req: NextRequest) {
  const update = await req.json()
  const msg = update.message
  if (!msg?.text) return NextResponse.json({ ok: true })

  const text = msg.text.trim()
  const chatId = String(msg.chat.id)
  const fromName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'Cliente'
  const fromUsername = msg.from?.username || ''

  const token = await getToken()
  if (!token) return NextResponse.json({ ok: true })

  const textLower = text.toLowerCase()
  const isGreeting = ['hola', 'hi', 'hello', '/start', 'buenas', 'buen dia', 'buenos dias'].some(s => textLower.startsWith(s))

  if (isGreeting) {
    const whatsapp = await getWhatsApp()
    const waLink = whatsapp ? `https://wa.me/${whatsapp}` : null
    const buttons = waLink ? [[{ text: '💬 Hacer un pedido por WhatsApp', url: waLink }]] : undefined
    await sendMessage(
      token, chatId,
      `¡Hola ${fromName}! 👋 Bienvenido a *Vitto Mare* 🐟\n\nSoy el asistente virtual. Podés preguntarme sobre nuestros productos, precios y disponibilidad.\n\n¿En qué te puedo ayudar?`,
      buttons
    )
    return NextResponse.json({ ok: true })
  }

  // Guardar interacción en el inbox
  await saveInteraction(fromName, fromUsername, text)

  // Responder con IA
  await respondWithAI(token, chatId, text)

  return NextResponse.json({ ok: true })
}
