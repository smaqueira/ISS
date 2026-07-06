import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const update = await req.json()
  const msg = update.message
  if (!msg?.text) return NextResponse.json({ ok: true })

  const text = msg.text.trim()

  // Formato ImprovMX: "📩 Nuevo mail en Vitto Mare\n\nDe: Nombre(email@x.com)\nAsunto: ...\ncuerpo"
  const fromMatch = text.match(/De:\s*([^(\n]*)\(([\w.+%-]+@[\w.-]+\.[a-z]{2,})\)/i)
  const subjectMatch = text.match(/Asunto:\s*([^\n]+)/i)

  if (!fromMatch) return NextResponse.json({ ok: true })

  const rawFrom = fromMatch[1].trim()
  const fromEmail = fromMatch[2].toLowerCase()
  const subject = subjectMatch?.[1]?.trim() || '(sin asunto)'
  const asuntoIdx = text.indexOf('Asunto:')
  const afterAsunto = asuntoIdx > -1 ? text.slice(asuntoIdx) : ''
  const bodyStart = afterAsunto.indexOf('\n')
  const body = bodyStart > -1 ? afterAsunto.slice(bodyStart).trim() : ''

  const db = getDb()

  const { data: client } = await db
    .from('clients')
    .select('id, name')
    .eq('email', fromEmail)
    .single()

  const notes = `📧 ${subject}${body ? '\n\n' + body.slice(0, 500) : ''}`

  if (client) {
    await db.from('interactions').insert({
      client_id: client.id,
      channel: 'email',
      type: 'mensaje',
      notes,
      ai_generated: false,
    })
    await db.from('clients').update({
      last_contact: new Date().toISOString(),
      status: 'contactado',
    }).eq('id', client.id)
  } else {
    const { data: newClient } = await db.from('clients').insert({
      name: rawFrom || fromEmail,
      email: fromEmail,
      type: 'b2c',
      status: 'nuevo',
      score: 60,
      channel: 'email',
    }).select('id').single()

    if (newClient) {
      await db.from('interactions').insert({
        client_id: newClient.id,
        channel: 'email',
        type: 'mensaje',
        notes,
        ai_generated: false,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
