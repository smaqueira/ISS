import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'
import { sendMessage } from '@/lib/telegram/send'

export const runtime = 'nodejs'
export const maxDuration = 30

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getSetting(key: string): Promise<string | null> {
  const db = getDb()
  const { data } = await db.from('settings').select('value').eq('key', key).single()
  return data?.value || null
}

export async function POST() {
  const gmailUser = await getSetting('GMAIL_USER')
  const gmailPass = await getSetting('GMAIL_APP_PASSWORD')

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Gmail no configurado en Settings' }, { status: 400 })
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
    logger: false,
  })

  let saved = 0

  try {
    await client.connect()
    await client.mailboxOpen('INBOX')

    const db = getDb()

    // Buscar emails no leídos
    for await (const msg of client.fetch('1:*', { envelope: true, bodyStructure: true, source: true }, { uid: true })) {
      if (msg.flags?.has('\\Seen')) continue

      const from = msg.envelope?.from?.[0]
      if (!from) continue

      const fromEmail = (from.address || '').toLowerCase()
      const fromName = from.name || fromEmail
      const subject = msg.envelope?.subject || '(sin asunto)'

      // Ignorar noreply y sistemas
      if (/noreply|no-reply|mailer-daemon|postmaster|improvmx|zapier/i.test(fromEmail)) {
        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'])
        continue
      }

      // Extraer texto del body
      let body = ''
      if (msg.source) {
        const raw = msg.source.toString()
        // Extraer texto plano del raw email
        const textMatch = raw.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(\r\n--|\r\n\r\n--)/i)
        if (textMatch) body = textMatch[1].replace(/=\r\n/g, '').trim()
        if (!body) {
          // Fallback: tomar líneas después de los headers
          const parts = raw.split('\r\n\r\n')
          if (parts.length > 1) body = parts.slice(1).join('\n').slice(0, 500).trim()
        }
      }

      // Buscar o crear cliente
      let clientId: string
      const { data: existing } = await db.from('clients').select('id').eq('email', fromEmail).single()

      if (existing) {
        clientId = existing.id
        await db.from('clients').update({ last_contact: new Date().toISOString(), status: 'contactado' }).eq('id', clientId)
      } else {
        const { data: newClient } = await db.from('clients').insert({
          name: fromName, email: fromEmail, type: 'b2c', status: 'nuevo', score: 60, channel: 'email',
        }).select('id').single()
        if (!newClient) continue
        clientId = newClient.id
      }

      // Guardar interacción
      const notes = `📧 ${subject}${body ? '\n\n' + body.slice(0, 500) : ''}`
      await db.from('interactions').insert({
        client_id: clientId, channel: 'email', type: 'mensaje', notes, ai_generated: false,
      })

      // Notificar Telegram
      await sendMessage(`📩 *Nuevo mail*\n\nDe: ${fromName} (${fromEmail})\nAsunto: ${subject}`)

      // Marcar como leído en Gmail
      await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'])
      saved++
    }

    await client.logout()
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved })
}
