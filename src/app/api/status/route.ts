import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 20

interface ServiceStatus {
  name: string
  ok: boolean
  latency?: number
  detail?: string
}

async function check(name: string, fn: () => Promise<string | void>): Promise<ServiceStatus> {
  const t = Date.now()
  try {
    const detail = await fn()
    return { name, ok: true, latency: Date.now() - t, detail: detail || undefined }
  } catch (e) {
    return { name, ok: false, latency: Date.now() - t, detail: String(e).slice(0, 120) }
  }
}

export async function GET() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Leer settings una vez
  const { data: settings } = await db.from('settings').select('key, value')
  const s = Object.fromEntries((settings || []).map((r: { key: string; value: string }) => [r.key, r.value]))

  const results = await Promise.all([

    check('Supabase', async () => {
      const { error } = await db.from('clients').select('id', { head: true, count: 'exact' })
      if (error) throw error.message
      return 'DB conectada'
    }),

    check('Groq IA', async () => {
      const key = s.GROQ_API_KEY_1 || s.GROQ_API_KEY_2
      if (!key) throw 'API Key no configurada'
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw `HTTP ${res.status}`
      return 'API disponible'
    }),

    check('Resend (email)', async () => {
      const key = s.RESEND_API_KEY
      if (!key) throw 'API Key no configurada'
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw `HTTP ${res.status}`
      return 'Dominio verificado'
    }),

    check('Telegram Bot', async () => {
      const token = s.TELEGRAM_BOT_TOKEN
      if (!token) throw 'Token no configurado'
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
      const json = await res.json()
      if (!json.ok) throw json.description || 'Error'
      return `@${json.result.username}`
    }),

    check('BlueMarket', async () => {
      const url = process.env.BLUEMARKET_SUPABASE_URL
      const key = process.env.BLUEMARKET_SUPABASE_ANON_KEY
      if (!url || !key) throw 'Variables de entorno no configuradas'
      const res = await fetch(`${url}/rest/v1/pescaderias?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw `HTTP ${res.status}`
      return 'Catálogo accesible'
    }),

    check('Gmail IMAP', async () => {
      const user = s.GMAIL_USER
      const pass = s.GMAIL_APP_PASSWORD
      if (!user || !pass) throw 'Gmail no configurado en Settings'
      // Solo verificamos que las credenciales existan; IMAP real requiere conexión TCP
      return `${user} configurado`
    }),

    check('Instagram', async () => {
      const token = s.INSTAGRAM_ACCESS_TOKEN
      if (!token) throw 'Token no configurado'
      const res = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${token}`)
      const json = await res.json()
      if (json.error) throw json.error.message
      return json.name || 'Cuenta conectada'
    }),

  ])

  const allOk = results.every(r => r.ok)
  return NextResponse.json({ ok: allOk, services: results, ts: new Date().toISOString() })
}
