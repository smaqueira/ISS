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

function resumir(rows: { fecha: string }[], haceUnaHora: string) {
  return {
    hoy: rows.length,
    ultimaHora: rows.filter(r => r.fecha >= haceUnaHora).length,
    ultimoEnvio: rows[0]?.fecha ?? null,
  }
}

export async function GET() {
  const db = await createClient()
  const desdeDia = inicioDiaAR()
  const haceUnaHora = new Date(Date.now() - 3600 * 1000).toISOString()

  // Acciones de WhatsApp/Instagram desde el inicio del día (AR)
  const { data } = await db
    .from('client_history')
    .select('accion, fecha')
    .in('accion', ['WhatsApp enviado', 'Instagram enviado', 'Instagram seguido'])
    .gte('fecha', desdeDia)
    .order('fecha', { ascending: false })

  const rows = (data || []) as { accion: string; fecha: string }[]
  const wa = rows.filter(r => r.accion === 'WhatsApp enviado')
  const ig = rows.filter(r => r.accion === 'Instagram enviado')
  const seg = rows.filter(r => r.accion === 'Instagram seguido')

  return NextResponse.json({
    whatsapp: resumir(wa, haceUnaHora),
    instagram: resumir(ig, haceUnaHora),
    seguidos: resumir(seg, haceUnaHora),
  })
}
