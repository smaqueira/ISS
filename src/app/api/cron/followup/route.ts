import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/telegram/send'

export const runtime = 'nodejs'
export const maxDuration = 30

const FOLLOWUP_RULES = [
  { status: 'nuevo',      dias: 2,  prioridad: 'media',   accion: 'primer contacto' },
  { status: 'contactado', dias: 4,  prioridad: 'alta',    accion: 'seguimiento' },
  { status: 'interesado', dias: 3,  prioridad: 'urgente', accion: 'cerrar' },
]

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await createClient()
  const now = new Date()

  const { data: clients } = await db
    .from('clients')
    .select('*')
    .in('status', ['nuevo', 'contactado', 'interesado'])
    .not('phone', 'is', null)

  if (!clients?.length) return NextResponse.json({ ok: true, alertas: 0 })

  const pendientes = clients.filter(c => {
    const rule = FOLLOWUP_RULES.find(r => r.status === c.status)
    if (!rule) return false
    const dias = Math.floor((now.getTime() - new Date(c.updated_at || c.created_at).getTime()) / 86400000)
    return dias >= rule.dias
  })

  if (!pendientes.length) return NextResponse.json({ ok: true, alertas: 0 })

  const urgentes = pendientes.filter(c => c.status === 'interesado')
  const altos    = pendientes.filter(c => c.status === 'contactado')
  const medios   = pendientes.filter(c => c.status === 'nuevo')

  let msg = `🔔 *Seguimiento de prospectos* — ${now.toLocaleDateString('es-AR')}\n\n`

  if (urgentes.length) {
    msg += `🔴 *URGENTE — Interesados sin cerrar (${urgentes.length})*\n`
    urgentes.slice(0, 3).forEach(c => {
      const dias = Math.floor((now.getTime() - new Date(c.updated_at || c.created_at).getTime()) / 86400000)
      msg += `• ${c.name}${c.rubro ? ` (${c.rubro})` : ''} — ${dias} días\n`
      if (c.phone) msg += `  📱 wa.me/${c.phone.replace(/\D/g, '')}\n`
    })
    msg += '\n'
  }

  if (altos.length) {
    msg += `🟡 *Seguimiento pendiente (${altos.length})*\n`
    altos.slice(0, 3).forEach(c => {
      const dias = Math.floor((now.getTime() - new Date(c.updated_at || c.created_at).getTime()) / 86400000)
      msg += `• ${c.name}${c.rubro ? ` (${c.rubro})` : ''} — ${dias} días\n`
    })
    msg += '\n'
  }

  if (medios.length) {
    msg += `⚪ *Primer contacto pendiente: ${medios.length} prospectos nuevos*\n`
  }

  msg += `\n👉 app.vittomare.com/admin/clients?status=seguimiento`

  await sendMessage(msg)

  return NextResponse.json({ ok: true, alertas: pendientes.length })
}
