import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Vercel cron invoca esta ruta todos los días a las 8am (Argentina = UTC-3 → 11 UTC)
export async function GET(req: Request) {
  const authHeader = req.headers ? (req as unknown as { headers: { get: (k: string) => string | null } }).headers.get('authorization') : null
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.vittomare.com'

  const res = await fetch(`${appUrl}/api/telegram/bot/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  const data = await res.json()
  return NextResponse.json({ cron: 'morning-broadcast', ...data })
}
