import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/telegram/send'

export const runtime = 'nodejs'
export const maxDuration = 30

const FOLLOWUP_RULES: Record<string, { dias: number; emoji: string; label: string }> = {
  prospecto:           { dias: 2,  emoji: '⚪', label: 'Primer contacto pendiente' },
  nuevo:               { dias: 2,  emoji: '⚪', label: 'Primer contacto pendiente' }, // legacy
  contactado:          { dias: 4,  emoji: '🟡', label: 'Seguimiento pendiente' },
  sin_respuesta:       { dias: 3,  emoji: '🟡', label: 'Sin respuesta' },
  respondio:           { dias: 2,  emoji: '🟡', label: 'Avanzar con interesado' },
  interesado:          { dias: 3,  emoji: '🔴', label: 'URGENTE — Interesado sin cerrar' },
  negociacion:         { dias: 2,  emoji: '🔴', label: 'URGENTE — En negociación' },
  presupuesto_enviado: { dias: 3,  emoji: '🔴', label: 'URGENTE — Presupuesto sin respuesta' },
  esperando_respuesta: { dias: 4,  emoji: '🟡', label: 'Esperando respuesta' },
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await createClient()
  const now = new Date()

  const { data: clients } = await db
    .from('clients')
    .select('id, name, rubro, city, phone, status, score, last_contact, next_followup, created_at')
    .in('status', Object.keys(FOLLOWUP_RULES))
    .not('phone', 'is', null)

  if (!clients?.length) return NextResponse.json({ ok: true, alertas: 0 })

  // Agrupar por emoji/prioridad los que superaron su umbral de días
  const grupos: Record<string, typeof clients> = { '🔴': [], '🟡': [], '⚪': [] }

  for (const c of clients) {
    const rule = FOLLOWUP_RULES[c.status]
    if (!rule) continue
    // Usar next_followup si existe y está vencido; sino calcular por last_contact
    let vencido = false
    if (c.next_followup) {
      vencido = new Date(c.next_followup) <= now
    } else {
      const dias = Math.floor((now.getTime() - new Date(c.last_contact || c.created_at).getTime()) / 86400000)
      vencido = dias >= rule.dias
    }
    if (vencido) grupos[rule.emoji].push(c)
  }

  const total = Object.values(grupos).reduce((s, g) => s + g.length, 0)
  if (!total) return NextResponse.json({ ok: true, alertas: 0 })

  let msg = `🔔 *Seguimiento CRM* — ${now.toLocaleDateString('es-AR')}\n\n`

  for (const [emoji, grupo] of Object.entries(grupos)) {
    if (!grupo.length) continue
    const label = emoji === '🔴' ? 'URGENTE' : emoji === '🟡' ? 'Seguimiento' : 'Nuevos prospectos'
    msg += `${emoji} *${label} (${grupo.length})*\n`
    grupo.slice(0, 5).forEach(c => {
      const dias = Math.floor((now.getTime() - new Date(c.last_contact || c.created_at).getTime()) / 86400000)
      msg += `• ${c.name}${c.rubro ? ` · ${c.rubro}` : ''}${c.city ? ` · ${c.city}` : ''} — ${dias}d\n`
      if (c.phone) msg += `  📱 wa.me/${c.phone.replace(/\D/g, '')}\n`
    })
    if (grupo.length > 5) msg += `  _...y ${grupo.length - 5} más_\n`
    msg += '\n'
  }

  msg += `👉 [Ver en CRM](https://intelligent-sales-system.vercel.app/admin/clients?vencidos=1)`

  await sendMessage(msg)

  return NextResponse.json({ ok: true, alertas: total })
}
