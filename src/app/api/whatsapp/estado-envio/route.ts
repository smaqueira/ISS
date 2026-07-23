import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Inicio del día en horario de Argentina (UTC-3, sin DST), en ISO UTC.
function inicioDiaAR(): string {
  const ar = new Date(Date.now() - 3 * 3600 * 1000)
  const y = ar.getUTCFullYear(), m = ar.getUTCMonth(), d = ar.getUTCDate()
  // 00:00 AR = 03:00 UTC
  return new Date(Date.UTC(y, m, d, 3, 0, 0)).toISOString()
}

export async function GET() {
  const db = await createClient()
  const desdeDia = inicioDiaAR()
  const haceUnaHora = new Date(Date.now() - 3600 * 1000).toISOString()

  // Todos los "WhatsApp enviado" desde el inicio del día (AR)
  const { data } = await db
    .from('client_history')
    .select('fecha')
    .eq('accion', 'WhatsApp enviado')
    .gte('fecha', desdeDia)
    .order('fecha', { ascending: false })

  const rows = (data || []) as { fecha: string }[]
  const hoy = rows.length
  const ultimaHora = rows.filter(r => r.fecha >= haceUnaHora).length
  const ultimoEnvio = rows[0]?.fecha ?? null

  return NextResponse.json({ hoy, ultimaHora, ultimoEnvio })
}
