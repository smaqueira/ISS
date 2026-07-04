import { NextRequest, NextResponse } from 'next/server'
import { freshClient, saveSession } from '@/lib/telegram-client'
import { createClient } from '@/lib/supabase/server'
import { Api } from 'telegram'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'code requerido' }, { status: 400 })

  const db = await createClient()
  const [hashRow, phoneRow, sessionRow] = await Promise.all([
    db.from('settings').select('value').eq('key', 'TELEGRAM_PHONE_HASH').single(),
    db.from('settings').select('value').eq('key', 'TELEGRAM_PHONE').single(),
    db.from('settings').select('value').eq('key', 'TELEGRAM_PARTIAL_SESSION').single(),
  ])
  const phoneCodeHash = hashRow.data?.value
  const phone = phoneRow.data?.value
  const partialSession = sessionRow.data?.value || ''
  if (!phoneCodeHash || !phone) return NextResponse.json({ error: 'Primero enviá el código' }, { status: 400 })

  try {
    // Reusamos la sesión parcial para mantener el mismo DC que usó sendCode
    const client = await freshClient(partialSession)
    await client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code }))
    await saveSession(client)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
